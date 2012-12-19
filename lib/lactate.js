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
var URL       = require('url');
var path      = require('path');
var util      = require('util');
var zlib      = require('zlib');
var Suckle    = require('suckle');
var abridge   = require('abridge');
var fraction  = require('fraction');
var expire    = require('expire');

var Cache     = require('./cache');
var Directory = require('./directory');
var Logger    = require('./logger');
var Responses = require('./response');
var Emitter   = require('./emitter');

function Lactate(options) { 

  Responses.apply(this);

  this.stack = [];

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
    , minify:            false

    , debug:             false
  };

  if (options) this.set(options);

};

util.inherits(Lactate, Emitter);

require('./status_codes').apply(Lactate.prototype);

require('./mime_types').apply(Lactate.prototype);

Lactate.prototype.extension = path.extname.bind(this);

Lactate.prototype.parseURL = function(url) {
  return decodeURI(URL.parse(url).pathname);
};

Lactate.prototype.validMethod = function(method) {
  return method === 'GET' || method === 'HEAD';
};

Lactate.prototype.isHidden = function(fp) {
  return path.basename(fp).charCodeAt(0) === 46;
};

Lactate.prototype.isText = function(contentType) {
  return /^text/.test(contentType) || /(\+|\/)xml$/.test(contentType);
};

Lactate.prototype.isCompressible = function(extension) {
  return /\.(js|css)$/.test(extension);
};

Lactate.prototype.isEncodable = function(headers) {
  return /gzip/.test(headers['accept-encoding']);
};

Lactate.prototype.isCached = function(req, mtime) {
  return req.headers['if-modified-since'] === mtime;
};

function FileRequest(fp, req, res, status) {
  this.fp = fp;
  this.req = req;
  this.res = res;
  this.status = status || 200;
};

util.inherits(FileRequest, Emitter);

Lactate.prototype.FileRequest = FileRequest;

Lactate.prototype.serve = function(url, req, res, next) {
  var root = this.get('root');
  var from = this.get('from');
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

    res = req;
    req = url;
    url = this.parseURL(
      req.url.slice(++from.length)
    );
    fp  = path.join(root, url);
    dir = path.dirname(url);

  };

  var error, hasNext = typeof next === 'function';

  if (hasNext) {
    error = next.bind(this, null)
  } else {
    error = function() {
      var args = Array.prototype
      .slice.call(arguments);
      var status = '_' + args.pop();
      this[status].apply(this, args);
    }.bind(this, fp, req, res);
  };

  if (!this.validMethod(req.method)) 
  {
    // Prevent invalid request methods
    error(405);
  } 
  else if (!this.get('subdirs') 
           && dir !== from) 
  {
    // Prevent disabled subdirectories
    error(403);
  } 
  else if (!this.get('hidden') 
           && this.isHidden(fp)) 
  {
    // Prevent serving hidden files
    error(403);
  } 
  else if (this.get('autoindex') 
           && !!this.serveIndex
           && !this.extension(fp))
  {
    // Autoindex directories
    this.serveIndex(fp, req, res, error)
  } 
  else 
  { 
    // Serve file
    var FR = this.FileRequest;
    var request = new FR(fp, req, res);
    request.once('error', error);
    this.serveFile(request);
  };
};

Lactate.prototype.serveFile = function(req) {
  var complete = this.complete.bind(this, req);

  this.getCache(req.fp, getCacheCallback.bind(this));

  function getCacheCallback(err, cached) {
    if (!err && cached) {
      var mtime = cached.headers['Last-Modified'];
      complete(cached, mtime);
    } else { 
      this.stat(req, complete);
    };
  };
};

Lactate.prototype.stat = function(req, fn) {
  fs.lstat(req.fp, statCallback.bind(this));

  function statCallback(err, stat) {
    if (err || !(stat.isFile() || stat.isSymbolicLink())) {
      req.emit('error', 404);
    } else {
      fn(null, stat.mtime.toUTCString());

      // Watch file for updates
      if (this.get('watch_files')) {
        process.nextTick(
          this.watchFile.bind(this, req.fp)
        );
      };
    };
  };
};

Lactate.prototype.useStack = function(request, fn) {
  var stack = this.stack;
  var len = stack.length;
  var fp = request.fp;
  var req = request.req;
  var res = request.res;

  ;(function nextStackItem(i) {
    if (i >= len) { return fn(); };
    var item = stack[i];
    var re = item.re;
    var next = nextStackItem.bind(this, ++i);
    if (item && (!re || re.test(fp))) {
      item.fn.call(this, req, res, next);
    } else {
      next();
    };
  })(0);
};

