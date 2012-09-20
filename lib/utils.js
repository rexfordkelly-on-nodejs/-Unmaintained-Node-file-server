
/**
 * Combines and minifies
 * scripts for request
 * optimization
 */

var uglify = require('uglify-js');
var path   = require('path');
var fs     = require('fs');

var jsFilter = function(i) {
    return /\.js$/.test(i);
};

var readFile = function(dir, i) {
    var loc = path.join(dir, i);
    return fs.readFileSync(loc, 'utf8');
};

var minify = function(gen, squeeze, mangle, parse, script) {
    return gen(squeeze(mangle(parse(script))));
}.bind(this,
      uglify.uglify.gen_code,
      uglify.uglify.ast_squeeze,
      uglify.uglify.ast_mangle,
      uglify.parser.parse);

module.exports.combineScripts = function(dir) {
    dir = path.resolve(dir);

    return fs.readdirSync(dir)
    .filter(jsFilter)
    .map(readFile.bind(this, dir))
    .map(minify)
    .join(';');
};

