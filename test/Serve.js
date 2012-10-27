
var should = require('should');
var Lactate = require('../lib/lactate');
var http = require('./utils/http_utils');
var files = require('./utils/get_files');

describe('Serve', function() {

  const DIR = __dirname + '/files/';

  afterEach(http.stopServer);

  describe('#serve(index.html)', function() {
    const lactate = Lactate.Lactate({ root:DIR });
    const file = 'index.html';
    const size = files[file];

    it('Should not err', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      });
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should have status 200', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(200);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-encoding', 'gzip')
        done()
      })
    })
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res)
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
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('last-modified');
        done();
      })
    })
    it('Should have cache-control header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
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

  describe('#serve(landing%20page.html)', function() {
    const lactate = Lactate.Lactate({ root:DIR });
    const file = 'landing page.html';
    const size = files[file];
    const url = '/landing%20page.html';

    it('Should not err', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      });
      http.client(url, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should have status 200', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client(url, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(200);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(url, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-type', 'text/html');
        done();
      })
    })
    it('Should have content-encoding header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(url, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-encoding', 'gzip')
        done()
      })
    })
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client(url, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-length', String(size));
        done();
      })
    })
    it('Should have date header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(url, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('date');
        done();
      })
    })
    it('Should have last-modified header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(url, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('last-modified');
        done();
      })
    })
    it('Should have cache-control header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(url, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('cache-control');
        done();
      })
    })
    it('Should serve complete data', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(url, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        data.should.have.property('length', size);
        done();
      })
    })
  })

  describe('#serve(script.js)', function() {
    const lactate = Lactate.Lactate({ root:DIR });
    const file = 'script.js';
    const size = files[file];

    it('Should not err', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      });
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should have status 200', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(200);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-type', 'application/javascript');
        done();
      })
    })
    it('Should have content-encoding header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-encoding', 'gzip')
        done()
      })
    })
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res)
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
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('last-modified');
        done();
      })
    })
    it('Should have cache-control header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
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

  describe('#serve(style.css)', function() {
    const lactate = Lactate.Lactate({ root:DIR });
    const file = 'style.css';
    const size = files[file];

    it('Should not err', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(200);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-type', 'text/css');
        done();
      })
    })
    it('Should have content-encoding header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res)
      });
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-encoding', 'gzip');
        done();
      });
    });
    it('Should have content-length header', function(done) {
      var file = 'style.css';
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      });
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-length', String(size));
        done();
      });
    })
    it('Should have date header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('last-modified');
        done();
      })
    })
    it('Should have cache-control header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
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

  describe('#serve(test.png)', function() {
    const lactate = Lactate.Lactate({ root:DIR });
    const file = 'test.png';
    const size = files[file];

    it('Should not err', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done()
      })
    })
    it('Should have status 200', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(200);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-type', 'image/png');
        done();
      })
    })
    it('Should not have content-encoding header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.not.have.property('content-encoding');
        done()
      })
    })
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('last-modified');
        done();
      })
    })
    it('Should have cache-control header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
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
        lactate.serve(file, req, res)
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        data.should.property('length', size);
        done()
      })
    })
  })

  describe('#serve(invalidpath)', function() {
    const lactate = Lactate.Lactate({ root:DIR })
    const file = 'invalidpath';

    it('Should not err', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should have status code 404', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(404);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-type', 'text/html');
        done();
      })
    });
    it('Should have content-encoding header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-encoding');
        done();
      })
    });
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-length');
        done();
      })
    });
    it('Should have date header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('date');
        done();
      })
    });
  })

  describe('#serve(.invalidpath) --no-hidden', function() {
    const lactate = Lactate.Lactate({ root:DIR, hidden:false })
    const file = '.invalidpath';

    it('Should not err', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done()
      })
    })
    it('Should have status 403', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(403)
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-type', 'text/html');
        done();
      })
    });
    it('Should have content-encoding header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-encoding');
        done();
      })
    });
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-length');
        done();
      })
    });
    it('Should have date header', function(done) {
      http.server(function(req, res) {
        lactate.serve(file, req, res);
      })
      http.client('/', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('date');
        done();
      })
    });
  });

  describe('#serve(files/script.js) --no-subdirs', function() {
    const lactate = Lactate.Lactate({ root:__dirname, subdirs:false });
    const file = '/files/script.js';

    it('Should not err', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should have status 403', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(403);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-type', 'text/html');
        done();
      })
    });
    it('Should have content-encoding header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-encoding', 'gzip');
        done();
      })
    });
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res)
      })
      http.client(file, function(err, res, data) {
        should.not.exist(err);
        res.headers.should.have.property('content-length');
        done();
      })
    });
    it('Should have date header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('date');
        done();
      })
    });
  });

  describe('#serve(files/script.js) --using-method-POST', function() {
    const lactate = Lactate.Lactate({ root:__dirname });
    const file = '/files/script.js';

    it('Should not err', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        done();
      })
    })
    it('Should have status 405', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.should.have.status(405);
        done();
      })
    })
    it('Should have content-type header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-type', 'text/html');
        done();
      })
    });
    it('Should have content-encoding header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-encoding', 'gzip');
        done();
      })
    });
    it('Should have content-length header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('content-length');
        done();
      })
    });
    it('Should have date header', function(done) {
      http.server(function(req, res) {
        lactate.serve(req, res);
      })
      http.client(file, 1, 'POST', function(err, res, data) {
        should.not.exist(err);
        should.exist(res);
        should.exist(data);
        res.headers.should.have.property('date');
        done();
      })
    });
  })
});
