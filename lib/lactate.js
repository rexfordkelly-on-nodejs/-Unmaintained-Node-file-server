
var fs     = require('fs')
  , path   = require('path')
  , zlib   = require('zlib')
  , mime   = require('mime')
  , Suckle = require('suckle')
  , expire = require('expire')
  , log    = require('./logger').http;


function Lactate(options) { 
    this.opts = {
          root:      process.cwd()
        , public:    ''
        , debug:     false
        , subdirs:   true
        , notFound:  false
        , cache:     {}
        , expires:   0
    }

    if (options) {
        this.set(options)
    }
}

Lactate.prototype.serve = function(fp, req, res, status) {
    var opts     = this.opts
    , filePath = opts.root
    , public   = opts.public
    , self     = this
    , stat

    if (typeof(fp) === 'string') {
        filePath = path.join(filePath, fp)
    }else {
        res = req; req = fp
        var url       = req.url
        var dirname   = path.dirname(url).substring(1)
        var pubLength = public.length
        if (dirname !== public) {
            if (!opts.subdirs) {
                return self._404(res)
            }else {
                var subdir = dirname.substring(0, pubLength)
                if (subdir !== public) {
                    return self._404(res)
                }
            }
        }
        filePath = path.join(filePath, url.substring(pubLength+1))
    }

    var mtime, cachedFile = opts.cache 
        ? opts.cache[filePath] 
        : null;

    if (cachedFile) {
        mtime = cachedFile.headers['Last-Modified'];
    }else {
        try {
            var stat = fs.statSync(filePath)
            if (!stat.isFile()) {
                return self._404(res, filePath)
            }
            mtime = stat.mtime.toUTCString();
            if (opts.cache) {
                self.watch(filePath);
            }
        }catch(exception) {
            return self._404(res, filePath)
        }
    }

    var ims = req ? req.headers['if-modified-since'] : null;
    if (opts.expires && ims === mtime) {
        this._304(res, filePath)
    }else if (cachedFile) {
        if (!status || status === 200) {
            self._200('Cached', res, cachedFile.headers, cachedFile.data, filePath);
        }else {
            res.writeHead(status, cachedFile.headers)
            res.end(cachedFile.data)
        }
    }else {
        this.complete(filePath, mtime, res, status)
    };
};

Lactate.prototype.watch = function(filePath, ev) {
    fs.watch(filePath, function(ev) {
        if (ev === 'change') {
            this.opts.cache[fp] = null
        }
    }.bind(this));
};

Lactate.prototype.complete = function(filePath, mtime, res, status) {
    var mimeType = mime.lookup(filePath)
    var headers = { 
        'Content-Type':      mimeType,
        'Content-Encoding':  'gzip',
        'Last-Modified':     mtime
    }

    var expires = this.opts.expires
    if (expires) {
        expire.setExpiration(headers, expires)
    }

    return this.send(filePath, headers, res, status)
};

Lactate.prototype.send = function(filePath, headers, res, _404) {
    var self = this
    var mux = new Suckle(function(data) {
        if (self.opts.cache) {
            headers['Content-Length'] = data.length
            self.setCache(filePath, data, headers)
        }
    })

    if (res) {
        mux.pipe(res);
    };

    var gz = zlib.createGzip()
    var rs = fs.createReadStream(filePath)

    rs.on('open', function(fd) {
        if (_404) {
            res.writeHead(404, headers)
        }else if (res) {
            self._200('Read and served file', res, headers, null, filePath)
        }
        rs.pipe(gz).pipe(mux);
    })

    rs.on('error', this._404.bind(this, res, filePath));
};

Lactate.prototype.setCache = function(filePath, data, headers) {
    var cache = this.opts.cache
    if (!cache) { return }
    cache[filePath] = {
        data:data,
        headers:headers
    }
};

Lactate.prototype.getCache = function(filePath, fn) {
    return fn(null, this.opts.cache[filePath])
};

Lactate.prototype._200 = function(msg, res, headers, data, filePath) {
    var status = 200
    res.writeHead(status, headers)
    if (data) {
        res.end(data);
    }
    this.debug(log[status](msg), filePath);
};

Lactate.prototype._304 = function(res, filePath) {
    var status = 304
    res.writeHead(status)
    res.end()
    this.debug(log[status]('Not modified'), filePath);
};

Lactate.prototype._404 = function(res, filePath) {
    var status  = 404
    var handler = this.opts.notFound;

    this.debug(log[status]('Not found'), filePath);

    if (!handler) {
        res.writeHead(status)
        return res.end()
    }

    var handlerType = typeof(handler)

    if (handlerType === 'function') {
        handler(res) 
    }else if (handlerType === 'string') {
        this.serve(handler, null, res, status)
    }
};

Lactate.prototype.set = function(k, v) {
    if (typeof(k) === 'object') {
        for (var opt in k) {
            this.set(opt, k[opt])
        }
        return;
    }

    var opts    = this.opts
    var valType = typeof(v)

    if (!opts.hasOwnProperty(k)) {
        return
    }

    if (k === 'expires' && valType === 'string') {
        v = expire.getSeconds(v)
    }else if (k === 'root' || k === 'public') {
        v = path.normalize(v)
    }

    opts[k] = v
    opts.cache = opts.cache ? {} : false
};

Lactate.prototype.get = function(k) {
    return this.opts[k]
};

Lactate.prototype.debug = function() {
    var debug = this.opts.debug;
    if (debug) {
        var args = Array.prototype.slice.call(arguments);
        console.log.apply(this, args);
    };
};

module.exports.Lactate = function(options) {
    return new Lactate(options)
}

module.exports.file = function(path, req, res, options) {
    var lactate = new Lactate(options)
    return lactate.serve(path, req, res)
}

module.exports.dir = function(directory, options) {
    options = typeof(options) === 'object' ? options : {}
    options.root = directory

    var lactate = new Lactate(options)

    lactate.toMiddleware = function(self, opts) {
        if (opts) { self.set(opts) }
        var public = self.get('public') || '';
        return function(req, res, next) {
            var url = req.url
            var basename = path.dirname(url).substring(1)
            if (basename === public) {
                self.serve(path.basename(url), req, res)
            }else if (next) {
                next()
            }else {
                res.writeHead(404)
                res.end()
            }
        }
    }.bind(this, lactate)
    return lactate
}
