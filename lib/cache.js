
module.exports = Cache;

function Cache(options) {
  options = options || {};
  this.seg_threshold = options.seg_threshold || 1024 * 200;
  this.expire = 1000 * (options.expire || 900);
  this.max_keys = options.max_keys || 1000;
  this.max_size = Math.pow(2, 20) * (options.max_size || 100);

  this.count = 0;
  this.size = 0;
};

Cache.prototype.cache = Object.create(null);

Cache.prototype.set = function(filePath, headers, data) {
  if (++this.count >= this.max_keys) {
    this.randomRemove();
  };

  var len = data.length;
  if (this.size + len >= this.max_size) {
    return;
  }else {
    this.size += len;
  };

  var item = new CacheItem(headers, data);
  this.cache[filePath] = item;

  var remove = function() {
    var now = this.now();
    var last = item.last;
    if (now - last >= this.expire) {
      this.remove(filePath);
    };
  }.bind(this);

  setInterval(remove, this.expire);
};

Cache.prototype.get = function(filePath) {
  var item = this.cache[filePath];
  if (!!item) {
    item.last = this.now();
    return this.cache[filePath];
  }else {
    return null;
  };
};

Cache.prototype.remove = function(filePath) {
  var item = this.cache[filePath];
  this.size -= item.data.length;
  item = null;
};

Cache.prototype.now = function() {
  return new Date().getTime();
};

Cache.prototype.randomRemove = function() {
  var keys = Object.keys(this.cache);
  var rand = ~~(Math.random() * keys.length);
  this.remove([keys[rand]]);
};

function CacheItem(headers, data) {
  this.headers = headers;
  this.data = data;
  this.last = new Date().getTime();
};

CacheItem.prototype.read = function() {
  return this.data;
};

