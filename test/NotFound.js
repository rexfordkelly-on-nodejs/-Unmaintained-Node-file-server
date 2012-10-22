
var should = require('should')
var Lactate = require('../lib/lactate')

var http = require('./utils/http_utils')
var files = require('./utils/get_files')

var DIR = __dirname + '/files/'

describe('Not Found', function() {

  afterEach(http.stopServer);

  describe('#set(not_found) --string', function() {
    it('Should not err', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', DIR + '404.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 404', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', DIR + '404.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(404);
        done()
      })
    })
    it('Should have content-type header', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', DIR + '404.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-type', 'text/html');
        done()
      })
    })
    it('Should have content-encoding header', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', DIR + '404.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-encoding', 'gzip');
        done()
      })
    })
    it('Should have content-length header', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', DIR + '404.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length');
        done()
      })
    })
    it('Should have date header', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', DIR + '404.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('date');
        done()
      })
    })
    it('Should not have last-modified header', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', DIR + '404.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.not.have.property('last-modified');
        done()
      })
    })
    it('Should not have cache-control header', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', DIR + '404.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.not.have.property('cache-control');
        done()
      })
    })
  })

  describe('#set(not_found) --string --non-existent', function() {
    it('Should not err', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', 'asdf.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 404', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', 'asdf.html');
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(404);
        done()
      })
    })
  })

  describe('#set(not_found) --function', function() {
    it('Should not err', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', function(req, res) {
        res.writeHead(404);
        res.end('test');
      });
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 404', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', function(req, res) {
        res.writeHead(404);
        res.end('test');
      });
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(404);
        done()
      })
    })
    it('Should respond with test string', function(done) {
      var dir = Lactate.dir(DIR);
      dir.set('not_found', function(req, res) {
        res.writeHead(404);
        res.end('test');
      });
      http.server(dir.toMiddleware());
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        data.should.equal('test');
        done()
      })
    })
  })
})

