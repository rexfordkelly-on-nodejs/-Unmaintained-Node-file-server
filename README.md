# Lactate

`npm install -g lactate`

An exceedingly fast static file handler, with a few electives.

### Features

* In-memory caching
* Robust cache-control setting
* Automatic gzipping
* Automatic minification
* Custom 404 pages
* Custom response headers
* Middleware export
* Asset bundling

### Comparison

Lactate caches files in memory without hitting the file system for each request, watches files for efficient udpates, and streams gzipped files directly to the response.  [Preliminary benchmarks](https://github.com/Weltschmerz/Lactate/blob/master/benchmark/new/results.md) show that Lactate has a significant advantage over  most worthy competitors on the [node modules wiki](https://github.com/joyent/node/wiki/Modules#wiki-web-frameworks-static)

![Bench](http://i.imgur.com/b3xJU.jpg)

* `ab -c 100 -n 10000`
* `node` v0.8.7
* `jquery.min.js` ~100kb

*See /benchmark for details*

### Using Lactate

Lactate can be used with either plain node, or with Express. With Express, Lactate is a drop-in replacement for `static` middleware, but with far more ability. The examples below use Express 2.x API for simplicity. See the [examples](https://github.com/Weltschmerz/Lactate/tree/master/example) for various examples.

```js
var lactate = require('lactate');
var express = require('express');

var app = express.createServer();
app.use(lactate.static(__dirname + '/files'));
```

## Testing Lactate

If installed locally (without -g flag to npm install):

1. `cd` into `~/node_modules/lactate`
2. `npm install ./` to install devDependencies
3. `make test` to run mocha test

If installed globally, simply run `npm test lactate`.

##The varieties of Lactate experience

In the general case, the `Lactate` method returns an object with the methods `serve` `set` and `get`, importantly. However, there are more convenient methods exported by Lactate. They follow.

###Serving an individual file

To serve an individual file, use the `file` method.

```js

  app.get('/', function(req, res) {
    Lactate.file('land.html', req, res)
  })
```

An optional fourth argument is for Lactate settings.

```js
  var options = {
    expires:'two days',
    minify:true,
    pub:'scripts'
  }

  app.get('/scripts/*', function(req, res) {
    Lactate.file(req, res);
  })
```

###Serving a directory

The `dir` method allows you to namespace a directory, for convenience.

```js
var images = Lactate.dir('images');

app.get('/images/:image', function(req, res) {
  images.serve(req.params.image, req, res)
})
```

Pass a second argument to `dir` for options:

```js
var options = { cache:false };
var images = Lactate.dir('assets/images', options);
images.maxAge('five days');
```

###Middleware

For maximum convenience, you may use the `toMiddleware` method on directories.

```js
var images = Lactate.dir('images', {
  cache:false,
  expires:0,
  debug:true
}).toMiddleware()

app.use(images) //That's it!
```

You may also pass additional options to the `toMiddleware` function.

```js
var images = Lactate.dir('images');
images.set('cache', false);

var middleware = images.toMiddleware({
  public:'images'
})

app.use(middleware)
```

###Custom 404 pages

Use the `notFound` option for defining custom 404 pages or handler functions.

Strings will be treated as ordinary file paths, and as such will abide rules for gzipping and in-memory caching. Note that `notFound` paths will be relative to the `root` setting (by default `process.cwd()`).

```js
var lactate = Lactate.Lactate({
    notFound:'pages/404.html'
})

lactate.set('notFound', 'pages/not_found.html');
lactate.set('gzip', false);
lactate.set({
  cache:false,
  watchFiles:false
});
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

lactate.set(options);
lactate.set('headers', options.headers);
lactate.headers(options.headers);
lactate.setHeader('server', options.headers.server);

app.get('/', function(req, res) {
    lactate.serve('pages/land.html', req, res);
});
```

You may also use a function for dynamic header setting:

```js
  lactate.setHeader('server', function(req, res) {
    return 'lactate';
  });
```

###Bundling assets for request optimization

Lactate directories have an additional method for combining and minifying text assets, to reduce the number of necessary requests.

```js
var assets = lactate.dir('assets', {
    pub:'assets',
    minify:true
});

assets.bundle('js', 'common.js', function(err, data) { });
//assets.bundleScripts('common.js', function(){});
assets.bundleStyles('common.css');
app.use(assets.toMiddleware());
```

Now, requesting `/assets/common.js` will result with a combined and minified (and by default gzipped) script of all the scripts contained in that directory. This function does actually write the bundled files to disk.

##Global executable

If lactate is installed globally with `npm install -g` then you will have the 'lactate' command available to you. Issuing an empty 'lactate' will serve the current working directory. This can be convenient for testing and so on. Options are:

+ `--port`, `-p`
+ `--public`
+ `--expires`
+ `--no-cache`, `-nc`

More on this later

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

+ `public`

*Deprecated. Use `pub` instead.*

+ `pub` **string**

Public directory exposed to clients. If set, only requests from /*directory* will complete.

+ `subdirs` **boolean**

By default subdirectories are served. To disable this, set `subdirs` to false.

+ `cache` **boolean**

Keep files in-memory. Enabled by default, and no great reason to disable, unless you are serving fairly large files or run a low-traffic operation.

+ `gzip` **boolean**

If false, disables automatic gzipping for text files (HTML, JS, CSS). Enabled by default.

+ `minify` **boolean**

If true, will automatically minify JavaScript and CSS using [Abridge](https://github.com/Weltschmerz/Abridge). Disabled by default.

+ `headers` **object**

Optional headers.

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

+ `debug` **boolean**

Colored status / msg / path logging, for debugging purposes.

###Special options methods

Lactate has some special methods to reduce visual clutter:

```js
lactate.maxAge('two days');
```

is equivalent to:

```js
lactate.set('expires', 'two days');
```

Similarly, the `headers` method is for setting custom response headers.

## License

MIT
