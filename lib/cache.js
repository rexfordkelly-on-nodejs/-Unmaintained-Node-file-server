
module.exports = Cache;

function Cache(options) {
  options = options || {};
  this.segment_threshold = options.segment_threshold || 1024 * 200;
  this.expire = 1000 * (options.expire || 900);
  this.max_keys = options.max_keys || 1000;
  this.count = 0;
};

Cache.prototype.cache = Object.create(null);

Cache.prototype.set = function(filePath, headers, data) {
  if (++this.count >= this.max_keys) {
    this.randomRemove();
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
  item.last = this.now();
  return this.cache[filePath];
};

Cache.prototype.remove = function(filePath) {
  this.cache[filePath] = null;
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

