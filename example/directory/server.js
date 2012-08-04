
var http = require('http')
var port = 8080

var lactate = require('lactate')

var pages = lactate.dir('pages')

var files = lactate.dir('files', {
    public:'files'
    //cache:true,
    //expires:'one day'
})

/*
 * Without a string as first argument,
 * Lactate will use req.url to determine
 * file path. In this case, the file 
 * 'index.html' may be reached from 
 * http://localhost:8080/index.html
 */

var server = http.createServer(function(req, res) {
    var url = req.url
    if (url === '/') {
        return pages.serve('index.html', req, res)
    }else if (/^\/files/.test(url)) {
        return files.serve(req, res)
    }else {
        res.writeHead(404)
        res.end()
    }
})

server.listen(port, function() {
    console.log('Listening on port', port)
})

