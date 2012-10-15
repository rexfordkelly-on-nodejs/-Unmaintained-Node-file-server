var Lactate = require('../lib/lactate')
var should = require('should')
var path = require('path');

describe('Options', function() {
  describe('Constructor', function() {
    var lactate = Lactate.Lactate({
      'root':'files',
      'from':'files',
      'subdirs':false,
      'hidden':true,
      'cache':false,
      'watch_files':false,
      'max_age':'one hour',
      'gzip':false,
      'minify':true,
      'bundle':true,
      'rebundle':false,
      'debug':true
    })
    it('Should have root option "files"', function() {
      var opt = lactate.get('root')
      var root_path = path.resolve('files');
      opt.should.equal(root_path);
    })
    it('Should have from option "files"', function() {
      var opt = lactate.get('from')
      opt.should.equal('files')
    })
    it('Should have subdirs option false', function() {
      var opt = lactate.get('subdirs')
      opt.should.equal(false)
    })
    it('Should have hidden option true', function() {
      var opt = lactate.get('hidden')
      opt.should.equal(true)
    })
    it('Should have cache option false', function() {
      var opt = lactate.get('cache')
      opt.should.equal(false)
    })
    it('Should have watch_files option false', function() {
      var opt = lactate.get('watch_files')
      opt.should.equal(false)
    })
    it('Should have max_age option 3600', function() {
      var opt = lactate.get('max_age')
      opt.should.equal(3600)
    })
  })
  describe('#set(object)', function() {
    var lactate = Lactate.Lactate()
    lactate.set({ 'root':'files' })
    it('Should have root option "files"', function() {
      var opt = lactate.get('root')
      var root_path = path.resolve('files');
      opt.should.equal(root_path);
    })
  })
  describe('#set(k, v)', function() {
    var lactate = Lactate.Lactate()
    lactate.set('root','files')
    it('Should have root option "files"', function() {
      var opt = lactate.get('root')
      var root_path = path.resolve('files');
      opt.should.equal(root_path);
    })
  })
})
