
var fs      = require('fs')
  , path    = require('path')
  , zlib    = require('zlib')
  , mime    = require('mime')
  , Suckle  = require('suckle')
  , abridge = require('abridge')
  , lessen  = require('lessen')
  , expire  = require('expire')
  , log     = require('./logger').http;


function Lactate(options) { 

  this.opts = {
      root:        process.cwd()
    , public:      ''
    , pub:         ''
    , debug:       false
    , subdirs:     true
    , notFound:    false
    , cache:       {}
    , watchFiles:  true
    , gzip:        true
    , minify:      false
    , expires:     86400 * 2
    , headers:     {}
  };

  if (options)
    this.set(options);

};

Lactate.prototype.serve = function(fp, req, res, status) {
  var opts = this.opts;
  var filePath = opts.root;
  var public = opts.pub || opts.public;
  var notFound;

  /**
   * Discern request path relative
   * to root and public options
   */
  if (typeof(fp) === 'string') {
    /**
     * First argument is relative
     * file path, join it to the
     * root path
     */
    filePath = path.join(filePath, fp)
  }else {
    /**
     * First argument is request
     * object, discern the path.
     */
    res = req; req = fp

    var pubLen = public.length;
    var url = req.url;
    var dirname = path
      .dirname(url)
      .substring(1);

    /**
     * If the requested directory
     * does not match the public
     * directory option, test
     * that subdirectories are
     * enabled and that the req-
     * uest path is appropriate.
     */
    notFound = this._404.bind(this, res, url);
    if (dirname !== public) {
      if (!opts.subdirs) return notFound();
      var subdir = dirname.substring(0, pubLen);
      if (subdir !== public) return notFound();
    };

    url = url.substring(pubLen+1);
    filePath = path.join(filePath, url);
  };

  notFound = this._404.bind(this, res, filePath);

  /**
   * Check cache for request path
   */
  var cache = opts.cache;
  var mtime, cached = !!cache ? cache[filePath] : false;

  if (cached) {
    /**
     * File is cached, get mtime
     * for freshness check
     */
    //console.log(cached);
    mtime = cached.headers['Last-Modified'];
  }else {
    /**
     * File is not cached. Check
     * That the file exists and
     * if so capture its mtime
     * and watch the file for
     * modifications.
     */
    try {
      var stat = fs.statSync(filePath);
      if (!stat.isFile())
        return notFound();
      mtime = stat.mtime.toUTCString();
      this.watch(filePath);
    }catch(exception) {
      return notFound();
    };
  };

  /**
   * Get if-modified-since header
   * to test freshness of cached
   * file
   */
  var ims = !!req ? req.headers['if-modified-since'] : null;

  if (opts.expires && ims === mtime) {
    /**
     * The client has fresh file,
     * send a 304 'not modified'
     * response without data.
     */
    this._304(res, filePath);
  }else if (!!cached) {
    /**
     * Client does not have file,
     * but the file has been
     * cached in memory from a
     * previous request.
     *
     * If we are serving a page
     * as a 404 handler, we will
     * serve a pre-cached file.
     */
    if (!status || status === 200) {
      this._200('Cached',
                res,
                cached.headers,
                cached.data,
                filePath);
    }else {
      res.writeHead(status, cached.headers);
      res.end(cached.data);
    };
  }else {
    /**
     * File is requested for
     * the first time. Set
     * appropriate response
     * headers, read file,
     * gzip it, stream it
     * to the client, and
     * cache it for future
     * requests.
     */
    this.complete(filePath, mtime, req, res, status)
  };
};

Lactate.prototype.watch = function(filePath) {
  var cache = this.opts.cache;
  if (!cache || !this.opts.watchFile) return;

  var watchFile = function(fp, ev) {
    if (ev === 'change')
      cache[fp] = null;
  }.bind(this, filePath);

  fs.watch(filePath, watchFile);
};

Lactate.prototype.complete = function(filePath, mtime, req, res, status, sync) {
  /**
   * Detect file type for
   * content-type header,
   * set appropriate headers
   * for client-side caching.
   */
  var mimeType = mime.lookup(filePath);
  var expires = this.opts.expires;
  var cacheControl = expires
  ? 'public, max-age=' + expires
  : 'no-store, no-cache';

  var headers = { 
    'Content-Type':   mimeType,
    'Last-Modified':  mtime,
    'Cache-Control':  cacheControl
  };

  /**
   * Extend response headers
   * with `headers` option.
   */
  var optHeaders = this.opts.headers;
  var keys = Object.keys(optHeaders);
  if (keys.length) {
    keys.forEach(function(header) {
      var item = optHeaders[header];
      if (typeof(item) === 'function') {
        headers[header] = item(req);
      }else {
        headers[header] = item;
      }
    });
  };

  if (sync) {
    return headers;
  }else {
    return this.send(filePath, headers, res, status);
  };
};

