
var should = require('should')
var Lactate = require('../lib/lactate')

var http = require('./utils/http_utils')
var files = require('./utils/get_files')

var DIR = __dirname + '/files/'
var fs = require('fs');

describe('Bundle', function() {

  afterEach(http.stopServer);

  describe('#bundle(js)', function() {
    it('Should bundle', function(done) {
      var dir = Lactate.dir(DIR);
      dir.bundle('js', 'common.js', function(err, data) {
        should.not.exist(err);
        should.exist(data.toString());
        done();
      });
    })
  })

})
