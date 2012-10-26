
/**
 * Directory methods:
 * #toMiddleware(options)
 * #bundle(file extension or array, name, callback)
 * #bundleJS(name, callback)
 * #bundleCSS(name, callback)
 */

var fs      = require('fs');
var path    = require('path');
var abridge = require('abridge');

module.exports = function Directory() {

  var root = this.get('root');
  var appendRoot = path.join.bind(this, root);

  var filterFiles = function filterFiles(type) {
    var re = new RegExp(['.', '$'].join(type));
    var filter = re.test.bind(re);
    return fs.readdirSync(root).filter(filter).map(appendRoot);
  };

  this.toMiddleware = function toMiddleware(options) {
    if (options) this.set(options);

    var public  = this.get('from') || '';
    var subdirs = this.get('subdirs');
    var publen  = public.length;

    var middleware = function middleware(req, res, next) {
      var url = req.url
      var basename = path.dirname(url).substring(1);
      var sub = basename.substring(0, publen);

      if (basename === public || (subdirs && sub === public)) {
        this.serve(req, res);
      }else if (next) {
        next();
      }else {
        this._404(res, url);
      };

    }.bind(this);

    return middleware;
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


  var bundle = this.get('bundle');
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
