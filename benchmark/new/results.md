
2012.7.22

Benchmark of three static file servers

*node version v0.8.0*

* `Lactate`
* `node-static`
* `connect`

Two files

* `jquery.min.js` ~100kb
* `santamonica.jpg` ~1mb

![result](http://i.imgur.com/MbXJH.jpg)

## Lactate

```js
var lactate = require('lactate')

var dir = __dirname + '/../files'
var files = lactate.dir(dir, {
    cache:true,
    expires:'two days'
})

var http = require('http')
var server = new http.Server()

server.addListener('request', function(req, res) {
    return files.serve(req, res) 
})

server.listen(8080)

```

## node-static

```js
var static = require('node-static')

var dir = __dirname + '/../files'
var files = new static.Server(dir)

var http = require('http')
var server = new http.Server

server.addListener('request', function(req, res) {
    return files.serve(req, res)
})

server.listen(8080)

```

## connect

```js
var connect = require('connect')

var dir = __dirname + '/../files'
var files = connect.static(dir)

var http = require('http')
var server = new http.Server

server.addListener('request', function(req, res) {
    files(req, res, function() {
        res.writeHead(404)
        res.end()
    })
})

server.listen(8080)

```
