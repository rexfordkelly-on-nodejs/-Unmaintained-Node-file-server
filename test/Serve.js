
var should = require('should')
var Lactate = require('../lib/lactate')

var http = require('./utils/http_utils')
var files = require('./utils/get_files')

var DIR = __dirname + '/files/'

describe('Serve', function() {
  afterEach(http.stopServer);

  describe('#serve(jquery.min.js)', function() {
    it('Should not err', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('jquery.min.js', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 200', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('jquery.min.js', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(200)
        done()
      })
    })
    it('Should have content-type header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('jquery.min.js', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-type')
        res.headers['content-type'].should.equal('application/javascript')
        done()
      })
    })
    it('Should have content-encoding header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('jquery.min.js', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-encoding')
        res.headers['content-encoding'].should.equal('gzip')
        done()
      })
    })
    it('Should have content-length header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('jquery.min.js', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length')
        done()
      })
    })
    it('Should have date header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('jquery.min.js', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('date')
        done()
      })
    })
    it('Should have last-modified header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('jquery.min.js', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('last-modified')
        done()
      })
    })
    it('Should have cache-control header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('jquery.min.js', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('cache-control')
        done()
      })
    })
    it('Should serve complete data', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('jquery.min.js', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        data.should.equal(files['jquery.min.js'])
        done()
      })
    })
  })

  describe('#serve(font-awesome.css)', function() {
    it('Should not err', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('font-awesome.css', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 200', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('font-awesome.css', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(200)
        done()
      })
    })
    it('Should have content-type header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('font-awesome.css', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-type')
        res.headers['content-type'].should.equal('text/css')
        done()
      })
    })
    it('Should have content-encoding header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('font-awesome.css', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-encoding')
        res.headers['content-encoding'].should.equal('gzip')
        done()
      })
    })
    it('Should have content-length header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('font-awesome.css', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length')
        done()
      })
    })
    it('Should have date header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('font-awesome.css', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('date')
        done()
      })
    })
    it('Should have last-modified header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('font-awesome.css', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('last-modified')
        done()
      })
    })
    it('Should have cache-control header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('font-awesome.css', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('cache-control')
        done()
      })
    })
    it('Should serve complete data', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('font-awesome.css', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        data.should.equal(files['font-awesome.css'])
        done()
      })
    })
  })

  describe('#serve(nodejs.jpeg)', function() {
    it('Should not err', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('nodejs.jpeg', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 200', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('nodejs.jpeg', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(200)
        done()
      })
    })
    it('Should have content-type header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('nodejs.jpeg', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-type')
        res.headers['content-type'].should.equal('image/jpeg')
        done()
      })
    })
    it('Should not have content-encoding header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('nodejs.jpeg', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.not.have.property('content-encoding')
        done()
      })
    })
    it('Should have content-length header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('nodejs.jpeg', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length')
        done()
      })
    })
    it('Should have date header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('nodejs.jpeg', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('date')
        done()
      })
    })
    it('Should have last-modified header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('nodejs.jpeg', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('last-modified')
        done()
      })
    })
    it('Should have cache-control header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('nodejs.jpeg', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('cache-control')
        done()
      })
    })
    it('Should serve complete data', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('nodejs.jpeg', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        data.should.equal(files['nodejs.jpeg'])
        done()
      })
    })
  })

  describe('#serve(asdf)', function() {
    it('Should not err', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status code 404', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(404)
        done()
      })
    })
    it('Should have content-type header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-type');
        res.headers['content-type'].should.equal('text/html');
        done()
      })
    });
    it('Should have content-length header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length');
        done()
      })
    });
    it('Should have date header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('date');
        done()
      })
    });
  })

  describe('#serve(.asdf) --no-hidden', function() {
    it('Should not err', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR,
        hidden:false
      })
      http.server(function(req, res) {
        lactate.serve('.asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 403', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('.asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(403)
        done()
      })
    })
    it('Should have content-type header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('.asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-type');
        res.headers['content-type'].should.equal('text/html');
        done()
      })
    });
    it('Should have content-length header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('.asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length');
        done()
      })
    });
    it('Should have date header', function(done) {
      var lactate = Lactate.Lactate({
        root:DIR
      })
      http.server(function(req, res) {
        lactate.serve('.asdf', req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('date');
        done()
      })
    });
  });

  describe('#serve(files/jquery.min.js) --no-subdirs', function() {
    it('Should not err', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 403', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname,
        subdirs:false
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(403)
        done()
      })
    })
    it('Should have content-type header', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname,
        subdirs:false
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-type');
        res.headers['content-type'].should.equal('text/html');
        done()
      })
    });
    it('Should have content-length header', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname,
        subdirs:false
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length');
        done()
      })
    });
    it('Should have date header', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname,
        subdirs:false
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('date');
        done()
      })
    });
  });

  describe('#serve(files/jquery.min.js) --using-POST', function() {
    it('Should not err', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        done()
      })
    })
    it('Should have status 405', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        res.should.have.status(405);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname,
        subdirs:false
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-type');
        res.headers['content-type'].should.equal('text/html');
        done()
      })
    });
    it('Should have content-length header', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname,
        subdirs:false
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length');
        done()
      })
    });
    it('Should have date header', function(done) {
      var lactate = Lactate.Lactate({
        root:__dirname,
        subdirs:false
      })
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client('/files/jquery.min.js', 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('date');
        done()
      })
    });
  })
});
