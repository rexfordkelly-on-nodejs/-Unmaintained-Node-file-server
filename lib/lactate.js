
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
var Suckle    = require('suckle');
var abridge   = require('abridge');
var fraction  = require('fraction');
var expire    = require('expire');
var mime      = require('./mime');
var Emitter   = require('./emitter');
var Cache     = require('./cache');
var Directory = require('./directory');
var Logger    = require('./logger');
var Responses = require('./response');

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
    , minify:            false

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

Lactate.prototype.validMethod = function(method) {
  return method === 'GET' || method === 'HEAD';
};

Lactate.prototype.isHidden = function(fp) {
  return path.basename(fp).charCodeAt(0) === 46;
};

Lactate.prototype.extension = path.extname.bind(this);

Lactate.prototype.isText = function(contentType) {
  return this.test(contentType);
}.bind(/^text/);

Lactate.prototype.isCompressable = function(extension) {
  return this.test(extension);
}.bind(/\.(js|css)$/);

Lactate.prototype.serve = function(url, req, res, status) {
  var root = this.get('root');
  var from = this.get('from');
  var dir = from, fp;

  // Discern request path relative
  // to root and public options

  if (typeof url === 'string') {
    // First argument is relative
    // file path, join it to the
    // root path
    fp = path.join(root, url);
  } else {
    // First argument is request
    // object, discern the path
    // from object and join it
    // to the root path

    res = req; 
    req = url;
    url = decodeURI(req.url)
          .slice(++from.length);
    fp  = path.join(root, url);
    dir = path.dirname(url);
  };

  if (!this.validMethod(req.method)) 
  {
    // Prevent invalid request methods
    this._405(fp, req, res);

  } 
  else if (!this.get('subdirs') 
           && dir !== from) 
  {

    // Prevent disabled subdirectories
    this._403(req.url, req, res);

  } 
  else if (!this.get('hidden') 
           && this.isHidden(fp)) 
   {

    // Prevent serving hidden files
    this._403(fp, req, res);

  } 
  else if (this.get('autoindex') 
           && !!this.serveIndex
           && !this.extension(fp))
   {

    // Autoindex directories
    this.serveIndex(fp, req, res)

  } 
  else { 

    // Serve file
    this.serveFile(fp, req, res, 200);

  };
};

Lactate.prototype.serveFile = function(fp, req, res, status) {
  this.getCache(fp, getCacheCallback.bind(this));
  function getCacheCallback(err, cached) {
    var complete = this.complete.bind(this, fp, req, res, status);
    if (!err && cached) {
      var mtime = cached.headers['Last-Modified'];
      complete(cached, mtime);
    } else { 
      this.stat(fp, req, res, complete);
    };
  };
};

