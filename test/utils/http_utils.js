
var Suckle = require('suckle')
var http = require('http')
var port = 7279
var _server = null

module.exports.stopServer = function(cb) {
  if (_server) {
    _server.close(cb);
  }else {
    cb();
  };
};

module.exports.server = function(cb) {
  _server = new http.Server();
  _server.addListener('request', cb);
  _server.listen(port);
};

module.exports.client = function(path, cb, times, method) {
  var args = Array.prototype.slice.call(arguments), cb;
  var path = args.shift();
  var lastArg = args[args.length-1];
  if (typeof(lastArg) === 'function') {
    cb = args.pop();
  };
  var times = args.shift() || 1;
  var method = args.shift() || 'GET';

  var options = {
    host:'localhost',
    port:port,
    path:path,
    method:method,
    headers:{}
  };

  var cacheHeaders = [ 
    'last-modified',
    'cache-control'
  ];

  var hasCacheHeaders = function(headers) {
    return cacheHeaders.every(function(header) {
      return !!headers[header];
    });
  };

  ;(function next(i) {
    var req = http.request(options, function(res) {
      var headers = res.headers;
      if (hasCacheHeaders(headers)) {
        var lm = headers['last-modified'];
        options.headers['if-modified-since'] = lm;
      };

      var suckle = new Suckle(function(data) {
        if (--i) {
          next(i);
        } else {
          cb(null, res, data.toString());
        };
      })

      res.pipe(suckle);
      res.on('error', cb);
    });
    req.end();
  })(times);
};
