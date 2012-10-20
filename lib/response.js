// Default response handlers 
// for non-200 status codes

var path = require('path');

module.exports = function(lactate) {

  var pubPath = path.join.bind(this, __dirname, '../public');

  var pageHandler = function(status, page) {
    page = page || pubPath(status + '.html');
    function fn(fp, req, res) {
      var now = new Date().getTime();
      if (!!this.get('error_pages')) {
        var cached = this.getCache(page);
        this.complete(page, req, res, status, cached, now);
      }else {
        res.writeHead(status);
        res.end();
        this.ev(status, fp, req);
      };
    };
    return fn.bind(this);
  }.bind(this);

  this._304 = function(fp, req, res) {
    var status = 304;
    res.writeHead(status);
    res.end();
    this.ev(status, fp, req);
  };

  var __404 = pageHandler(404);

  this._404 = function(fp, req, res) {
    var handler = this.get('not_found');
    var status = 404;
    switch(typeof(handler)) {
      case 'string':
        pageHandler(status, handler)(fp, req, res);
        break;
      case 'function':
        handler.call(this, req, res);
        this.ev(status, fp, req);
      default:
        __404(fp, req, res);
        break;
    };
  };

  this._400 = pageHandler(400);
  this._403 = pageHandler(403);
  this._405 = pageHandler(405);
  this._500 = pageHandler(500);

};
