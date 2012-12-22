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


var fs          = require('fs');
var URL         = require('url');
var path        = require('path');
var util        = require('util');
var zlib        = require('zlib');
var Suckle      = require('suckle');
var abridge     = require('abridge');
var fraction    = require('fraction');
var expire      = require('expire');

var Cache       = require('./Cache');
var Directory   = require('./Directory');
var Logger      = require('./Logger');
var Responses   = require('./Response');
var Emitter     = require('./Emitter');
var FileRequest = require('./FileRequest');

/**
 * Lactate
 *
 * @constructor Lactate
 * @param {Object} options
 */

function Lactate(options) { 

  Responses.apply(this);

  this.log = Logger.createLogger();

  this.cache = Cache.createCache();

  this.opts = {
      root:              process.cwd()
    , from:              ''
    , hidden:            false
    , not_found:         false
    , error_pages:       true

    //Directory options
    , subdirs:           true
    , autoindex:         false
    , bundle:            false
    , rebundle:          true

    //Caching options
    , cache:             true
    , redis_cache:       false
    , watch_files:       true
    , max_age:           86400 * 2

    //Response options
    , headers:           {}
    , dynamic_headers:   {}
    , gzip:              true
    , gzip_patterns:     []
    , minify:            false

    , debug:             false
  };

  if (options) this.set(options);

};

util.inherits(Lactate, Emitter);

//Extend Lactate prototype with HTTP status codes
require('./status_codes').apply(Lactate.prototype);

//Extend Lactate prototype with mime types
require('./mime_types').apply(Lactate.prototype);

/**
 * Get file extension
 *
 * @param {String} filePath
 * @return String
 */

Lactate.prototype.extension = function(filePath) {
  return path.extname(filePath);
};

/**
 * Parse a URL's pathname and wrap
 * it in a call to decodeURI. This
 * takes care of URL queries and 
 * encoded URLs
 *
 * @param {String} url
 * @return String
 */

Lactate.prototype.parseURL = function(url) {
  return decodeURI(URL.parse(url).pathname);
};

/**
 * Lactate only cares about GET and 
 * HEAD methods
 *
 * @param {String} method
 * @return Boolean
 */

Lactate.prototype.validMethod = function(method) {
  return method === 'GET' || method === 'HEAD';
};

/**
 * Determines if a file path points
 * to a hidden file (prefixed with
 * a dot)
 *
 * @param {String} filePath
 * @return Boolean
 */

Lactate.prototype.isHidden = function(filePath) {
  return path.basename(filePath).charCodeAt(0) === 0x2E;
};

/**
 * Determins if a mime type is
 * textual, and hence should be
 * gzipped
 *
 * @param {String} contentType
 * @return Boolean
 */

Lactate.prototype.isText = function(contentType) {
  var patterns = this._get('gzip_patterns');

  var patternMatch = patterns.length 
  && patterns.some(function(pattern) {
    return pattern.test(contentType)
  });

  return patternMatch || /^text/.test(contentType);
};

/**
 * Determines if a file extension
 * is minifiable (compressible)
 *
 * @param {String} extension
 * @return Boolean
 */

Lactate.prototype.isCompressible = function(extension) {
  return /^\.(js|css)$/.test(extension);
};

/**
 * Determines if a request accepts
 * gzip responses
 *
 * @param {Object} headers
 * @return Boolean
 */

Lactate.prototype.isEncodable = function(headers) {
  return /gzip/.test(headers['accept-encoding']);
};

/**
 * Determines if a request has a
 * fresh version of the file, 
 * indicated by if-modified-since
 * header
 *
 * @param {HTTPRequest} req
 * @param {Number} mtime
 * @return Boolean
 */

Lactate.prototype.isCached = function(req, mtime) {
  return req.headers['if-modified-since'] === mtime;
};

/**
 * Main entry into file serving. 
 * It all begins here.
 *
 * @param {String} url
 * @param {HTTPRequest} req
 * @param {HTTPResponse} res
 * @param {Function} [next]
 */

