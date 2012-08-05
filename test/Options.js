
var Lactate = require('../lib/lactate')
var should = require('should')

describe('Options', function() {

    describe('Constructor', function() {

        var lactate = Lactate.Lactate({
            'root':'files',
            'public':'files',
            'cache':false,
            'expires':'one hour'
        })

        it('Should have root option "files"', function() {
            var opt = lactate.get('root')
            opt.should.equal('files')
        })

        it('Should have public option "files"', function() {
            var opt = lactate.get('public')
            opt.should.equal('files')
        })

        it('Should have cache option false', function() {
            var opt = lactate.get('cache')
            opt.should.equal(false)
        })

        it('Should have expires option 3600', function() {
            var opt = lactate.get('expires')
            opt.should.equal(3600)
        })

    })

    describe('#set(object)', function() {

        var lactate = Lactate.Lactate()
        lactate.set({
            'root':'files',
            'public':'files',
            'cache':false,
            'expires':'one hour'
        })

        it('Should have root option "files"', function() {
            var opt = lactate.get('root')
            opt.should.equal('files')
        })

        it('Should have public option "files"', function() {
            var opt = lactate.get('public')
            opt.should.equal('files')
        })

        it('Should have cache option false', function() {
            var opt = lactate.get('cache')
            opt.should.equal(false)
        })

        it('Should have expires option 3600', function() {
            var opt = lactate.get('expires')
            opt.should.equal(3600)
        })

    })

    describe('#set("root", "files")', function() {
        it('Should have root option "files"', function() {
            var lactate = Lactate.Lactate()
            lactate.set('root', 'files')
            var opt = lactate.get('root')
            opt.should.equal('files')
        })
    })

    describe('#set("public", "files")', function() {
        it('Should have public option "files"', function() {
            var lactate = Lactate.Lactate()
            lactate.set('public', 'files')
            var opt = lactate.get('public')
            opt.should.equal('files')
        })
    })

    describe('#set("cache", false)', function() {
        it('Should have cache option false', function() {
            var lactate = Lactate.Lactate()
            lactate.set('cache', false)
            var opt = lactate.get('cache')
            opt.should.equal(false)
        })
    })

    describe('#set("expires", "one hour")', function() {
        it('Should have expires option 3600', function() {
            var lactate = Lactate.Lactate()
            lactate.set('expires', 3600)
            var opt = lactate.get('expires')
            opt.should.equal(3600)
        })
    })

})
