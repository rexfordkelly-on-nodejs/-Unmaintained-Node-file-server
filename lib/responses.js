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

function ConData(filePath, msg, req) {
  this.filePath = filePath;
  this.msg = msg;
  this.url = req.url;
  this.method = req.method;
  this.headers = req.headers;
  this.address = req.connection.remoteAddress;
  this.port = req.connection.remotePort;
};

function pageHandler(status, msg) {
  var page = path.join(__dirname, '../public', status + '.html');
  var now = new Date().toUTCString();
  var headers = {
    'Content-Type':'text/html'
  };

  return function(filePath, req, res) {
    this.send(page, headers, req, res, status);
    var con = new ConData(filePath, msg, req);
    var emit = this.emit.bind(this, status, con);
    process.nextTick(emit);
  }.bind(this);
};

module.exports = function(lactate) {

  this.codes = codes;

  this._200 = function(filePath, msg, req, res, headers) {
    var status = 200;
    res.writeHead(status, headers);
    var con = new ConData(filePath, msg, req);
    var emit = this.emit.bind(this, status, con);
    process.nextTick(emit);
  };

  this._304 = function(filePath, req, res) {
    var status = 304;
    var msg = 'Not Modified';
    res.writeHead(status);
    res.end();
    process.nextTick(function(ev) {
      var con = new ConData(filePath, msg, req);
      this.emit(status, con);
    }.bind(this));
  };

  var __404 = pageHandler.call(this, 404, 'Not Found');

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

    process.nextTick(function() {
      var con = new ConData(filePath, msg, req);
      this.emit(status, con);
    }.bind(this));
  };

  this._400 = pageHandler.call(this, 400, 'Bad Request');
  this._403 = pageHandler.call(this, 403, 'Forbidden');
  this._405 = pageHandler.call(this, 405, 'Invalid Method');
  this._500 = pageHandler.call(this, 500, 'Internal Error');

  // Attach listeners for debug
  if (this.get('debug')) {
    var listen = function(status) {
      var self = this;
      this.on(status, function(ev) {
        self.log(status, ev.msg, ev.filePath);
      });
    }.bind(this);

    Object.keys(codes).forEach(listen);
  };

};