Lactate.prototype.serve = function(url, req, res, next) {
  var root = this._get('root');
  var from = this._get('from');
  var dir  = from, fp;

  // Discern request path relative
  // to root and public options

  if (typeof url === 'string') {

    // First argument is relative
    // file path, join it to the
    // root path

    url = this.parseURL(url);
    fp = path.join(root, url);

  } else {

    // First argument is request
    // object, discern the path
    // from object and join it
    // to the root path

    var len = from.length + 1;

    res = req;
    req = url;
    url = this.parseURL(req.url.slice(len));
    fp  = path.join(root, url);
    dir = path.dirname(url);

  };

  var error, hasNext = typeof next === 'function';

  if (hasNext) {
    error = next.bind(this, null);
  } else {
    function errorHandler(fp, req, res, status) {
      var status = '_' + status;
      this[status](fp, req, res);
    };

    error = errorHandler.bind(this, fp, req, res);
  };

  if (!this.validMethod(req.method)) {
    // Prevent invalid request methods
    return error(405);
  };

  if (!this._get('subdirs') && dir !== from) {
    // Prevent disabled subdirectories
    return error(403);
  };

  if (!this._get('hidden') && this.isHidden(fp)) {
    // Prevent serving hidden files
    return error(403);
  };

  if (this._get('autoindex') && !this.extension(fp)) {
    // Autoindex directories
    return this.serveIndex(fp, req, res, error)
  };

  // Serve file
  var request = new FileRequest(fp, req, res);
  request.once('error', error);
  this.serveFile(request);
};

/**
 * Intermediary between #serve and #complete,
 * retrieves an item from the cache if it
 * exists, otherwise does an fs#stat to get
 * file mtime.
 *
 * @param {FileRequest} request
 */

Lactate.prototype.serveFile = function(request) {
  var self = this;
  var complete = this.complete;

  this.getCache(request.fp, getCacheCallback);

  function getCacheCallback(err, cached) {
    if (cached) {
      var mtime = cached.headers['Last-Modified'];
      complete.call(self, request, cached, mtime);
    } else { 
      self.stat(request, complete);
    };
  };
};

/**
 * Stat a file path, emit an error event
 * on the condition that the file does 
 * not exist.
 *
 * @param {FileRequest} request
 * @param {Function} fn
 */

Lactate.prototype.stat = function(request, complete) {
  fs.lstat(request.fp, statCallback.bind(this));

  function statCallback(err, stat) {
    if (err || !(stat.isFile() || stat.isSymbolicLink())) {
      request.emit('error', 404);
    } else {
      var mtime = stat.mtime.toUTCString();
      complete.call(this, request, null, mtime);

      // Watch file for updates
      if (this.get('watch_files')) {
        this.watchFile(request.fp);
      };
    };
  };
};

/**
 * Conditionallly watch files for changes.
 * On change, simply remove from the cache
 * and allow the next request to pick it up.
 *
 * @param {String} filePath
 */

Lactate.prototype.watchFile = function(filePath) {
  if (!this._get('cache')) return;
  var self = this;

  fs.watch(filePath, function fileWatcher(ev) {
    if (ev === 'change') {
      self.cache.remove(filePath);
    };
  });
};

/**
 * Complete a file request, check
 * mtimes for conditionally sending
 * not-modified response. Otherwise,
 * if the file is cached, serve it.
 * Lastly, read and serve the file.
 *
 * @param {FileRequest} request
 * @param {Object} cached
 * @param {Number} mtime
 */

Lactate.prototype.complete = function(request, cached, mtime) {
  var fp  = request.fp;
  var req = request.req;
  var res = request.res;

  var mtime = mtime || new Date().toUTCString();

  var client_cached = this._get('max_age')
    && this.isCached(req, mtime);

  if (client_cached) {

    // The client has fresh file,
    // send a 304 'not modified'
    // response without data.

    this._304(fp, req, res);

  } else if (cached) {

    // Client does not have file,
    // but the file has been
    // cached in memory from a
    // previous request.
    
    var status = request.status;
    var max_size = this.cache.segment;
    var data = cached.read();
    var headers  = cached.headers;

    this.attachHeaders(headers, request);

    res.writeHead(status, headers);

    // Stream the cached file in
    // segments if its length 
    // exceeds segment threshold

    if (data.length < max_size) {
      // Send the complete buffer
      res.end(data);
    } else {
      // Stream the cached buffer
      // in segments
      var stream = fraction.createStream(data);
      stream.on('error', console.error);
      stream.pipe(res);
    };

    // Emit status code event

    var msg = status === 200 
      ? 'OK-cached' 
      : null;

    this.ev(status, fp, req, msg);
  } else { 
    
    // Non-cached file request

    // Map request method, 
    // Lactate only cares
    // about GET and HEAD

    request.mtime = mtime;

    var method = req.method === 'HEAD' 
      ? 'head' 
      : 'send';

    // Build response headers
    this.buildHeaders(request, this[method]);
  };

};

