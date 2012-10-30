
/**
 * Directory methods:
 * #toMiddleware(options)
 * #serveIndex()
 * #bundle(file extension or array, name, callback)
 * #bundleJS(name, callback)
 * #bundleCSS(name, callback)
 */

const fs      = require('fs');
const path    = require('path');
const abridge = require('abridge');

module.exports = function Directory() {

  const root = this.get('root');
  const bundle = this.get('bundle');
  const appendRoot = path.join.bind(this, root);

  var filterFiles = function filterFiles(type) {
    var re = new RegExp(['.', '$'].join(type));
    var filter = re.test.bind(re);
    return fs.readdirSync(root).filter(filter).map(appendRoot);
  };

  this.toMiddleware = function toMiddleware(options) {
    if (options) this.set(options);

    const public  = this.get('from') || '';
    const subdirs = this.get('subdirs');
    const publen  = public.length;

    function middleware(req, res, next) {
      var url = req.url
      var basename = path.dirname(url).substring(1);
      var sub = basename.substring(0, publen);

      if (basename === public || (subdirs && sub === public)) {
        this.serve(req, res);
      }else if (next) {
        next();
      }else {
        this._403(url, req, res);
      };

    };

    return middleware.bind(this);
  };
  
  this.serveIndex = function(fp, req, res) {
    var _fp = fp.slice(root.length) || '/';

    if (!this.get('subdirs') 
        && fp.length > root.length) {
      return this._403(fp, req, res);
    };

    function readCB(err, files) {
      if (err) return _404(fp, req, res);

      var parent = _fp.slice(0, _fp.lastIndexOf('/')) || '/';

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

      files = files.sort()
      .filter(preventHidden)
      .map(function(file) {
        var href = path.join(_fp, file);
        href = 'href="' + href + '"';
        var anchor = el('a', file, href);
        return el('li', anchor);
      });

      if (_fp !== '/') {
        var href = 'href="' + parent + '"';
        files.unshift(el('a', 'Parent directory', href));
      };

      var content = '<!doctype html>'
      + '<html>'
      + '<head>'
      + '<title>Index for ' + _fp + '</title>'
      + '</head>'
      + '<body>'
      + el('h1', 'Index of ' + _fp)
      + el('ul', files.join(''));
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
        this._404(fp, req, res);
      }else {
        var _cb = readCB.bind(this);
        var _nt = fs.readdir.bind(this, fp, _cb);
        process.nextTick(_nt);
      };
    };

    fs.stat(fp, statCallback.bind(this));
  };

  var rebundle = this.get('rebundle');
  this.bundle = function bundle(type, name, cb) {
    name = (typeof(name) === 'string')
      ? name.replace(/\.\w+$/, '')
      : 'common';

    name = [name, type].join('.');

    var location = appendRoot(name);
    var files = Array.isArray(type)
    ? type.map(appendRoot)
    : filterFiles(type);

    files = files.filter(function(i) {
      return i !== location;
    });

    var watch = function(file) {
      function watchCallback(ev) {
        if (ev === 'change')
          abridge.minify(files, location);
      };
      fs.watch(file, watchCallback);
    };

    function minifyCallback(err, data) {
      if (!err && rebundle)
        files.forEach(watch);
      typeof cb === 'function' 
      && cb(err, data);
    };

    abridge.minify(files, location, minifyCallback);
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

  return this;
  
};
