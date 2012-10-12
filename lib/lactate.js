
// MIT License
// 
// Copyright 2012 Brandon Wilson
// 
// Permission is hereby granted, free of charge, to any person 
// obtaining a copy of this software and associated documentation 
// files (the "Software"), to deal in the Software without 
// restriction, including without limitation the rights to use, 
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software
// is furnished to do so, subject to the following conditions: 
// 
// The above copyright notice and this permission notice shall be 
// included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.


var fs       = require('fs')
  , path     = require('path')
  , util     = require('util')
  , zlib     = require('zlib')
  , mime     = require('mime')
  , Suckle   = require('suckle')
  , abridge  = require('abridge')
  , fraction = require('fraction')
  , expire   = require('expire');

var lib = function(lib) {
  return require(path.join(__dirname, lib));
};

var Emitter = lib('emitter')
  , Cache   = lib('cache')
  , Dir     = lib('directory')
  , Logger  = lib('logger')
 ,  Public  = lib('public');
 

function Lactate(options) { 
  
  this.cache = new(Cache);
  this.log = new(Logger);

  this.opts = {
      root:              process.cwd()
    , from:              ''
    , subdirs:           true
    , hidden:            false
    , not_found:         false

    //Caching options
    , cache:             true
    , watch_files:       true
    , max_age:           86400 * 2

    //Response options
    , headers:           {}
    , gzip:              true
    , minify:            false

    //Directory options
    , bundle:            false
    , rebundle:          true

    , debug:             false
  };

  if (!!options) this.set(options);

};

util.inherits(Lactate, Emitter);

Lactate.prototype.serve = function(fp, req, res, status) {
  var filePath = this.get('root');

  // Discern request path relative
  // to root and public options
   
  if (typeof(fp) === 'string') {
    // First argument is relative
    // file path, join it to the
    // root path
    filePath = path.join(filePath, fp)
  }else {
    // First argument is request
    // object, discern the path.
    res = req; req = fp

    var from = this.get('from');
    var fLen = from.length;
    var url = req.url;
    var dir = path
      .dirname(url)
      .substring(1);

    // If the requested directory
    // does not match the public
    // directory option, test
    // that subdirectories are
    // enabled and that the req-
    // uest path is appropriate.
    if (dir !== from) {
      var subdirs = this.get('subdirs');
      if (!subdirs || dir.substring(0, fLen) !== from) {
        return this._403(url, req, res);
      };
    };

    url = url.substring(fLen+1);
    filePath = path.join(filePath, url);
  };

  // Prevent serving hidden files
  if (!this.get('hidden')) {
    var file = path.basename(filePath);  
    if (file.charCodeAt(0) === 0x2E) {
      return this._403(filePath, req, res);
    };
  };

  var notFound = this._404.bind(this, filePath, req, res);

  // Check cache for request path
  var cached = this.getCache(filePath);

  if (cached) {
    // File is cached, get mtime
    // for freshness check
    var mtime = cached.headers['Last-Modified'];
    this.serveFile(filePath, req, res, status, cached, mtime);
  }else {
    // File is not cached. Check
    // That the file exists and
    // if so capture its mtime
    // and watch the file for
    // modifications.
    var cb = function(err, mtime) {
      if (err || !mtime) {
        notFound();
      } else {
        this.watchFile(filePath);
        this.serveFile(filePath, req, res, status, cached, mtime);
      };
    }.bind(this);

    this.getMtime(filePath, cb);
  };
};

Lactate.prototype.serveFile = function(filePath, req, res, status, cached, mtime) {
  // Get if-modified-since header to
  // test freshness of cached file
  var fresh = !!req && req.headers['if-modified-since'] === mtime;

  if (this.get('max_age') && fresh) {
    // The client has fresh file,
    // send a 304 'not modified'
    // response without data.
    this._304(filePath, req, res);
  }else if (!!cached) {
    // Client does not have file,
    // but the file has been
    // cached in memory from a
    // previous request.
    //
    // Stream the cached file in
    // segments if its length 
    // exceeds 200k
    // 
    // If we are serving a page
    // as a 404 handler, we will
    // serve a pre-cached file.
    if (!status || status === 200) {
      this._200(filePath, 'OK-cached', req, res, cached.headers);
    }else {
      res.writeHead(status, cached.headers);
    };

    var data = cached.read();
    var max_size = this.cache.seg_threshold;

    if (data.length < max_size) {
      res.end(data);
    }else {
      var stream = fraction.createStream(data);
      stream.on('error', console.error);
      stream.pipe(res);
    };
  }else {
    // File is requested for
    // the first time. Set
    // appropriate response
    // headers, read file,
    // gzip it, stream it
    // to the client, and
    // cache it for future
    // requests.
    this.complete(filePath, mtime, req, res, status)
  };
};

