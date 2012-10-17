// HTTP status code handlers

var path = require('path');

function pageHandler(status, msg) {
  var page = path.join(__dirname, '../public', status + '.html');
  var now = new Date().getTime();
  function fn(filePath, req, res) {
    var cached = this.getCache(page);
    this.complete(page, req, res, status, cached, now);
  };
  return fn.bind(this);
};

module.exports = function(lactate) {

  this._304 = function(filePath, req, res) {
    var status = 304;
    res.writeHead(status);
    res.end();
    this.ev(status, filePath, req);
  };

  var __404 = pageHandler.call(this, 404, 'Not Found');
  this._404 = function(filePath, req, res) {
    var handler = this.get('not_found');
    var status = 404;
    switch(typeof(handler)) {
      case 'string':
        this.serve(handler, req, res, status);
        break;
      default:
        __404(filePath, req, res);
        break;
    };
  };

  this._400 = pageHandler.call(this, 400, 'Bad Request');
  this._403 = pageHandler.call(this, 403, 'Forbidden');
  this._405 = pageHandler.call(this, 405, 'Invalid Method');
  this._500 = pageHandler.call(this, 500, 'Internal Error');

};
