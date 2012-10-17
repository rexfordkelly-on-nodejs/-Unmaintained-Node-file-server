
module.exports.Cache = Cache;
module.exports.createCache = function(options) {
 return new Cache(options); 
};

function Cache(options) {
  this.count = 0;
  this.size = 0;

  options = options || {};

  this.seg_threshold = options.seg_threshold || 1024 * 200;
  this.expire = 1000 * (options.expire || 900);
  this.max_keys = options.max_keys || 1000;
  this.max_size = Math.pow(2, 20) * (options.max_size || 100);
};

Cache.prototype._cache = Object.create(null);

Cache.prototype.now = function() {
  return new Date().getTime();
};

Cache.prototype.set = function(filePath, headers, data, fn) {
  var len = data.length;
  if (this.size + len > this.max_size) {
    return fn && process.nextTick(fn);
  } else {
    this.size += len;
  };

  var item = new CacheItem(headers, data);
  var remove = this.remove.bind(this, filePath);
  var when = this.expire

  item.touch = function(remove, when) {
    var to = this._timeout;
    if (to) clearTimeout(to);
    this._timeout = setTimeout(remove, when)
  }.bind(item, remove, when);

  this._cache[filePath] = item;
  item.touch();

  if (typeof(fn) === 'function') {
    process.nextTick(fn);
  };

  if (++this.count > this.max_keys) {
    var prune = this.prune.bind(this);
    process.nextTick(prune);
  };
};

Cache.prototype.get = function(filePath) {
  var item = this._cache[filePath];
  if (!!item) {
    item.touch();
    return this._cache[filePath];
  } else {
    return null;
  };
};

Cache.prototype.remove = function(filePath, fn) {
  var item = this._cache[filePath];
  if (!item) return;
  this.size -= item.data.length;
  this.count -= 1;
  delete this._cache[filePath];
  fn && process.nextTick(fn);
};

Cache.prototype.prune = function() {
  var key = Object.keys(this._cache)[0];
  this.remove(key);
};

function CacheItem(headers, data) {
  this.headers = headers;
  this.data = data;
};

CacheItem.prototype.read = function(options) {
  if (!!options) {
    var data = this.data;
    var start = options.start || 0;
    var end = options.end || data.length;
    return data.slice(start, end);
  } else {
    return this.data;
  };
};

