
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

var fs        = require('fs');
var path      = require('path');
var util      = require('util');
var zlib      = require('zlib');
var mime      = require('mime');
var Suckle    = require('suckle');
var abridge   = require('abridge');
var fraction  = require('fraction');
var expire    = require('expire');
var Emitter   = require('./emitter');
var Cache     = require('./cache');
var Directory = require('./directory');
var Logger    = require('./logger');
var Responses = require('./response');

function Lactate(options) { 

  Responses.apply(this);

  this.cache = Cache.createCache();
  this.log = Logger.createLogger();

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

  if (!!options)
    this.set(options);

};

util.inherits(Lactate, Emitter);

Lactate.prototype.STATUSES = {
  200:'OK',
  304:'Not Modified',
  400:'Bad Request',
  403:'Forbidden',
  404:'Not Found',
  405:'Bad Method',
  500:'Internal Error'
};

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
      var subdirs = this.get('subdirs');
    if (subdirs && dir !== from) {
      var subdir = dir.substring(0, fLen);
      if (!subdirs && subdir !== from) {
        return this._403(url, req, res);
      };
    };

    url = url.substring(fLen+1);
    filePath = path.join(filePath, url);
  };
   
  // Prevent invalid request methods
  if (!/^(HEAD|GET)$/.test(req.method)) {
    return this._405(filePath, req, res);
  };

  // Prevent serving hidden files
  if (!this.get('hidden')) {
    var file = path.basename(filePath);  
    if (file.charCodeAt(0) === 0x2E) {
      return this._403(filePath, req, res);
    };
  };

  // Check cache for request path
  var cached = this.getCache(filePath);
  status = status || 200;

  if (cached) {
    // File is cached, check
    // mtime for freshness
    var mtime = cached.headers['Last-Modified'];
    this.complete(filePath, req, res, status, cached, mtime);
  } else {
    // File is not cached
    var fn = function(err, mtime) {
      if (err || !mtime) {
        // Not found
        this._404(filePath, req, res);
      } else {
        // File exists, complete
        // the request
        this.complete(filePath, req, res, status, cached, mtime);

        // Watch file for updates
        var watch = this.watchFile.bind(this, filePath);
        process.nextTick(watch);
      };
    };

    // Get mtime, and implicitly
    // test existence with stat
    this.getMtime(filePath, fn.bind(this));
  };
};

Lactate.prototype.getMtime = function(fp, fn) {
  fs.stat(fp, function(err, stat) {
    if (err || !stat.isFile()) {
      err = err || new Error('Is not file '+fp);
      fn(err);
    } else {
      fn(null, stat.mtime.toUTCString());
    };
  });
};

Lactate.prototype.watchFile = function(fp) {
  var doWatch = this.get('cache') 
    && this.get('watch_files');

  if (doWatch) {
    var watcher = function(ev) {
      ev === 'change' 
      && this.cache.remove(fp);
    };
    fs.watch(fp, watcher.bind(this));
  };
};

Lactate.prototype.complete = function(fp, req, res, status, cached, mtime) {
  // Get if-modified-since header to
  // test freshness of cached file

  var doCache = this.get('max_age');
  var fresh = req.headers['if-modified-since'] === mtime;

  if (doCache && fresh) {
    // The client has fresh file,
    // send a 304 'not modified'
    // response without data.

    this._304(fp, req, res);
  } else if (!!cached) {
    // Client does not have file,
    // but the file has been
    // cached in memory from a
    // previous request.

    var max_size = this.cache.seg_threshold;
    var data = cached.read();

    res.writeHead(status, cached.headers);

    // Stream the cached file in
    // segments if its length 
    // exceeds segment threshold

    if (data.length < max_size) {
      // Send the complete buffer

      res.end(data);
    } else {
      // Stream the cached buffer
      // in segments, for slow
      // clients

      var stream = fraction.createStream(data);
      stream.on('error', console.error);
      stream.pipe(res);
    };

    this.ev(status, fp, req, 'OK-cached');
  } else {
    // File is requested for
    // the first time. Set
    // appropriate response
    // headers, read file,
    // gzip it, stream it
    // to the client, and
    // cache it for future
    // requests.

    // Map request method, 
    // Lactate only cares
    // about GET and HEAD

    var fn = {'GET':'send','HEAD':'head'}[req.method];

    if (fn) {
      // Request method is valid
      // build headers and complete
      // the request

      fn = this[fn].bind(this);
      this.buildHeaders(fp, mtime, req, res, status, fn)
    } else {
      // Invalid request method,

      this._400(fp, req, res);
    };
  };
};

