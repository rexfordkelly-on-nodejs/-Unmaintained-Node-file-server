
var should  = require('should');
var Lactate = require('../lib/lactate');
var http    = require('./utils/http_utils');
var files   = require('./utils/get_files');

describe('Cache', function() {

  const DIR = __dirname + '/files/';

  afterEach(http.stopServer);

  describe('#cache:{}', function() {
    const options = { cache:{} };
    const dir = Lactate.dir(DIR, options);
    const file = 'index.html';
    const size = files[file];
    const url = '/' + file;

    it('Should not err', function(done) {
      http.server(dir.serve.bind(dir));
      http.client(url, 10, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should serve cached file', function(done) {
      http.server(dir.serve.bind(dir));
      http.client(url, 10, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(200)
        res.headers.should.have.property('content-type', 'text/html');
        res.headers.should.have.property('content-encoding', 'gzip')
        res.headers.should.have.property('content-length', String(size));
        res.headers.should.have.property('date')
        res.headers.should.have.property('last-modified')
        res.headers.should.have.property('cache-control');
        data.should.have.property('length', size);
        done();
      })
    })
  })
  
  describe('#cache:{expire:0}', function() {
    const options = { cache:{ expire:0 } };
    const dir = Lactate.dir(DIR, options);
    const file = 'index.html';
    const size = files[file];
    const url = '/' + file;

    it('Should not err', function(done) {
      http.server(dir.serve.bind(dir));
      http.client(url, 10, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should serve cached file', function(done) {
      http.server(dir.serve.bind(dir));
      http.client(url, 10, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(200)
        res.headers.should.have.property('content-type', 'text/html');
        res.headers.should.have.property('content-encoding', 'gzip')
        res.headers.should.have.property('content-length', String(size));
        res.headers.should.have.property('date')
        res.headers.should.have.property('last-modified')
        res.headers.should.have.property('cache-control');
        data.should.have.property('length', size);
        done();
      })
    })
  })

  describe('#cache:{max_keys:0}', function() {
    const options = { cache:{ max_keys:0 } };
    const dir = Lactate.dir(DIR, options);
    const file = 'index.html';
    const size = files[file];
    const url = '/' + file;

    it('Should not err', function(done) {
      http.server(dir.serve.bind(dir));
      http.client(url, 10, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should serve cached file', function(done) {
      http.server(dir.serve.bind(dir));
      http.client(url, 10, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(200)
        res.headers.should.have.property('content-type', 'text/html');
        res.headers.should.have.property('content-encoding', 'gzip')
        res.headers.should.have.property('content-length', String(size));
        res.headers.should.have.property('date')
        res.headers.should.have.property('last-modified')
        res.headers.should.have.property('cache-control');
        data.should.have.property('length', size);
        done();
      })
    })
  })

  describe('#cache:{max_size:0}', function() {
    const options = { cache:{ max_size:0 } };
    const dir = Lactate.dir(DIR, options);
    const file = 'index.html';
    const size = files[file];
    const url = '/' + file;

    it('Should not err', function(done) {
      http.server(dir.serve.bind(dir));
      http.client(url, 10, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should serve cached file', function(done) {
      http.server(dir.serve.bind(dir));
      http.client(url, 10, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(200)
        res.headers.should.have.property('content-type', 'text/html');
        res.headers.should.have.property('content-encoding', 'gzip')
        res.headers.should.have.property('content-length', String(size));
        res.headers.should.have.property('date')
        res.headers.should.have.property('last-modified')
        res.headers.should.have.property('cache-control');
        data.should.have.property('length', size);
        done();
      })
    })
  })
})

