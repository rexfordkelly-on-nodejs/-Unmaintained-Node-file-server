
/**
 * Directory methods:
 *
 * #toMiddleware(options)
 * #serveIndex()
 * #bundle(file extension or array, name, callback)
 * #bundleJS(name, callback)
 * #bundleCSS(name, callback)
 */

var fs          = require('fs');
var path        = require('path');
var abridge     = require('abridge');
var FileRequest = require('./FileRequest');

module.exports = Directory;

function Directory() {

  var self = this;
  var root = this.get('root');
  var appendRoot = path.join.bind(this, root);

  function filterFiles(type) {
    var re = new RegExp(['.', '$'].join(type));
    var filter = re.test.bind(re);
    return fs.readdirSync(root).filter(filter).map(appendRoot);
  };

  this.toMiddleware = function toMiddleware(options) {
    if (options) this.set(options);
    var self = this;

    function middleware() {
      self.serve.apply(self, arguments);
    };

    return middleware;
  };
  
  this.serveIndex = function(fp, req, res, error) {
    var self = this;
    var hidden = this._get('hidden');
    var root = this._get('root');
    var basePath = fp.substring(root.length) || '/';
    var lastSlash = basePath.lastIndexOf('/');
    var parent = basePath.slice(0, lastSlash) || '/';

    function readCB(err, files) {
      if (err) return error(404);

      function el(type, text, attrs) {
        text = text || '';
        attrs = attrs || '';
        var open = '<' + type + ' ' + attrs + '>';
        var close = '</' + type + '>';
        return [open, close].join(text);
      };

      var items = files.sort();

      // Filter hidden files
      if (!self._get('hidden')) {
        items = items.filter(function(filePath) {
          return !self.isHidden(filePath);
        });
      };

      items = items.map(function(filePath) {
        var href = path.join(basePath, filePath);
        href = 'href="' + href + '"';
        return '<li>'
        + '<a href="' + href + '">'
        + filePath
        + '</a>';
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

    fs.stat(fp, statCallback);

    function statCallback(err, stat) {
      if (err || !stat.isDirectory()) {
        error(404);
      } else {
        process.nextTick(function() {
          fs.readdir(fp, readCallback);
        });
      };
    };

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