/**
 * Build a headers object for 
 * the response
 *
 * @param {FileRequest} request
 * @param {Function} fn
 */

Lactate.prototype.buildHeaders = function(request, fn) {

  // Look up file type
  var mimeType = this.mime.lookup(request.fp);

  // Default headers
  var headers = { 'Content-Type': mimeType };

  // Headers for 'success'
  // status codes only

  if (request.status < 300) {

    // Use no-store, no-cache, 
    // for non-cached requests,
    // otherwise set max-age

    var maxAge = this._get('max_age');
    var cacheControl = maxAge
    ? 'public, max-age=' + maxAge
    : 'no-store, no-cache';

    // Always set must-revalidate

    cacheControl += ', must-revalidate';

    headers['Last-Modified'] = request.mtime;
    headers['Cache-Control'] = cacheControl;

  };

  // Extend response headers
  // with `headers` option.

  this.attachHeaders(headers);
  this.attachHeaders(headers, request);

  fn.call(this, request, headers);

};

/**
 * Attach headers, static or 
 * request-variant
 *
 * @param {Object} headers
 * @param {FileRequest} request
 */

Lactate.prototype.attachHeaders = function(headers, request) {
  var dynamic = !!request;
  var type = dynamic ? 'dynamic_headers' : 'headers';
  var ext = this.get(type);
  var keys = Object.keys(ext);
  var len = keys.length;

  if (len < 1) return;

  var attach = dynamic
  ? function(header) { 
      var req = request.req;
      var res = request.res;
      return header(req, res); 
    }
  : function(header) {
      return header; 
    };

  for (var i=0; i<len; i++) {
    var header = keys[i];
    headers[header] = attach(ext[header]);
  };
};

/**
 * Handler for HEAD requests
 *
 * @param {FileRequest} request
 * @param {Object} headers
 */

Lactate.prototype.head = function(request, headers) {
  var fp = request.fp;
  var req = request.req;
  var res = request.res;
  var status = request.status;

  this.ev(status, fp, req);

  res.writeHead(status, headers);
  res.end();
};

/**
 * Handler for GET requests,
 * stream the file and cache it
 * for future requests
 *
 * @param {FileRequest} request
 * @param {Object} headers
 */

Lactate.prototype.send = function(request, headers) {
  var fp = request.fp;
  var req = request.req;
  var res = request.res;
  var status = request.status;
  request = null;

  this.ev(status, fp, req);

  var mux = new Suckle(res);

  if (this._get('cache')) {
    // Stream with callback is
    // supplied data such that
    // in-memory cache can be set
    var self = this;
    mux.oncomplete(function muxCallback(data) {
      var len = data.length;
      headers['Content-Length'] = len;
      self.setCache(fp, headers, data);
    });
  };

  // On file open, write
  // appropriate response
  // headers before streaming

  var open = res.writeHead.bind(res, status, headers);

  // On error, respond with
  // 500 internal error

  var error = function error() {
    request.emit('error', 500);
  };

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
  var isText = this.isText(cType);

  // File is not text, pipe it
  // directly to the response

  if (!isText) { return rs.pipe(mux); };

  // Conditionally minify
  // textual assets

  var extension = this.extension(fp);

  var compress = this._get('minify')
  && this.isCompressible(extension);

  rs = compress ? abridge.minify(rs) : rs;

  if (!this.get('gzip')) {
    // Gzip is disabled, pipe 
    // minified text file to
    // the response
    return rs.pipe(mux);
  };

  // Gzip is enabled, pipe 
  // minifier to gzip, then
  // to the response

  var _headers = req.headers;
  headers['Content-Encoding'] = 'gzip';

  var gzip = zlib.createGzip();
  gzip.pipe(mux);
  rs.pipe(gzip);

};

/**
 * Set cache
 *
 * @param {String} filePath
 * @param {Object} headers
 * @param {Buffer} data
 */

Lactate.prototype.setCache = function(filePath, headers, data) {
  var cache = this._get('cache');
  cache && this.cache.set(filePath, headers, data);
};

/**
 * Get cache
 *
 * @param {String} filePath
 * @param {Function} fn
 */

