
var should = require('should')
var Lactate = require('../lib/lactate')

var http = require('./utils/http_utils')
var files = require('./utils/get_files')

var DIR = __dirname + '/files/'

describe('File', function() {

  afterEach(http.stopServer);

  describe('#file(jquery.min.js)', function() {
    it('Should not err', function(done) {
      http.server(function(req, res) {
        Lactate.file('jquery.min.js', req, res, {
          root:DIR
        })
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 200', function(done) {
      http.server(function(req, res) {
        Lactate.file('jquery.min.js', req, res, {
          root:DIR
        })
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(200)
        done()
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        Lactate.file('jquery.min.js', req, res, {
          root:DIR
        })
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-type')
        res.headers['content-type'].should.equal('application/javascript')
        done()
      })
    })
    it('Should have content-encoding header', function(done) {
      http.server(function(req, res) {
        Lactate.file('jquery.min.js', req, res, {
          root:DIR
        })
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-encoding')
        res.headers['content-encoding'].should.equal('gzip')
        done()
      })
    })
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        Lactate.file('jquery.min.js', req, res, {
          root:DIR
        })
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length')
        done()
      })
    })
    it('Should have date header', function(done) {
      http.server(function(req, res) {
        Lactate.file('jquery.min.js', req, res, {
          root:DIR
        })
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('date')
        done()
      })
    })
    it('Should have last-modified header', function(done) {
      http.server(function(req, res) {
        Lactate.file('jquery.min.js', req, res, {
          root:DIR
        })
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('last-modified')
        done()
      })
    })
    it('Should have cache-control header', function(done) {
      http.server(function(req, res) {
        Lactate.file('jquery.min.js', req, res, {
          root:DIR
        })
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('cache-control')
        done()
      })
    })
    it('Should serve complete data', function(done) {
      http.server(function(req, res) {
        Lactate.file('jquery.min.js', req, res, {
          root:DIR
        })
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        data.should.equal(files['jquery.min.js'])
        done()
      })
    })
  })
})

