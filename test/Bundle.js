
var should = require('should')
var Lactate = require('../lib/lactate')

var http = require('./utils/http_utils')
var files = require('./utils/get_files')

var DIR = __dirname + '/files/'
var fs = require('fs');

describe('Bundle', function() {

  afterEach(http.stopServer);
  afterEach(fs.unlink.bind(this, DIR + 'common.js'));

  describe('#bundle(js)', function() {
    it('Should bundle', function(done) {
      var dir = Lactate.dir(DIR);
      dir.disable('max_age');
      http.server(dir.toMiddleware());
      dir.bundle('js', 'common.js', function(err, data) {
        should.not.exist(err);
        should.exist(data.toString());
        http.client('/common.js', 2, function(err, res, data) {
          should.not.exist(err);
          should.exist(data);
          res.should.have.status(200);
          res.headers.should.have.property('content-type');
          res.headers.should.have.property('content-encoding');
          res.headers.should.have.property('content-length');
          res.headers.should.have.property('date');
          res.headers.should.have.property('last-modified');
          res.headers.should.have.property('cache-control');
          done();
        });
      });
    })
  })

})