Lactate.prototype.getCache = function(filePath, fn) {
  var cache = this._get('cache');
  cache ? this.cache.get(filePath, fn) : fn();
};


/**
 * An abstraction for status code
 * event listeners. Some things 
 * regarding this need to be cleaned
 * up in the indeterminate future.
 *
 * @param {String} filePath
 * @param {HTTPRequest} request
 * @param {Number} status
 * @param {String} message
 */

// Emitted for all requests
function ConData(filePath, request, status, msg) {
  this.path    = filePath;
  this.status  = status;
  this.msg     = msg || this.STATUS_CODES[status];
  this.url     = request.url;
  this.method  = request.method;
  this.headers = request.headers;
  this.address = request.connection.remoteAddress;
  this.port    = request.connection.remotePort;
};

ConData.prototype.STATUS_CODES = Lactate.prototype.STATUS_CODES;

// Emit event for logging
Lactate.prototype.ev = function(status, fp, req, msg) {
  var data = new ConData(fp, req, status, msg);
  this.emit(status, data);
};

/**
 * Safe get option, replaces spaces
 * with underscores for enhanced 
 * presentation
 *
 * @param {String} key
 * @return option
 */

Lactate.prototype.get = function(key) {
  return this._get(key.replace(/\s/g, '_'));
};

/**
 * Unsafe get, used internally for 
 * enhanced performance
 *
 * @param {String} key
 * @return option
 */

Lactate.prototype._get = function(key) {
  return this.opts[key];
};

/**
 * Set option
 *
 * @param {String} key
 * @param val
 */

Lactate.prototype.set = function(key, val) {

  if (typeof key === 'object') {
    var keys = Object.keys(key);
    return keys.forEach(function(opt) {
      this.set(opt, key[opt]);
    }, this);
  };

  key = key.replace(/\s/g, '_');

  if (!this.opts.hasOwnProperty(key)) {
    return;
  };

  var valType = typeof val;

  switch (key) {
    case 'root':
      val = path.resolve(val);
      break;
    case 'from':
      val = !val ? '' : path.join('.', val);
      break;
    case 'header':
    case 'dynamic_header':
      return this.setHeader(key, val);
      break;
    case 'max_age':
      if (valType === 'string') {
        val = expire.getSeconds(val);
      };
      break;
    case 'cache':
      if (!val) break;

      var opts = valType  === 'object' ? val: {};
      this.cache = Cache.createCache(opts);

      val = true;
      break;
    case 'redis_cache':
      if (!val) break;

      var opts = valType  === 'object' ? val : {};
      opts.redis = true;
      this.cache = Cache.createCache(opts);

      v = true;
      break;
    case 'debug':
      if (!val) break;
      Logger.createDebugger.call(this);
      break;
  };

  this.opts[key] = val;
};

// Set boolean option to true
Lactate.prototype.enable = function(k) {
  this.set(k, true);
};

// Set boolean option to false
Lactate.prototype.disable = function(k) {
  this.set(k, false);
};

// Setter for 'root'
Lactate.prototype.root = function(val) {
  this.set('root', val);
};

// Setter for 'from'
Lactate.prototype.from = function(val) {
  this.set('from', val);
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

// Special setter for 'headers'
Lactate.prototype.header = 
Lactate.prototype.headers = 
Lactate.prototype.setHeader = function(key, val) {
  if (key.constructor === Object) {
    for (k in key) {
      this.setHeader(k, key[k]);
    };
  } else {
    var map = {
      'string':'headers',
      'function':'dynamic_headers' 
    };
    var type = map[typeof val];
    if (!!type) this.get(type)[key] = val;
  };
};

Lactate.prototype.gzip = function() {
  var args = Array.prototype.slice.call(arguments);

  args = args.map(function(pattern) {
    if (typeof pattern === 'string') {
      return new RegExp(pattern);
    } else {
      return pattern;
    };
  });

  var opts = this.opts;
  opts.gzip_patterns = opts.gzip_patterns.concat(args);
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
  Directory.apply(lactate);
  return lactate;
};

// Replacement for Express.static
module.exports.static = function(dir, from, options) {
  options = options || {};

  if (typeof dir === 'object') {
    options = dir;
    dir = options.root || process.cwd();
  } else {
    switch(typeof from) {
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

// Create a server
module.exports.createServer = function(options) {
  var handler = module.exports.static(options);
  var server = require('http').createServer(handler);
  return server;
};
