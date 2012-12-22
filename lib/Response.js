/* Response handlers */

var fs = require('fs');
var path = require('path');
var FileRequest = require('./FileRequest');

module.exports = function Responses() {

  var pubPath = path.join.bind(this, __dirname, '../public');
  var exists = fs.existsSync || path.existsSync;

  function _createPageHandler(status, page) {
    page = page || pubPath(status + '.html');
    var _exists = exists(page);

    return function pageHandler(fp, req, res) {
      var servePage = _exists && this._get('error_pages');

      var request = new FileRequest(page, req, res, status)

      if (!servePage) {
        res.writeHead(status);
        res.end();
        this.emit(status, request);
        return;
      };

      request.init(this);

      this.serveFile(request);

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
    this.emit(status, new FileRequest(fp, req, res));
  };

  Object.defineProperty(this, '_416', attr);

  attr.value = createPageHandler(500);
  Object.defineProperty(this, '_500', attr);

  attr.value = function _304Handler(fp, req, res) {
    var status = 304;
    res.writeHead(status);
    res.end();
    this.emit(status, new FileRequest(fp, req, res));
  };

  Object.defineProperty(this, '_304', attr);

  var __404 = createPageHandler(404);

  attr.value = function _404Handler(fp, req, res) {
    var handler = this._get('not_found');
    var status = 404;
    switch(typeof handler) {
      case 'string':
        createPageHandler(status, handler)(fp, req, res);
        break;
      case 'function':
        handler.call(this, req, res);
        this.emit(status, new FileRequest(fp, req, res));
        break;
      default:
        __404(fp, req, res);
        break;
    };
  };

  Object.defineProperty(this, '_404', attr);

};
