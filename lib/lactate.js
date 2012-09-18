
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
        , pub:       ''
        , debug:     false
        , subdirs:   true
        , notFound:  false
        , cache:     {}
        , expires:   86400 * 2
        , headers:   {}
    }

    if (options) this.set(options);
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
            }
            var subdir = dirname.substring(0, pubLength)
            if (subdir !== public) {
                return self._404(res)
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
    var cache = this.opts.cache;
    if (!cache) return;

    fs.watch(filePath, function(ev) {
        if (ev === 'change') {
            cache[filePath] = null;
        };
    });
};

Lactate.prototype.complete = function(filePath, mtime, res, status) {
    var mimeType = mime.lookup(filePath);
    var headers = { 
        'Content-Type':   mimeType,
        'Last-Modified':  mtime,
        'Cache-Control':  'no-cache'
    };

    var expires = this.opts.expires;
    if (expires) {
        headers['Cache-Control'] = 'public, max-age=' + expires;
    };

    var optHeaders = this.opts.headers;
    var keys = Object.keys(optHeaders);
    if (keys.length) {
        keys.forEach(function(header) {
            headers[header] = optHeaders[header];
        });
    };

    return this.send(filePath, headers, res, status);
};

Lactate.prototype.send = function(filePath, headers, res, _404) {
    var mux = new Suckle(function(data) {
        if (this.opts.cache) {
            headers['Content-Length'] = data.length;
            this.setCache(filePath, data, headers);
        };
    }.bind(this));

    var open = function(fd) {
        if (_404) {
            res.writeHead(404, headers);
        }else {
            this._200('Read and served', res, headers, null, filePath);
        }
    }.bind(this);

    if (res) mux.pipe(res);

    var isText = /^(text|application)/.test(headers['Content-Type']);
    var rs = fs.createReadStream(filePath);

    rs.on('open', open);
    rs.on('error', this._404.bind(this, res, filePath));

    if (isText) {
        headers['Content-Encoding'] = 'gzip';
        rs.pipe(zlib.createGzip()).pipe(mux);
    }else {
        rs.pipe(mux);
    };
};

Lactate.prototype.setCache = function(filePath, data, headers) {
    var cache = this.opts.cache;
    if (!cache) return;
    cache[filePath] = {
        data:data,
        headers:headers
    };
};

Lactate.prototype.getCache = function(filePath, fn) {
    return fn(null, this.opts.cache[filePath]);
};

Lactate.prototype._200 = function(msg, res, headers, data, filePath) {
    var status = 200;
    res.writeHead(status, headers)
    if (data) res.end(data);
    this.debug(status, msg, filePath);
};

Lactate.prototype._304 = function(res, filePath) {
    var status = 304;
    res.writeHead(status);
    res.end();
    this.debug(status, 'Not modified', filePath);
};

Lactate.prototype._404 = function(res, filePath) {
    var status  = 404;
    var handler = this.opts.notFound;

    this.debug(status, 'Not found', filePath);

    if (!handler) {
        res.writeHead(status);
        return res.end();
    };

    var handlerType = typeof(handler);

    if (handlerType === 'function') {
        handler(res) ;
    }else if (handlerType === 'string') {
        this.serve(handler, null, res, status);
    };
};

Lactate.prototype.set = function(k, v) {
    if (typeof(k) === 'object') {
        for (var opt in k)
            this.set(opt, k[opt]);
        return;
    };

    var opts    = this.opts;
    var valType = typeof(v);

    if (!opts.hasOwnProperty(k)) return;

    if (k === 'expires' && valType === 'string') {
        v = expire.getSeconds(v);
    }else if (k === 'root' || k === 'public') {
        v = path.normalize(v);
    };

    opts[k] = v;
    opts.cache = opts.cache ? {} : false;
};

Lactate.prototype.get = function(k) {
    return this.opts[k];
};

Lactate.prototype.debug = function(status, msg, filePath) {
    if (this.opts.debug) {
        console.log(log[status](msg), filePath);
    };
};

module.exports.Lactate = function(options) {
    return new Lactate(options);
}

module.exports.file = function(path, req, res, options) {
    var lactate = new Lactate(options);
    return lactate.serve(path, req, res);
};

module.exports.dir = function(directory, options) {
    if (typeof directory === 'string') {
        options = options || {};
        options.root = directory;
    }else {
        options = directory || {};
        options.root = options.root || process.cwd();
    };

    var lactate = new Lactate(options);

    lactate.toMiddleware = function(opts) {
        if (opts) this.set(opts);

        var public  = this.get('public') || '';
        var publen  = public.length;
        var subdirs = this.get('subdirs');

        return function(req, res, next) {
            var url = req.url
            var basename = path.dirname(url).substring(1);

            if (basename === public
                || (subdirs && basename.substring(0, publen) === public)) {
                this.serve(req, res)
            }else if (next) {
                next()
            }else {
                this._404(res, url);
            }
        }.bind(this);
    };

    return lactate;
};

/**
 * Adaptors for node-static API
 */
module.exports.serveFile = module.exports.file;
module.exports.Server    = module.exports.dir;