Lactate.prototype.watchFile = function(fp) {
  var doWatch = this.get('cache') 
    && !!this.get('watch_files');

  if (!doWatch) return;

  fs.watch(fp, watcher.bind(this));

  function watcher(ev) {
    if (ev === 'change') {
      this.cache.remove(fp);
    };
  };
};

Lactate.prototype.complete = function(request, cached, mtime) {
  var fp  = request.fp;
  var req = request.req;
  var res = request.res;

  var mtime = mtime || new Date().toUTCString();

  var client_cached = this.get('max_age')
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

    var maxAge = this.get('max_age');
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

Lactate.prototype.head = function(request, headers) {
  var fp = request.fp;
  var req = request.req;
  var res = request.res;
  var status = request.status;

  this.ev(status, fp, req);

  res.writeHead(status, headers);
  res.end();
};

Lactate.prototype.send = function(request, headers) {
  var fp = request.fp;
  var req = request.req;
  var res = request.res;
  var status = request.status;
  request = null;

  this.ev(status, fp, req);

  var mux = new Suckle(res);

  if (this.get('cache')) {

    // Stream with callback is
    // supplied data such that
    // in-memory cache can be set

    mux.oncomplete(function muxCallback(data) {
      var len = data.length;
      headers['Content-Length'] = len;
      this.setCache(fp, headers, data);
    }.bind(this));

  };

  // On file open, write
  // appropriate response
  // headers before streaming

  var open = res.writeHead.bind(res, status, headers);

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
  var isText = this.isText(cType);

  // File is not text, pipe it
  // directly to the response

  if (!isText) { return rs.pipe(mux); };

  // Conditionally minify
  // textual assets

  var ext = this.extension(fp);
  var compress = this.opts.minify 
  && this.isCompressible(ext);

  rs = compress ? abridge.minify(rs) : rs;

  if (!this.get('gzip')) {

    // Gzip is disabled, pipe 
    // minified text file to
    // the response

    rs.pipe(mux);
  } else {

    // Gzip is enabled, pipe 
    // minifier to gzip, then
    // to the response

    var _headers = req.headers;
    headers['Content-Encoding'] = 'gzip';

    var gzip = zlib.createGzip();
    gzip.pipe(mux);
    rs.pipe(gzip);
  };

};

Lactate.prototype.setCache = function(fp, headers, data) {
  var cache = this.get('cache');
  cache && this.cache.set(fp, headers, data);
};

Lactate.prototype.getCache = function(fp, fn) {
  var cache = this.get('cache');
  cache ? this.cache.get(fp, fn) : fn();
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
  this.emit(status, data);
};

// Get option
Lactate.prototype.get = function(k) {
  return this.opts[k.replace(/\s/g, '_')];
};

// Set option
Lactate.prototype.set = function(k, v) {
  if (typeof k === 'object') {
    for (var opt in k) {
      this.set(opt, k[opt]);
    };
  } else {
    k = k.replace(/\s/g, '_');

    if (!this.opts.hasOwnProperty(k)) {
       return;
    };

    var vType = typeof v;

    switch(k) {
      case 'root':
        v = path.resolve(v);
        break;
      case 'from':
        v = !v ? '' : path.join('.', v);
        break;
      case 'header':
      case 'dynamic_header':
        return this.setHeader(k, v);
        break;
      case 'max_age':
        v = vType === 'string' 
          ? expire.getSeconds(v) : v;
        break;
      case 'cache':
        if (!v) break;
        var opts = vType  === 'object' 
          ? v : {};
        this.cache = Cache.createCache(opts);
        v = true;
        break;
      case 'redis_cache':
        if (!v) break;
        var opts = vType  === 'object' 
          ? v : {};
        opts.redis = true;
        this.cache = Cache.createCache(opts);
        v = true;
        break;
      case 'debug':
        if (!v) break;
        Logger.createDebugger.call(this);
        break;
    };

    this.opts[k] = v;
  };
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

Lactate.prototype.beforeEach = 
Lactate.prototype.use = function(ext, fn) {
  var item = {};
  switch(typeof ext) {
    case 'string':
      item.fn = fn;
      item.re = new RegExp(ext + '$');
      break;
    case 'function':
      item.fn = ext;
      break;
  };
  this.stack.push(item);
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