Lactate.prototype.getMtime = function(filePath, fn) {
  fs.stat(filePath, function(err, stat) {
    if (err || !stat.isFile()) {
      fn(new Error('Is not file'));
    } else {
      fn(null, stat.mtime.toUTCString());
    };
  });
};

Lactate.prototype.watchFile = function(filePath) {
  var doWatch = this.get('cache') && this.get('watch_file');

  if (doWatch) {
    var watcher = function(ev) {
      if (ev === 'change')
        this.cache.remove(filePath);
    }.bind(this);

    fs.watch(filePath, watcher);
  };
};

Lactate.prototype.complete = function(filePath, mtime, req, res, status) {
  // Detect file type for
  // content-type header,
  // set appropriate headers
  // for client-side caching.

  var mimeType = mime.lookup(filePath);
  var maxAge = this.opts.max_age;
  var cacheControl = (maxAge
    ? 'public, max-age=' + maxAge
    : 'no-store, no-cache')
    + ', must-revalidate';

  var powBy  = 'Lactate';
  var vary   = 'Accept-Encoding';
  var ranges = 'bytes';

  var headers = { 
    'X-Powered-By':   powBy,
    'Content-Type':   mimeType,
    'Last-Modified':  mtime,
    'Cache-Control':  cacheControl,
    'Vary':           vary,
    'Accept-Ranges':  ranges
  };

  // Extend response headers
  // with `headers` option.

  var optHeaders = this.opts.headers;
  var keys = Object.keys(optHeaders);
  keys.forEach(function(header) {
    var item = optHeaders[header];

    switch(typeof(item)) {
      case 'function':
        headers[header] = item(req);
        break;
      case 'string':
        case 'number':
        headers[header] = item;
        break;
    };
  });

  this.send(filePath, headers, req, res, status);
};

Lactate.prototype.send = function(filePath, headers, req, res, status) {
  var mux = new Suckle();

  if (!!this.opts.cache) {
    // Stream with callback is
    // supplied data such that
    // in-memory cache can be set

    var completed = function(data, len) {
      headers['Content-Length'] = len;
      this.setCache(filePath, data, headers);
    }.bind(this);

    mux.oncomplete(completed);
  };

  if (!!res) mux.pipe(res);

  // On file open, write
  // appropriate response
  // headers before streaming
  // file data

  var open = function(fd) {
    if (status) {
      res.writeHead(status, headers);
    } else {
      this._200(filePath, 'OK', req, res, headers, null);
    };
  }.bind(this);

  var error = this._404.bind(this, filePath, req, res);

  // Open file readstream, 
  // attach open and error 
  // listeners

  var rs = fs.createReadStream(filePath);
  rs.on('open', open);
  rs.on('error', error);

  // Detect content-type for
  // automatic minification
  // of text files, if enabled

  var cType = headers['Content-Type'];
  var isText = /^(text|application)/.test(cType);

  // File is not text, pipe it
  // directly to the response

  if (!isText)
    return rs.pipe(mux);

  var cmpr = this.opts.minify 
  && /gzip/.test(req.headers['Accept-Encoding']||'')
  && /\.js|css$/.test(filePath);

  var rStream = cmpr ? abridge.minify(rs) : rs;

  // Gzip is disabled, pipe 
  // minified text file to
  // the response

  if (!this.opts.gzip)
    return rStream.pipe(mux);

  // Gzip is enabled, pipe 
  // minifier to gzip, then
  // to the response

  headers['Content-Encoding'] = 'gzip';

  var gzip = zlib.createGzip();
  gzip.pipe(mux);
  rStream.pipe(gzip);
};

