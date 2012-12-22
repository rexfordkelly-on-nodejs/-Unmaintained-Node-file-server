var util = require('util');
var events = require('events');

/**
 * File request
 *
 * @constructor FileRequest
 * @param {String} filePath
 * @param {HTTPRequest} req
 * @param {HTTPResponse} res
 * @param {Number} status
 */

function FileRequest(fp, req, res, status, url, dir) {
  this.req = req;
  this.res = res;
  this.fp = fp;
  this.url = url;
  this.dir = dir;
  this.status = status || 200;
};

util.inherits(FileRequest, events.EventEmitter);

FileRequest.prototype.init = function(self) {

  var request = this;

  request.on('stat', function onStat(stat) {
    var mtime = stat.mtime.toUTCString();
    self.complete.call(self, request, null, mtime);

    // Watch file for updates
    if (self._get('watch_files')) {
      self.watchFile(request.fp);
    };

    self.emit('request stat', request);
  });

  request.on('cached', function onCached(cached) {
    var mtime = cached.headers['Last-Modified'];
    self.complete.call(self, request, cached, mtime);
    self.emit('request cached', request);
  });

  request.on('send', function onSend() {
    var method = request.req.method === 'HEAD' 
    ? 'head' 
    : 'send';

    // Build response headers
    self.buildHeaders(request);

    // Finish the request
    self[method].call(self, request);
    self.emit('request send');
  });

  request.on('done', function() {
    self.emit('request complete', request);
    request.removeAllListeners();
  });
};

module.exports = FileRequest;
