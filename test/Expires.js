
var should = require('should')
var Lactate = require('../lib/lactate')

var http = require('./utils/http_utils')
var files = require('./utils/get_files')

describe('Expires', function() {
    afterEach(function(done) {
        http.stopServer(done)
    })
    describe('#serve(jquery.min.js)', function() {
        it('Should not err', function(done) {
            var lactate = Lactate.Lactate()
            http.server(function(req, res) {
                lactate.serve('files/jquery.min.js', req, res)
            })
            http.client('/', function(err, res, data) {
                if (err) { return done(err) }
                done()
            }, 2)
        })
        it('Should have status 304', function(done) {
            var lactate = Lactate.Lactate({
                'expires':'two days'
            })
            http.server(function(req, res) {
                lactate.serve('files/jquery.min.js', req, res)
            })
            http.client('/', function(err, res, data) {
                if (err) { return done(err) }
                res.should.have.status(304)
                done()
            }, 2)
        })
        it('Should respond with no data', function(done) {
            var lactate = Lactate.Lactate({
                'expires':'two days'
            })
            http.server(function(req, res) {
                lactate.serve('files/jquery.min.js', req, res)
            })
            http.client('/', function(err, res, data) {
                if (err) { return done(err) }
                data.should.not.exist
                done()
            }, 2)
        })
    })
})
