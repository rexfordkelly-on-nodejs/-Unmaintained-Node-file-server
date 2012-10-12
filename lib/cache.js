
module.exports = Cache;

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

Cache.prototype.set = function(filePath, headers, data) {
  var len = data.length;
  if (this.size + len >= this.max_size)
    return;

  this.size += len;

  var item = new CacheItem(headers, data);
  var interval, remove = function() {
    var now = this.now();
    var last = item.last;
    if (now - last >= this.expire) {
      clearInterval(interval);
      this.remove(filePath);
    };
  }.bind(this);

  interval = setInterval(remove, this.expire);

  this._cache[filePath] = item;

  if (++this.count > this.max_keys) {
    var pluck = this.pluck.bind(this);
    process.nextTick(pluck);
  };

};

Cache.prototype.get = function(filePath) {
  var item = this._cache[filePath];
  if (!!item) {
    item.last = this.now();
    return this._cache[filePath];
  }else {
    return null;
  };
};

Cache.prototype.remove = function(filePath) {
  var item = this._cache[filePath];
  this.size -= item.data.length;
  this.count -= 1;
  delete this._cache[filePath];
};

Cache.prototype.pluck = function() {
  var key = Object.keys(this._cache)[0];
  this.remove(key);
};

function CacheItem(headers, data) {
  this.headers = headers;
  this.data = data;
  this.last = this.now();
};

CacheItem.prototype.now = Cache.prototype.now;

CacheItem.prototype.read = function() {
  return this.data;
};

