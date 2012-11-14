// Default response handlers 
// for non-200 status codes

var fs = require('fs');
var path = require('path');

module.exports = function Responses() {

  var pubPath = path.join.bind(this, __dirname, '../public');
  var exists = fs.existsSync || path.existsSync;

  function _createPageHandler(status, page) {
    page = page || pubPath(status + '.html');
    var _exists = exists(page);
    return function pageHandler(fp, req, res) {
      var servePages = this.get('error_pages');
      if (servePages && _exists) {
        this.serveFile(page, req, res,status);
      } else {
        res.writeHead(status);
        res.end();
        this.ev(status, fp, req);
      };
    }.bind(this);
  };

  var createPageHandler = _createPageHandler.bind(this);
  var attr = { enumerable:false };

  attr.value = createPageHandler(400);
  Object.defineProperty(this, '_400', attr);

  attr.value = createPageHandler(403);
  Object.defineProperty(this, '_403', attr);

  attr.value = createPageHandler(405);
  Object.defineProperty(this, '_405', attr);

  attr.value = function(fp, req, res) {
    var status = 416;
    res.writeHead(status);
    res.end();
    this.ev(status, fp, req);
  };

  Object.defineProperty(this, '_416', attr);

  attr.value = createPageHandler(500);
  Object.defineProperty(this, '_500', attr);

  attr.value = function _304Handler(fp, req, res) {
    var status = 304;
    res.writeHead(status);
    res.end();
    this.ev(status, fp, req);
  };

  Object.defineProperty(this, '_304', attr);

  var __404 = createPageHandler(404);

  attr.value = function _404Handler(fp, req, res) {
    var handler = this.get('not_found');
    var status = 404;
    switch(typeof handler) {
      case 'string':
        createPageHandler(status, handler)(fp, req, res);
        break;
      case 'function':
        handler.call(this, req, res);
        this.ev(status, fp, req);
        break;
      default:
        __404(fp, req, res);
        break;
    };
  };

  Object.defineProperty(this, '_404', attr);

};
