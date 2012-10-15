// HTTP status code handlers

var path = require('path');

var codes = {
  200:'OK',
  304:'Not Modified',
  400:'Bad Request',
  403:'Forbidden',
  404:'Not Found',
  405:'Bad Method',
  500:'Internal Error'
};

var public = path.join.bind(this, __dirname, '../public');

function pageHandler(status, msg, send) {
  var page = public(status + '.html');
  var now = new Date().toUTCString();

  return function(filePath, req, res) {
    this.buildHeaders(page, now, req, res, status, send);
    this.debug(status, msg, filePath, req);
  }.bind(this);
};

module.exports = function(lactate) {

  var send = this.send.bind(this);

  this._200 = function(filePath, msg, req, res, headers) {
    var status = 200;
    res.writeHead(status, headers);
    this.debug(status, msg, filePath, req);
  };

  this._304 = function(filePath, req, res) {
    var status = 304;
    var msg = 'Not Modified';
    res.writeHead(status);
    res.end();
    this.debug(status, msg, filePath, req);
  };

  var __404 = pageHandler.call(this, 404, 'Bad Request', send);

  this._404 = function(filePath, req, res) {
    var handler = this.get('not_found');
    var status = 404;
    var msg = 'Not Found';

    switch(typeof(handler)) {
      case 'function':
        handler.call(this, req, res);
        break;
      case 'string':
        this.serve(handler, req, res, status);
        break;
      default:
        __404(filePath, req, res);
        break;
    };

    this.debug(status, msg, filePath, req);
  };

  this._400 = pageHandler.call(this, 400, 'Bad Request', send);
  this._403 = pageHandler.call(this, 403, 'Forbidden', send);
  this._405 = pageHandler.call(this, 405, 'Invalid Method', send);
  this._500 = pageHandler.call(this, 500, 'Internal Error', send);

};
