
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
    , error_pages:       true

    //Caching options

    , cache:             true
    , watch_files:       true
    , max_age:           86400 * 2

    //Response options

    , headers:           {}
    , dynamic_headers:   {}
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

Lactate.prototype.STATUS_CODES = {
  200:'OK',
  304:'Not Modified',
  400:'Bad Request',
  403:'Forbidden',
  404:'Not Found',
  405:'Method Not Allowed',
  500:'Internal Error'
};

Lactate.prototype.serve = function(fp, req, res, status) {
  var root = this.get('root');

  // Discern request path relative
  // to root and public options

  if (typeof fp  === 'string') {
    // First argument is relative
    // file path, join it to the
    // root path
    fp = path.join(root, fp)
  }else {
    // First argument is request
    // object, discern the path.
    res = req; req = fp

    var from = this.get('from');
    var fLen = from.length;
    var url = req.url;
    var dir = path.dirname(url).substring(1);

    // If the requested directory
    // does not match the public
    // directory option, test
    // that subdirectories are
    // enabled and that the req-
    // uest path is appropriate.

    if (dir !== from) {
      var subdirs = this.get('subdirs');
      var subdir = dir.substring(0, fLen) || 0;
      if (!subdirs && subdir !== from) {
        return this._403(url, req, res);
      };
    };

    url = url.substring(fLen+1);
    fp = path.join(root, url);
  };

  fp = decodeURI(fp);
   
  // Prevent invalid request methods
  // Lactate only cares about GET
  // and HEAD methods
  if (!/^(HEAD|GET)$/.test(req.method)) {
    return this._405(fp, req, res);
  };

  // Prevent serving hidden files
  if (!this.get('hidden')) {
    var file = path.basename(fp);  
    if (file.charCodeAt(0) === 0x2E) {
      return this._403(fp, req, res);
    };
  };

  // Check cache for request path
  var cached = this.getCache(fp);
  status = status || 200;

  if (cached) {
    // File is cached, check
    // mtime for freshness
    var mtime = cached.headers['Last-Modified'];
    this.complete(fp, req, res, status, cached, mtime);
  } else {
    // File is not cached
    var fn = function(err, mtime) {
      if (err || !mtime) {
        // Not found
        this._404(fp, req, res);
      } else {
        // File exists, complete
        // the request
        this.complete(fp, req, res, status, cached, mtime);

        // Watch file for updates
        var watch = this.watchFile.bind(this, fp);
        process.nextTick(watch);
      };
    };

    // Get mtime, and implicitly
    // test existence with stat
    this.getMtime(fp, fn.bind(this));
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
    var watcher = function fileWatcher(ev) {
      ev === 'change' && this.cache.remove(fp);
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

    var headers = cached.headers;
    this.attachDynamicHeaders(headers, req, res);
    res.writeHead(status, headers);
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

    // Emit status code event

    var msg = (status === 200) ? 'OK-cached' : null;
    this.ev(status, fp, req, msg);
  } else {
    // File is requested for
    // the first time. 

    // Map request method, 
    // Lactate only cares
    // about GET and HEAD

    var fn = req.method === 'HEAD' ? 'head' : 'send';
    fn = this[fn].bind(this);
    
    // Set appropriate 
    // response headers, 

    this.buildHeaders(fp, mtime, req, res, status, fn)
  };
};

Lactate.prototype.buildHeaders = function(fp, mtime, req, res, status, fn) {
  // Detect file type for
  // content-type header,
  // set appropriate headers
  // for client-side caching.

  var mimeType = mime.lookup(fp);

  // Default headers
  var headers = { 
    'X-Powered-By':  'Lactate',
    'Content-Type':  mimeType
  };

  // Use no-store, no-cache, 
  // for non-cached requests,
  // otherwise set max-age
  var maxAge = this.get('max_age');
  var cacheControl = maxAge
    ? 'public, max-age=' + maxAge
    : 'no-store, no-cache';

  // Always set must-revalidate
  cacheControl += ', must-revalidate';

  // Headers for 'success'
  // status codes only

  if (status < 300) {
    headers['Last-Modified'] = mtime;
    headers['Cache-Control'] = cacheControl;
    headers['Vary'] = 'Accept-Encoding';
  };

  // Extend response headers
  // with `headers` option.
  var optHeaders = this.get('headers');
  var keys = Object.keys(optHeaders);
  keys.forEach(function(header) {
    headers[header] = optHeaders[header];
  });

  this.attachDynamicHeaders(headers, req, res);
  fn(fp, headers, req, res, status);
};

Lactate.prototype.attachDynamicHeaders = function(headers, req, res) {
  var dynHeaders = this.get('dynamic_headers');
  var keys = Object.keys(dynHeaders);
  keys.forEach(function(header) {
    headers[header] = dynHeaders[header](req, res);
  });
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
    function muxCallback(data, len) {
      headers['Content-Length'] = len;
      setCache(fp, data, headers);
    };
    mux.oncomplete(muxCallback);
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

// Emitted for all requests
function ConData(fp, req, status, msg) {
  this.path    = fp;
  this.status  = status;
  this.msg     = msg || this.STATUS_CODES[status];
  this.url     = req.url;
  this.method  = req.method;
  this.headers = req.headers;
  this.address = req.connection.remoteAddress;
  this.port    = req.connection.remotePort;
};

ConData.prototype.STATUS_CODES = Lactate.prototype.STATUS_CODES;

// Emit event for logging
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

// Set option
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
      case 'header':
      case 'dynamic_header':
        return this.setHeader(k, v);
        break;
    };

    opts[k] = v;
  };
};

// Get option
Lactate.prototype.get = function(k) {
  return this.opts[k];
};

// Set boolean option to true
Lactate.prototype.enable = function(k) {
  this.set(k, true);
};

// Set boolean option to false
Lactate.prototype.disable = function(k) {
  this.set(k, false);
};

// Special setter for 'headers'
Lactate.prototype.header = 
Lactate.prototype.headers = 
Lactate.prototype.setHeader = function(key, val) {
  if (key.constructor === Object) {
    for (k in key) {
      this.setHeader(k, key[k]);
    };
  } else {
    switch(typeof(val)) {
      case 'string':
        this.get('headers')[key] = val;
        break;
      case 'function':
        this.get('dynamic_headers')[key] = val;
        break;
    };
  };
};

// Special setter for 'max_age'
Lactate.prototype.max_age = 
Lactate.prototype.maxAge = function(val) {
  this.set('max_age', val);
};

// Special setter for 'not_found'
Lactate.prototype.notFound = function(val) {
  this.set('not_found', val);
};

module.exports.Lactate = function(options) {
  return new Lactate(options);
};

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

