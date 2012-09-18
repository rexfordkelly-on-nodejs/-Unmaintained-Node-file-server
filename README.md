# Lactate

`npm install -g lactate`

An exceedingly fast static file handler, with a few electives.

* Automatic gzipping
* In-memory caching
* Robust cache-control setting
* Custom 404 pages
* Custom response headers
* Middleware export

## Comparison

Lactate caches files in memory without hitting the file system for each request, watches files for efficient udpates, and streams gzipped files directly to the response.  [Preliminary benchmarks](https://github.com/Weltschmerz/Lactate/blob/master/benchmark/new/results.md) show that Lactate has a significant advantage over  most worthy competitors on the [node modules wiki](https://github.com/joyent/node/wiki/Modules#wiki-web-frameworks-static)

![Bench](http://i.imgur.com/b3xJU.jpg)

* `ab -c 100 -n 10000` - requests per second
* `node` v0.8.7
* `jquery.min.js` ~100kb

*See /benchmark for details*

## Example

Just pass three arguments to the serve function `path` [optional], `request`, `response`. Lactate will stream your file to the client in the most efficient way, by piping node's readStream to gzip, and finally to the response.

```js

var express = require('express')
var app = express.createServer()

var Lactate = require('lactate')
var lactate = Lactate.Lactate()

lactate.set({
  root:process.cwd(),
  expires:'one day and 12 minutes'
})

app.get('/', function(req, res) {
  lactate.serve('pages/land.html', req, res)
})

var files = Lactate.dir('files', {
  public:'files',
  expires:'ten years'
}).toMiddleware()

app.get('/files/*', files)

app.listen(8080)

```

##Global executable

If lactate is installed globally with `npm install -g` then you will have the 'lactate' command available to you. Issuing an empty 'lactate' will serve the current working directory. This can be convenient for testing and so on. Options are:

+ `--port`, `-p`
+ `--public`
+ `--expires`
+ `--no-cache`, `-nc`

More on this later

##The varieties of Lactate experience

In the general case, the `Lactate` method returns an object with the methods `serve` `set` and `get`, importantly. However, there are more convenient methods exported by Lactate. They follow.

###Serving an individual file

To serve an individual file, use the `file` method.

```js
  var Lactate = require('lactate')

  app.get('*', function(req, res) {
    Lactate.file('images/somn.jpg', req, res)
  })
```

An optional fourth argument is for Lactate settings.

```js
  var Lactate = require('lactate')
  var options = {
    cache:true,
    expires:'two days'
  }

  app.get('*', function(req, res) {
    Lactate.file('images/somn.jpg', req, res, options)
  })
```

###Namespacing a directory

The `dir` method allows you to namespace a directory, for convenience.

```js
var Lactate = require('lactate')
var images = Lactate.dir('images', {expires:'one day'})

app.get('/images/:image', function(req, res) {
  images.serve(req.params.image, req, res)
})
```

###Middleware

For maximum convenience, you may use the `toMiddleware` method on directories.

```js
var Lactate = require('lactate')

var images = Lactate.dir('images', {
  expires:'one day'
}).toMiddleware()

app.use(images) //That's it!
```

You may also pass additional options to the `toMiddleware` function.

```js
var images = Lactate.dir('images', {
  expires:'one day'
})

var middleware = images.toMiddleware({
  public:'images'
})

app.use(middleware)
```

###Custom 404 pages

Use the `on404` option for defining custom 404 pages or functions.

Strings will be treated as ordinary file paths, and as such will abide rules for gzipping and in-memory caching. Note that on404 paths will be relative to the `root` setting (by default process.cwd()).

```js
var lactate = require('lactate').Lactate({
    notFound:'pages/404.html'
})
```

Functions allow you to fully customize your 404 handling.

```js
lactate.set('notFound', function(res) {
    res.writeHead(404)
    res.end('My custom 404 thingy')
})
```

###Custom headers

Extend response headers with `headers` option.

```js
var options = {
    headers: {
        server:'Lactate'
    }
};

var lactate = require('lactate').Lactate(options);
//lactate.set('headers', options.headers);

app.get('/', function(req, res) {
    lactate.serve('pages/land.html', req, res);
});
```

##Options

Options can be passed to the initialization function or using the `set` method.

### Setting options

```js

//Passing to initialization function
var lactate = require('lactate').Lactate({
  expires:'two days'
})

//Set method
lactate.set('expires', null)

//Either function accepts (key, value) or an object.

```

### Options available

+ `root` **string**

Local directory from which to serve files. By default, the current working directory.

+ `public` **string**

Deprecated. Use `pub` instead.

+ `pub`

Public directory exposed to clients. If set, only requests from /*directory* will complete.

+ `subdirs` **boolean**

By default subdirectories are served. To disable this, set `subdirs` to false.

+ `cache` **boolean**

Keep files in-memory. Enabled by default, and no great reason to disable.

+ `gzip` **boolean**

If false, disables automatic gzipping for text files (HTML, JS, CSS).

+ `expires` **number** or **string**

Pass this function a number (of seconds) or a string and appropriate headers will be set for client-side caching. Lactate comes with expiration defaults, such as 'two days' or '5 years and sixteen days' See [Expire](https://github.com/Weltschmerz/Expire) for details.

```code
lactate.set('expires', 87500)
//87500 seconds
lactate.set('expires', 'two days')
//172800 seconds
lactate.set'expires', 'five weeks and one minute and ten seconds')
//3024070 seconds
lactate.set('expires', 'one year and 2 months and seven weeks and 16 seconds')
//41050028 seconds

```

+ `notFound` **string or function**

For custom 404 handling. Functions are supplied the response for 100% custom response handling. Otherwise, if set to a string, this option will be treated as an ordinary file path and abide rules for gzipping / in-memory cache.

+ `headers` **object**

Optional headers.

+ `debug` **boolean**

Colored status / msg / path logging, for debugging purposes.

## License

MIT

*This module is used internally by [Transmit](https://github.com/Weltschmerz/Transmit)*
