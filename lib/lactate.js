
var fs        = require('fs')
,   path      = require('path')
,   zlib      = require('zlib')
,   mime      = require('mime')
,   Suckle    = require('suckle')
,   expire    = require('expire')
,   makeDebug = require('./debugger.js')

function Lactate(options) { 
    this.opts = {
          cache:    {}
        , expires:  0
        , root:     process.cwd()
        , public:   ''
        , debug:    false
        , subdirs:  true
        , on404:    false
    }
    if (options) {
        this.set(options)
    }
}

Lactate.prototype = {

    debug:function() {
        var dbg = this.opts.debug

        if (dbg) {
            /*
             * Use console.log as default 
             * function for debugging
             */
            var func = console.log
            if (typeof dbg === 'function') func = dbg
            return func.apply(this, arguments)
        }
    },

    serve:function(fp, req, res) {
        var opts     = this.opts
          , filePath = opts.root
          , public   = opts.public
          , self     = this
          , stat

        if (typeof(fp) === 'string') {
            /*
             * Join root directory
             * to the requested path
             */
            filePath = path.join(filePath, fp)
        }else {
            /*
             * Serve is being called as
             * serve(req, res), use
             * req.url for path
             */
            res = req
            req = fp

            var url = req.url
            ,   dirname = path.dirname(url).substring(1)
            ,   pubLength = public.length

            /*
             * Check that the requested URL
             * begins with opts.public or
             * that subdirectories
             * are disabled
             */

            if (dirname !== public) {
                if (!opts.subdirs) {
                    return self._404(res)
                }
                var subdir = dirname.substring(0, pubLength)
                if (subdir !== public) {
                    return self._404(res)
                }
            }

            /*
             * Join opts.root to the requested path
             */

            filePath = path.join(filePath, url.substring(pubLength+1))
        }

        this.debug(0, 'Serving file', filePath)

        /*
         * Check that the path
         * exists and that it
         * leads to a file
         */

        try {
            stat = fs.statSync(filePath)
        }catch(exception) {
            return self._404(res)
        }

        if (!stat.isFile()) {
            return self._404(res)
        }

        /*
         * Convert mtime to UTC string
         */

        var mtime = stat.mtime.toUTCString()

        if (opts.expires) {
            /*
             * Compare if-modified-since
             * headers to mtime for 
             * client-side caching
             */
            var ims = req.headers['if-modified-since']
            if (ims === mtime) {
                return this._304(res)
            }
        }

        if (!opts.cache) {
            /*
             * Not caching in memory,
             * read and serve the file
             */
            return this.complete(filePath, mtime, res)
        }

        this.getCache(filePath, function(err, cached) {
            var lm = cached ? cached.rObj['Last-Modified'] : null
            if (!cached || lm !== mtime) {
                /*
                 * Either the file has not yet
                 * been cached in-memory or 
                 * it has been modified since.
                 */
                return self.complete(filePath, mtime, res)
            }
            /*
             * File is cached
             */
            self._200('Cached in memory', res, cached.rObj, cached.data)
        })
    },

    complete:function(filePath, mtime, res) {
        /*
         * Build response header object
         */
        var mimeType = mime.lookup(filePath)
        var rObj = { 
            'Content-Type':      mimeType,
            'Content-Encoding':  'gzip',
            'Last-Modified':     mtime
        }

        var expires = this.opts.expires
        if (expires) {
            /*
             * Decorate the response
             * object with expiration
             * headers
             */
            expire.setExpiration(rObj, expires)
        }

        /*
         * Stream the file
         */
        return this.send(filePath, rObj, res)
    },

    send:function(path, rObj, res, _404) {
        var self = this

        /*
         * Use Suckle so that the
         * file may be streamed 
         * to the response and 
         * callback supplied for
         * in-memory caching
         */
        var mux = new Suckle(res, function(data) {
            if (self.opts.cache) {
                rObj['Content-Length'] = data.length
                self.setCache(path, data, rObj)
            }
        })

        /*
         * Create gzip and read streams
         */
        var gz = zlib.createGzip()
        ,   rs = fs.createReadStream(path)

        rs.on('open', function(fd) {
            if (_404) {
                /*
                 * The file being read
                 * is a custom 404 page
                 */
                res.writeHead(404, rObj)
            }else {
                /*
                 * Write headers and debug
                 */
                self._200('Read and served file', res, rObj)
            }
            /* 
             * Pipe read stream to 
             * gzip and then to mux,
             * which pipes to the 
             * response
             */
            rs.pipe(gz).pipe(mux)
        })

        rs.on('error', function(){
            res.writeHead(404)
            res.end()
        })
    },

    setCache:function(path, data, rObj) {
        /*
         * Store assets in-memory
         */
        var cache = this.opts.cache
        
        if (!cache) return

        cache[path] = {
            data:data,
            rObj:rObj
        }
    },

    getCache:function(path, fn) {
        /*
         * To easily drop-in 
         * external caching ability
         * in the future
         */

        return fn(null, this.opts.cache[path])
    },

    _200:function(msg, res, headers, data) {
        var status = 200
        res.writeHead(status, headers)
        /*
         * No data means the file
         * is being streamed for 
         * the first time. 
         *
         * If data exists, the file
         * is cached
         */
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
        , handler = this.opts.on404

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
            /*
            * Custom 404 handler
            */
            handler(res) 
        }else if (handlerType === 'string') {
            /*
            * Custom 404 page
            */
            handler = path.join(this.opts.root, handler)

            /*
            * If is not a file, fall
            * back to default
            */
            try {
                var stat = fs.statSync(handler)
                if (!stat.isFile()) {
                    return def()
                }
            }catch(exception) {
                return def()
            }

            if (!this.opts.cache) {
                /*
                * Not caching 404 page
                */
                return complete()
            }

            this.getCache(handler, function(err, data) {
                if (data) {
                    /*
                     * 404 page is cached
                     */
                    res.writeHead(404, data.rObj)
                    return res.end(data.data)
                }
                /*
                 * Uncached
                 */
                complete()
            })
        }

    },

    set:function(k, v) {
        var keyType = typeof(k)

        if (keyType === 'string') {

            var opts    = this.opts
            ,   valType = typeof(v)

            k = k.toLowerCase()

            if (!opts.hasOwnProperty(k)) {
                return
            }

            if (k === 'debug' && valType !== 'boolean') {
                v = makeDebug.apply(this, arguments)
            }else if (k === 'expires' && valType === 'string') {
                v = expire.getSeconds(v)
            }else if (k === 'root' || k === 'public') {
                v = path.normalize(v)
            }else if (k === 'on404' && valType === 'string') {
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
