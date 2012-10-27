
var should  = require('should');
var Lactate = require('../lib/lactate');
var http    = require('./utils/http_utils');
var files   = require('./utils/get_files');

describe('File', function() {

  const DIR = __dirname + '/files/';

  afterEach(http.stopServer);

  describe('#file(index.html)', function() {
    const file = 'index.html';
    const size = files[file];

    it('Should not err', function(done) {
      http.server(function(req, res) {
        Lactate.file(file, req, res, { root:DIR });
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should have status 200', function(done) {
      http.server(function(req, res) {
        Lactate.file(file, req, res, { root:DIR });
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(200)
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        Lactate.file(file, req, res, { root:DIR });
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-type', 'text/html');
        done();
      })
    })
    it('Should have content-encoding header', function(done) {
      http.server(function(req, res) {
        Lactate.file(file, req, res, { root:DIR });
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-encoding', 'gzip');
        done();
      })
    })
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        Lactate.file(file, req, res, { root:DIR });
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-length', String(size));
        done();
      })
    })
    it('Should have date header', function(done) {
      http.server(function(req, res) {
        Lactate.file(file, req, res, { root:DIR });
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('date');
        done();
      })
    })
    it('Should have last-modified header', function(done) {
      http.server(function(req, res) {
        Lactate.file(file, req, res, { root:DIR });
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('last-modified')
        done();
      })
    })
    it('Should have cache-control header', function(done) {
      http.server(function(req, res) {
        Lactate.file(file, req, res, { root:DIR });
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('cache-control');
        done();
      })
    })
    it('Should serve complete data', function(done) {
      http.server(function(req, res) {
        Lactate.file(file, req, res, { root:DIR });
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        data.should.have.property('length', size);
        done();
      })
    })
  })
})

