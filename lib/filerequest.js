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

function FileRequest(filePath, req, res, status) {
  this.fp = filePath;
  this.req = req;
  this.res = res;
  this.status = status || 200;
};

util.inherits(FileRequest, events.EventEmitter);

module.exports = FileRequest;
