
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

    debug:function() {
        var dbg = this.opts.debug
        if (dbg) {
            console.log.apply(this, arguments);
        }
    },

    watch:function(fp) {
        var watcher = function(path, ev) {
            if (ev === 'change') {
                this.opts.cache[path] = null;
            }
        }.bind(this, fp);
        fs.watch(fp, watcher);
    },

    serve:function(fp, req, res) {
        var opts     = this.opts
          , filePath = opts.root
          , public   = opts.public
          , self     = this
          , stat

        if (typeof(fp) === 'string') {
            filePath = path.join(filePath, fp)
        }else {
            res = req
            req = fp

            var url       = req.url
              , dirname   = path.dirname(url).substring(1)
              , pubLength = public.length

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

        this.debug(0, 'Serving file', filePath)

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

        var ims = req.headers['if-modified-since'];
        if (opts.expires && ims === mtime) {
            return this._304(res)
        }else if (cachedFile) {
            return self._200('Cached', res, cachedFile.rObj, cachedFile.data);
        };

        this.complete(filePath, mtime, res)
    },

    complete:function(filePath, mtime, res) {
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
        return this.send(filePath, rObj, res)
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
          , rs = fs.createReadStream(path)


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
        if (!cache) return

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
        this.debug(1, msg, status)
    },

    _304:function(res) {
        var status = 304
        res.writeHead(status)
        res.end()
        this.debug(1, 'Client has file cached', status)
    }, 

    _404:function(res) {
        var self    = this
          , status  = 404
          , handler = this.opts.notFound;

        this.debug(1, 'Does not exist', status)

        if (!handler) {
            return def()
        }

        function def() {
            res.writeHead(404)
            res.end()
        }

        function complete() {
            var headers = { 
                'Content-Type':      'text/html',
                'Content-Encoding':  'gzip'
            }
            self.send(handler, headers, res, true)
        }

        var handlerType = typeof(handler)

        if (handlerType === 'function') {
            handler(res) 
        }else if (handlerType === 'string') {
            handler = path.join(this.opts.root, handler)
            try {
                var stat = fs.statSync(handler)
                if (!stat.isFile()) {
                    return def()
                }
            }catch(exception) {
                return def()
            }

            if (!this.opts.cache) {
                return complete()
            }

            this.getCache(handler, function(err, data) {
                if (data) {
                    res.writeHead(404, data.rObj)
                    return res.end(data.data)
                }
                complete()
            })
        }

    },

    set:function(k, v) {
        var keyType = typeof(k)

        if (keyType === 'string') {

            var opts    = this.opts
              , valType = typeof(v)

            k = k.toLowerCase()

            if (!opts.hasOwnProperty(k)) {
                return
            }

            if (k === 'expires' && valType === 'string') {
                v = expire.getSeconds(v)
            }else if (k === 'root' || k === 'public') {
                v = path.normalize(v)
            }else if (k === 'notFound' && valType === 'string') {
                v = path.normalize(v)
            }

            opts[k] = v
            opts.cache = opts.cache ? {} : false
        }else if (keyType === 'object') {
            for (var opt in k) {
                this.set(opt, k[opt])
            }
        }
    },

    get:function(k) {
        if (typeof(k) !== 'string') {
            return new Error('First argument must be a string')
        }

        var val = this.opts[k.toLowerCase()]

        if (typeof(val) === 'undefined') {
            return new Error('No such option "'+k+'"')
        }

        return val
    }
}

function file(path, req, res, options) {
    options = typeof(options) === 'object' ? options : {}
    var lactate = new Lactate(options)
    return lactate.serve(path, req, res)
}

function dir(directory, options) {
    options = typeof(options) === 'object' ? options : {}
    options.root = directory

    var lactate = new Lactate(options)

    lactate.toMiddleware = function(_o) {
        if (_o) {
          lactate.set.apply(lactate, arguments)
        }

        var public = lactate.get('public')

        return function(req, res, next) {
            var url = req.url
            ,   basename = path.dirname(url).substring(1)

            if (basename === public) {
                return lactate.serve(path.basename(url), req, res)
            }else {
                return next()
            }
        }
    }

    return lactate
}

module.exports.Lactate = function(options) {
    return new Lactate(options)
}

module.exports.file = file
module.exports.dir = dir
