
//var should  = require('should');
//var Lactate = require('../lib/lactate');
//var http    = require('./utils/http_utils');
//var files   = require('./utils/get_files');
//
//describe('Range', function() {
//
//  const DIR = __dirname + '/files/';
//
//  afterEach(http.stopServer);
//
//  describe('#file(index.html) --bytes=0-9', function() {
//    it('Should not err', function(done) {
//      const file = 'index.html';
//      const headers = { 'range' : 'bytes=0-9' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        should.exist(res);
//        should.exist(data);
//        done();
//      })
//    })
//    it('Should have status 206', function(done) {
//      const file = 'index.html';
//      const headers = { 'range' : 'bytes=0-9' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        res.should.have.status(206)
//        should.exist(res);
//        should.exist(data);
//        done();
//      })
//    })
//    it('Should have content-type header', function(done) {
//      const file = 'index.html';
//      const headers = { 'range' : 'bytes=0-9' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        should.exist(res);
//        should.exist(data);
//        res.headers.should.have.property('content-type', 'text/html');
//        done();
//      })
//    })
//    it('Should have content-range header', function(done) {
//      const file = 'index.html';
//      const headers = { 'range' : 'bytes=0-9' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        should.exist(res);
//        should.exist(data);
//        res.headers.should.have.property('content-range', headers.range);
//        done();
//      })
//    })
//    it('Should serve complete data', function(done) {
//      const file = 'index.html';
//      const headers = { 'range' : 'bytes=0-9' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        should.exist(res);
//        should.exist(data);
//        data.should.have.property('length', 10);
//        done();
//      })
//    })
//  })
//
//  describe('#file(script.js) --bytes=0-19', function() {
//    it('Should not err', function(done) {
//      const file = 'script.js';
//      const headers = { 'range' : 'bytes=0-19' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        should.exist(res);
//        should.exist(data);
//        done();
//      })
//    })
//    it('Should have status 206', function(done) {
//      const file = 'script.js';
//      const headers = { 'range' : 'bytes=0-19' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        res.should.have.status(206)
//        should.exist(res);
//        should.exist(data);
//        done();
//      })
//    })
//    it('Should have content-type header', function(done) {
//      const file = 'script.js';
//      const headers = { 'range' : 'bytes=0-19' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        should.exist(res);
//        should.exist(data);
//        res.headers.should.have.property('content-type', 'text/javascript');
//        done();
//      })
//    })
//    it('Should have content-range header', function(done) {
//      const file = 'script.js';
//      const headers = { 'range' : 'bytes=0-19' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        should.exist(res);
//        should.exist(data);
//        res.headers.should.have.property('content-range', headers.range);
//        done();
//      })
//    })
//    it('Should serve complete data', function(done) {
//      const file = 'script.js';
//      const headers = { 'range' : 'bytes=0-19' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        should.exist(res);
//        should.exist(data);
//        data.should.have.property('length', 20);
//        done();
//      })
//    })
//  })
//
//  describe('#file(script.js) --bytes=malformed', function() {
//    it('Should not err', function(done) {
//      const file = 'script.js';
//      const headers = { 'range' : 'bytes=malformed' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        should.exist(res);
//        should.exist(data);
//        done();
//      })
//    })
//    it('Should have status 416', function(done) {
//      const file = 'script.js';
//      const headers = { 'range' : 'bytes=malformed' };
//      http.server(function(req, res) {
//        Lactate.file(file, req, res, { root:DIR });
//      })
//      http.client('/', 1, 'GET', headers, function(err, res, data) {
//        should.not.exist(err);
//        res.should.have.status(416)
//        should.exist(res);
//        should.exist(data);
//        done();
//      })
//    })
//  })
//})
//