Lactate.prototype.setCache = function(filePath, data, headers) {
  if (!!this.opts.cache) {
    this.cache.set(filePath, headers, data);
  };
};

Lactate.prototype.getCache = function(filePath) {
  var cache = this.opts.cache;
  return !!cache ? this.cache.get(filePath) : null;
};

Lactate.prototype._200 = function(filePath, msg, req, res, headers, data) {
  var status = 200;
  res.writeHead(status, headers)
  if (data) res.end(data);
  this.debug(status, msg, filePath, req);
};

Lactate.prototype._304 = function(filePath, req, res) {
  var status = 304;
  res.writeHead(status);
  res.end();
  var msg = 'Not Modified';
  this.debug(status, msg, filePath, req);
};

Lactate.prototype._403 = function(filePath, req, res) {
  var status = 403;
  var msg = 'Forbidden';

  var page = path.resolve(__dirname + '/../public/403.html');
  var now = new Date().toUTCString();
  this.complete(page, now, req, res, status);

  this.debug(status, msg, filePath, req);
};

Lactate.prototype._404 = function(filePath, req, res) {
  var handler = this.opts.not_found;
  var status  = 404;

  switch(typeof(handler)) {
    case 'function':
      handler(req, res);
      break;
    case 'string':
      this.serve(handler, null, res, status);
      break;
    default:
      var page = path.resolve(__dirname + '/../public/404.html');
      var now = new Date().toUTCString();
      this.complete(page, now, req, res, status);
      break;
  };

  var msg = 'Not Found';
  this.debug(status, msg, filePath, req);
};

Lactate.prototype.set = function(k, v) {
  if (typeof(k) === 'object') {
    for (var opt in k)
      this.set(opt, k[opt]);
    return;
  };

  var opts = this.opts;

  if (!opts.hasOwnProperty(k)) 
    return;

  if (k === 'max_age' && typeof(v) === 'string') {
    v = expire.getSeconds(v);
  } else if (k === 'root') {
    v = path.resolve(v);
  } else if (k === 'from') {
    v = !v ? '' : path.join(v, '.');
  } else if (k === 'cache' && !!v) {
    var cache_opts = (typeof(v) === 'object') ? v : {};
    this.cache = new cache(cache_opts);
    v = true;
  };

  opts[k] = v;
};

Lactate.prototype.get = function(k) {
  return this.opts[k];
};

Lactate.prototype.enable = function(k) {
  this.set(k, true);
};

Lactate.prototype.disable = function(k) {
  this.set(k, false);
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

Lactate.prototype.max_age = 
Lactate.prototype.maxAge = function(val) {
  this.set('max_age', val);
};

Lactate.prototype.notFound = function(val) {
  this.set('not_found', val);
};

function ConData(req) {
  this.url = req.url;
  this.method = req.method;
  this.headers = req.headers;
  this.address = req.connection.remoteAddress;
  this.port = req.connection.remotePort;
};

Lactate.prototype.debug = function(status, msg, filePath, req) {
  if (!this.get('debug')) return;

  var dbg = function() {
    this.log[status](msg, filePath);
    var con = new ConData(req);
    this.emit(status, msg, filePath, con);
  }.bind(this);

  process.nextTick(dbg);
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

  var lactate = Dir.call(new Lactate(options));

  var bundle = lactate.get('bundle');
  switch(typeof(bundle)) {
    case 'boolean':
      if (!bundle) break;
      lactate.bundleScripts(bundle);
      lactate.bundleStyles(bundle);
      break;
    case 'string':
      lactate.bundle.call(lactate, bundle);
      break;
  };

  return lactate;
};

// Drop-in replacement for 
// Express.static
module.exports.static = function(dir, pub, options) {
  options = options || {};

  switch(typeof(pub)) {
    case 'string':
      options.pub = pub;
      break;
    case 'object':
      options = pub;
      break;
  };

  var lactate = module.exports.dir(dir, options);
  return lactate.toMiddleware();
};

// Adaptors for node-static API
module.exports.serveFile = module.exports.file;
module.exports.Server    = module.exports.dir;