Lactate.prototype.send = function(filePath, headers, res, _404) {
  var mux = new Suckle();

  if (this.opts.cache) {
    /**
     * Stream with callback is
     * supplied data such that
     * in-memory cache can be set
     */
    var completed = function(data) {
        headers['Content-Length'] = data.length;
        this.setCache(filePath, data, headers);
    }.bind(this);

    mux.oncomplete(completed);
  };

  if (!!res) mux.pipe(res);

  /**
   * On file open, write
   * appropriate response
   * headers before streaming
   * file data
   */
  var open = function(fd) {
    if (_404) {
      res.writeHead(404, headers);
    }else {
      this._200('Read and served', res, headers, null, filePath);
    }
  }.bind(this);

  var error = this._404.bind(this, res, filePath);

  /**
   * Open file readstream, 
   * attach open and error 
   * listeners
   */
  var rs = fs.createReadStream(filePath);
  rs.on('open', open);
  rs.on('error', error);

  /**
   * Detect content-type for
   * automatic minification
   * of text files, if enabled
   */
  var cType = headers['Content-Type'];
  var isText = /^(text|application)/.test(cType);

  /**
   * File is not text, pipe
   * it directly to the
   * response
   */
  if (!isText)
    return rs.pipe(mux);

  var cmpr = this.opts.minify && /\.(js|css)$/.test(filePath);
  var rStream = cmpr ? abridge.minify(rs) : rs;

  /**
   * Gzip is disabled, pipe 
   * minified text file to
   * the response
   */
  if (!this.opts.gzip)
    return rStream.pipe(mux);

  /**
   * Gzip is enabled, pipe 
   * minifier to gzip, then
   * to the response
   */
  headers['Content-Encoding'] = 'gzip';

  var gzip = zlib.createGzip();
  gzip.pipe(mux);
  rStream.pipe(gzip);
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
  var cache = this.opts.cache;
  var val = !!cache ? cache[filePath] : null;
  if (typeof(fn) === 'function')
    fn(null, val);
  return val;
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
    handler(res);
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

  var opts = this.opts;
  var valType = typeof(v);

  if (!opts.hasOwnProperty(k)) return;

  if (k === 'expires' && valType === 'string') {
    v = expire.getSeconds(v);
  }else if (k === 'root') {
    v = path.resolve(v);
  }else if (/^(public|pub)$/.test(k)) {
    v = path.join('.', v);
  };

  opts[k] = v;
  opts.cache = opts.cache ? {} : false;
};

Lactate.prototype.get = function(k) {
  return this.opts[k];
};

Lactate.prototype.header = 
Lactate.prototype.headers = 
Lactate.prototype.setHeader = function(key, val) {
  var headers = this.opts.headers;
  if (typeof(key) === 'object') {
    for (k in key) {
      headers[k] = key[k];
    };
  }else {
    headers[key] = val;
  };
};

Lactate.prototype.expires = 
Lactate.prototype.maxAge = function(val) {
  this.set('expires', val);
};

Lactate.prototype.debug = function(status, msg, filePath) {
  if (this.opts.debug)
    console.log(log[status](msg), filePath);
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
  Directory.call(lactate);
  return lactate;
};

function Directory() {

  this.toMiddleware = function(options) {
    if (options) this.set(options);

    var public  = this.get('pub') || this.get('public') || '';
    var subdirs = this.get('subdirs');
    var publen  = public.length;

    return function(req, res, next) {
      var url = req.url
      var basename = path.dirname(url).substring(1);
      var sub = basename.substring(0, publen);

      if (basename === public || (subdirs && sub === public)) {
        this.serve(req, res)
      }else if (next) {
        next()
      }else {
        this._404(res, url);
      }
    }.bind(this);
  };

  var filter = function(type) {
    var re = new RegExp(['.', '$'].join(type));
    return re.test.bind(re);
  };

  this.bundle = function(type, name, cb) {
    var root = this.get('root');
    var location = path.join(root, name);

    var files;
    if (type instanceof Array) {
      files = type;
    }else {
      files = fs.readdirSync(root)
      .filter(filter(type));
    };

    var appendRoot = path.join.bind(this, root);
    files = files.map(appendRoot);

    var options = {
      fileIn:files,
      fileOut:location
    };

    abridge.minify(options, cb);
  };

  this.bundleScripts = this.bundle.bind(this, 'js');
  this.bundleStyles = this.bundle.bind(this, 'css');

};

module.exports.static = function(dir, pub, options) {
  options = options || {};
  var type = typeof(pub);
  if (type === 'object') {
    options = pub;
  }else if (type === 'string') {
    options.pub = pub;
  };

  var lactate = module.exports.dir(dir, options);
  return lactate.toMiddleware();
};

/**
 * Adaptors for node-static API
 */
module.exports.serveFile = module.exports.file;
module.exports.Server    = module.exports.dir;
