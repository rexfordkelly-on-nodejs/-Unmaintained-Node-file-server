
/**
 * Directory methods:
 *
 * #toMiddleware(options)
 * #serveIndex()
 * #bundle(file extension or array, name, callback)
 * #bundleJS(name, callback)
 * #bundleCSS(name, callback)
 */

var fs = require('fs');
var path = require('path');
var abridge = require('abridge');
var FileRequest = require('./FileRequest');

module.exports = function Directory() {

  var self = this;
  var root = this.get('root');
  var appendRoot = path.join.bind(this, root);

  function filterFiles(type) {
    var re = new RegExp(['.', '$'].join(type));
    var filter = re.test.bind(re);
    return fs.readdirSync(root)
      .filter(filter)
      .map(appendRoot);
  };

  this.toMiddleware = function toMiddleware(options) {
    if (options) this.set(options);

    function middleware(req, res, next) {
      var subdirs = this._get('subdirs');
      var root    = this._get('root');
      var from    = this._get('from');
      var len     = from.length;
      var dir     = from, url, fp;

      url = this.parseURL(req.url);
      dir = path.dirname(url);
      fp = path.join(root, url.slice(len));

      var request = new FileRequest(
        fp, req, res, null, url, dir
      );

      var error, hasNext = typeof next === 'function';

      if (hasNext) {
        error = next.bind(this, null);
      } else {
        error = errorHandler.bind(this, request);
        function errorHandler(request, status) {
          this['_' + status](request);
        };
      };

      if (url.indexOf(from) !== 0) {
        return error(403);
      };

      if (!subdirs && dir !== from) {
        return error(403);
      };

      request.once('error', error);

      // Serve file
      this.serveFile(request);
    };

    return middleware.bind(this);
  };
  
  this.serveIndex = function(fp, req, res, error) {
    var _fp = fp.slice(root.length) || '/';

    function readCB(err, files) {
      if (err) return error(404);

      var lastSlash = _fp.lastIndexOf('/');
      var parent = _fp.slice(0, lastSlash) || '/';

      function el(type, text, attrs) {
        text = text || '';
        attrs = attrs || '';
        var open = '<' + type + ' ' + attrs + '>';
        var close = '</' + type + '>';
        return [open, close].join(text);
      };

      var preventHidden = this.get('hidden')
      ? function() { return true }
      : function noHidden(file) {
        return file[0] !== '.';
      };

      var items = files.sort()
      .filter(preventHidden)
      .map(function(file) {
        var href = path.join(_fp, file);
        href = 'href="' + href + '"';
        var anchor = el('a', file, href);
        return el('li', anchor);
      });

      if (_fp !== '/') {
        var href = 'href="' + parent + '"';
        items.unshift(el('a', 'Parent directory', href));
      };

      var content = '<!doctype html>'
      + '<html>'
      + '<head>'
      + '<title>Index of ' + _fp + '</title>'
      + '<link rel="icon" href="about:config"/>'
      + '</head>'
      + '<body>'
      + el('h1', 'Index of ' + _fp)
      + el('ul', items.join(''));
      + '</body>'
      + '</html>';

      var headers = {
        'Content-Type':'text/html',
        'Content-Length':content.length
      };

      res.writeHead(200, headers);
      res.end(content);
    };

    function statCallback(err, stat) {
      if (err || !stat.isDirectory()) {
        error(404);
      }else {
        var _cb = readCB.bind(this);
        process.nextTick(function() {
          fs.readdir(fp, _cb);
        });
      };
    };

    fs.stat(fp, statCallback.bind(this));
  };

  var bundle = this.get('bundle');
  var rebundle = this.get('rebundle');
  
  this.bundle = function bundle(type, name, cb) {

    var name = [
      typeof name === 'string' 
      ? name.replace(/\.\w+$/, '') 
      : 'common',
      type 
    ].join('.');

    var location = appendRoot(name);

    var files = (
      Array.isArray(type)
    ? type.map(appendRoot)
    : filterFiles(type)
    ).filter(function(file) {
      return file !== location;
    });

    if (!files.length) return;

    var watch = function(file) {
      fs.watch(file, watchCallback);
      function watchCallback(ev) {
        if (ev === 'change') {
          var min = abridge.minify(files);
          min.pipe(fs.createWriteStream(location));
        };
      };
    };

    var min = abridge.minify(files, minifyCallback)
    min.pipe(fs.createWriteStream(location));

    function minifyCallback(err, data) {
      if (!err && rebundle) {
        files.forEach(watch);
      };
      if (typeof cb === 'function') {
        cb(err, data);
      };
    };

  };

  this.bundleJS = this.bundle.bind(this, 'js');
  this.bundleCSS = this.bundle.bind(this, 'css');

  switch(typeof(bundle)) {
    case 'boolean':
      if (!bundle) break;
      this.bundleJS(bundle);
      this.bundleCSS(bundle);
      break;
    case 'string':
      this.bundle.call(this, bundle);
      break;
  };
  
};