Lactate.prototype.buildHeaders = function(fp, mtime, req, res, status, fn) {
  // Detect file type for
  // content-type header,
  // set appropriate headers
  // for client-side caching.

  var mimeType = mime.lookup(fp);
  var maxAge = this.get('max_age');
  var cacheControl = (maxAge
    ? 'public, max-age=' + maxAge
    : 'no-store, no-cache')
    + ', must-revalidate';

  var headers = { 
    'X-Powered-By':  'Lactate',
    'Content-Type':  mimeType
  };

  if (status < 400) {
    headers['Last-Modified'] = mtime;
    headers['Cache-Control'] = cacheControl;
    headers['Vary'] = 'Accept-Encoding';
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

  fn(fp, headers, req, res, status);
};

Lactate.prototype.head = function(fp, headers, req, res, status) {
  this.ev(status, fp, req);
  res.writeHead(status, headers);
  res.end();
};

Lactate.prototype.send = function(fp, headers, req, res, status) {
  this.ev(status, fp, req);

  var mux = new Suckle();
  if (!!res) mux.pipe(res);

  if (this.get('cache')) {
    // Stream with callback is
    // supplied data such that
    // in-memory cache can be set

    var setCache = this.setCache.bind(this);
    mux.oncomplete(function(data, len) {
      headers['Content-Length'] = len;
      setCache(fp, data, headers);
    });
  };

  // On file open, write
  // appropriate response
  // headers before streaming

  var open = res.writeHead.bind(res,status, headers);

  // On error, respond with
  // 500 internal error

  var error = this._500.bind(this, fp, req, res);

  // Open file readstream, 
  // attach open and error 
  // listeners

  var rs = fs.createReadStream(fp);
  rs.once('open', open);
  rs.once('error', error);

  // Detect content-type for
  // automatic minification
  // of text files, if enabled

  var cType = headers['Content-Type'];
  var isText = /^(text|application)/.test(cType);

  // File is not text, pipe it
  // directly to the response

  if (!isText)
    return rs.pipe(mux);

  // Conditionally minify
  // textual assets

  var cmpr = this.opts.minify 
  && /gzip/.test(req.headers['Accept-Encoding']||'')
  && /\.js|css$/.test(fp);

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

function ConData(fp, req, status, msg) {
  this.path = fp;
  this.status = status;
  this.msg = msg || this.STATUSES[status];
  this.url = req.url;
  this.method = req.method;
  this.headers = req.headers;
  this.address = req.connection.remoteAddress;
  this.port = req.connection.remotePort;
};

ConData.prototype.STATUSES = Lactate.prototype.STATUSES;

Lactate.prototype.ev = function(status, fp, req, msg) {
  var data = new ConData(fp, req, status, msg);
  var emit = this.emit.bind(this, status, data);
  process.nextTick(emit);
};

Lactate.prototype.setCache = function(fp, data, headers) {
  var cache = this.get('cache');
  cache && this.cache.set(fp, headers, data);
};

Lactate.prototype.getCache = function(fp) {
  var cache = this.get('cache');
  return cache ? this.cache.get(fp) : null;
};

Lactate.prototype.set = function(k, v) {
  if (typeof(k) === 'object') {
    for (var opt in k) {
      this.set(opt, k[opt]);
    };
  } else {
    var opts = this.opts;

    if (!opts.hasOwnProperty(k)) 
      return;

    switch(k) {
      case 'max_age':
        if (typeof(v) === 'string')
          v = expire.getSeconds(v);
        break;
      case 'root':
        v = path.resolve(v);
        break;
      case 'from':
        v = !v ? '' : path.join(v, '.');
        break;
      case 'cache':
        if (!v) break;
        var _opts = typeof v === 'object' ? v : {};
        this.cache = Cache.createCache(_opts);
        v = true;
        break;
      case 'debug':
        if (!v) break;
        Logger.createDebugger.call(this);
        break;
    };

    opts[k] = v;
  };
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
  } else {
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
  } else {
    options = directory || {};
    options.root = options.root || process.cwd();
  };

  var lactate = new Lactate(options);
  Directory.call(lactate);
  return lactate;
};

// Drop-in replacement for 
// Express.static
module.exports.static = function(dir, from, options) {
  options = options || {};

  if (typeof(dir) === 'object') {
    options = dir;
    dir = options.root || process.cwd();
  } else {
    switch(typeof(from)) {
      case 'string':
        options.from = from;
        break;
      case 'object':
        options = from;
        break;
    };
  };

  var lactate = module.exports.dir(dir, options);
  return lactate.toMiddleware();
};

// Adaptors for node-static API
module.exports.serveFile = module.exports.file;
module.exports.Server    = module.exports.dir;

// Same as dir method but creates
// a server instance
module.exports.createServer = function(options) {
  var handler = module.exports.static(options);
  var server = require('http').createServer(handler);
  return server;
};

