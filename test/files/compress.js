
var zlib = require('zlib')
var fs = require('fs')

var files = fs.readdirSync('./')

files = files.filter(function(file) {
    return !/\.gz$/.test(file)
}).forEach(function(file) {
    var ws = fs.createWriteStream('./'+file+'.gz')
    var gz = zlib.createGzip()
    fs.createReadStream(file).pipe(gz).pipe(ws)
})
