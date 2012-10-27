
var should  = require('should')
var Lactate = require('../lib/lactate')
var http    = require('./utils/http_utils')
var files   = require('./utils/get_files')

describe('Expires', function() {

  const DIR = __dirname + '/files/'

  afterEach(http.stopServer);

  describe('#serve(index.html)', function() {
    const lactate = Lactate.Lactate({ root:DIR, max_age:'two days' });
    const file = 'index.html';
    const size = files[file];

    it('Should not err', function(done) {
      http.server(lactate.serve.bind(lactate, file));
      http.client('/', 2, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      });
    })
    it('Should have status 304', function(done) {
      http.server(lactate.serve.bind(lactate, file));
      http.client('/', 2, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(304);
        done();
      })
    })
    it('Should respond with no data', function(done) {
      http.server(lactate.serve.bind(lactate, file));
      http.client('/', 2, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        data.should.have.property('length', 0);
        done();
      })
    })
  })
})