Lactate.prototype.stat = function(fp, req, res, fn) {
  fs.stat(fp, statCallback.bind(this));
  function statCallback(_err, stat) {
    if (_err || !stat.isFile()) {
      this._404(fp, req, res);
    } else {
      fn(null, stat.mtime.toUTCString());

      // Watch file for updates
      if (this.get('watch_files')) {
        process.nextTick(
          this.watchFile.bind(this, fp)
        );
      };
    };
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

Lactate.prototype.watchFile = function(fp) {
  var doWatch = this.get('cache') 
      && this.get('watch_files');

  if (!doWatch) return;

  fs.watch(fp, watcher.bind(this));

  function watcher(ev) {
    if (ev === 'change') {
      this.cache.remove(fp);
    };
  };
};

Lactate.prototype.complete = function(fp, req, res, status, cached, mtime) {
  mtime = mtime || new Date().getTime();

  var client_cached = !!req 
    && this.get('max_age')
    && req.headers['if-modified-since'] === mtime;

  if (client_cached) {
    // The client has fresh file,
    // send a 304 'not modified'
    // response without data.

    this._304(fp, req, res);
  } else if (!!cached) {
    // Client does not have file,
    // but the file has been
    // cached in memory from a
    // previous request.

    var max_size = this.cache.segment;
    var data = cached.read();
    var headers = cached.headers;
    this.attachHeaders(headers, req, res);

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

    var method = req.method === 'HEAD'
    ? 'head' : 'send';

    var fn = this[method];

    // Build response
    // headers

    this.buildHeaders(fp, mtime, req, res, status, fn);
  };
};

Lactate.prototype.buildHeaders = function(fp, mtime, req, res, status, fn) {
  // Detect file type for
  // content-type header,
  // set appropriate headers
  // for client-side caching.

  var mimeType = mime.lookup(fp);

  // Default headers
  var headers = { 'Content-Type': mimeType };

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
  };

  // Extend response headers
  // with `headers` option.

  this.attachHeaders(headers);
  this.attachHeaders(headers, req, res);

  fn.apply(this, [fp, headers, req, res, status]);
};

Lactate.prototype.attachHeaders = function(headers, req, res) {
  var _dyn = !!req && !!res;
  var ext = this.get( _dyn ? 'dynamic_headers' : 'headers');
  var keys = Object.keys(ext);
  var len = keys.length;

  if (!len) return;

  var attach = _dyn 
  ? function(header) { return header(req, res); }
  : function(header) { return header; };

  for (var i=0; i<len; i++) {
    var header = keys[i];
    headers[header] = attach(ext[header]);
  };
};

Lactate.prototype.head = function(fp, headers, req, res, status) {
  this.ev(status, fp, req);
  res.writeHead(status, headers);
  res.end();
};

Lactate.prototype.send = function(fp, headers, req, res, status) {
  this.ev(status, fp, req);

  var mux = new Suckle(res);

  if (this.get('cache')) {
    // Stream with callback is
    // supplied data such that
    // in-memory cache can be set

    mux.oncomplete(muxCallback.bind(this));
    function muxCallback(data, len) {
      headers['Content-Length'] = len;
      this.setCache(fp, headers, data);
    };
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
  var isText = this.isText(cType);

  // File is not text, pipe it
  // directly to the response

  if (!isText) {
    rs.pipe(mux);
  } else {

    // Conditionally minify
    // textual assets

    var compress = this.opts.minify 
    && this.isCompressable(extension(fp));

    rs = compress 
      ? abridge.minify(rs) 
      : rs;

    // Gzip is disabled, pipe 
    // minified text file to
    // the response

    if (!this.opts.gzip) {
      rs.pipe(mux);
    } else {

      // Gzip is enabled, pipe 
      // minifier to gzip, then
      // to the response

      headers['Content-Encoding'] = 'gzip';

      var gzip = zlib.createGzip();
      gzip.pipe(mux);
      rs.pipe(gzip);

    };
  };
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

// Set option
Lactate.prototype.set = function(k, v) {
  if (typeof(k) === 'object') {
    for (var opt in k) {
      this.set(opt, k[opt]);
    };
  } else {
    k = k.replace(/\s/g, '_');

    if (!this.opts.hasOwnProperty(k))
       return;

    switch(k) {
      case 'root':
        v = path.resolve(v);
        break;
      case 'from':
        v = !v ? '' : path.join(v, '.');
        break;
      case 'header':
      case 'dynamic_header':
        return this.setHeader(k, v);
        break;
      case 'max_age':
        v = typeof v === 'string' 
        ? expire.getSeconds(v) 
        : v;
        break;
      case 'cache':
        if (!v) break;
        var opts = typeof v === 'object' ? v : {};
        this.cache = Cache.createCache(opts);
        v = true;
        break;
      case 'redis_cache':
        if (!v) break;
        var opts = typeof v === 'object' ? v : {};
        opts.redis = true;
        this.cache = Cache.createCache(opts);
        v = true;
        break;
      case 'debug':
        !!v && Logger.createDebugger.call(this);
        break;
    };

    this.opts[k] = v;
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
    var map = {
      'string':'headers',
      'function':'dynamic_headers' 
    };
    var type = map[typeof val];
    if (!!type) this.get(type)[key] = val;
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

  var lactate = module.exports.dir(dir);
  return lactate.toMiddleware(options);
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
