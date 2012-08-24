
var fs        = require('fs')
,   path      = require('path')
,   zlib      = require('zlib')
,   mime      = require('mime')
,   Suckle    = require('suckle')
,   expire    = require('expire');

function Lactate(options) { 
    this.opts = {
          cache:     {}
        , expires:   0
        , root:      process.cwd()
        , public:    ''
        , debug:     false
        , subdirs:   true
        , notFound:  false
    }

    if (options) {
        this.set(options)
    }
}

Lactate.prototype = {

    watch:function(fp) {
        fs.watch(fp, function(ev) {
            if (ev === 'change') {
                this.opts.cache[fp] = null
            }
        }.bind(this));
    },

    serve:function(fp, req, res, status) {

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
            mtime = cachedFile.rObj['Last-Modified'];
        }else {
            try {
                var stat = fs.statSync(filePath)
                if (!stat.isFile()) {
                    return self._404(res)
                }
                mtime = stat.mtime.toUTCString();
                if (opts.cache) {
                    self.watch(filePath);
                }
            }catch(exception) {
                return self._404(res)
            }
        }

        var ims = req ? req.headers['if-modified-since'] : null;
        if (opts.expires && ims === mtime) {
            return this._304(res)
        }else if (cachedFile) {
            if (!status || status === 200) {
                self._200('Cached', res, cachedFile.rObj, cachedFile.data);
            }else {
               res.writeHead(status, cachedFile.rObj)
               res.end(cachedFile.data)
            }
        }else {
            this.complete(filePath, mtime, res, status)
        };
    },

    complete:function(filePath, mtime, res, status) {
        var mimeType = mime.lookup(filePath)
        var rObj = { 
            'Content-Type':      mimeType,
            'Content-Encoding':  'gzip',
            'Last-Modified':     mtime
        }

        var expires = this.opts.expires
        if (expires) {
            expire.setExpiration(rObj, expires)
        }

        return this.send(filePath, rObj, res, status)
   },

    send:function(path, rObj, res, _404) {
        var self = this
        var mux = new Suckle(function(data) {
            if (self.opts.cache) {
                rObj['Content-Length'] = data.length
                self.setCache(path, data, rObj)
            }
        })

        if (res) {
            mux.pipe(res);
        };

        var gz = zlib.createGzip()
        var rs = fs.createReadStream(path)

        rs.on('open', function(fd) {
            if (_404) {
                res.writeHead(404, rObj)
            }else if (res) {
                self._200('Read and served file', res, rObj)
            }
            rs.pipe(gz).pipe(mux);
        })

        rs.on('error', function(){
            res.writeHead(404)
            res.end()
        })
    },

    setCache:function(path, data, rObj) {
        var cache = this.opts.cache
        if (!cache) {
            return
        }

        cache[path] = {
            data:data,
            rObj:rObj
        }
    },

    getCache:function(path, fn) {
        return fn(null, this.opts.cache[path])
    },

    _200:function(msg, res, headers, data) {
        var status = 200
        res.writeHead(status, headers)
        if (data) res.end(data)
    },

    _304:function(res) {
        var status = 304
        res.writeHead(status)
        res.end()
    }, 

    _404:function(res) {
        var status  = 404
        var handler = this.opts.notFound;

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
    },

    set:function(k, v) {
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
    },

    get:function(k) {
        return this.opts[k]
    }
}

function file(path, req, res, options) {
    var lactate = new Lactate(options)
    return lactate.serve(path, req, res)
}

function dir(directory, options) {
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

module.exports.Lactate = function(options) {
    return new Lactate(options)
}

module.exports.file = file
module.exports.dir = dir
