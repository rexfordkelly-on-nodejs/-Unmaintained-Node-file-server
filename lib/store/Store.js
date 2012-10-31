// Generic Store interface

var CacheItem = require('./CacheItem');

function Store(options) {
  this.item = CacheItem;
  this.count = 0;
  this.size = 0;
  this.expire = 1000 * 900;
  this.max_keys = Infinity;
  this.max_size = Math.pow(2, 20) * 100;
  this.seg_threshold = Math.pow(2, 10) * 200;

  !!options && this.setOptions(options);
};

Store.prototype._cache = Object.create(null);

Store.prototype.now = function() {
  return Date.now();
};

Store.prototype.setOptions = function(key, val) {
  if (typeof key === 'object') {
    for (var k in key) {
      this.setOptions(k, key[k]);
    };
  } else {
    key = key.replace(/\s/g, '_');
    if (this.hasOwnProperty(key)) {
      this[key] = val;
    };
  };
};

module.exports = Store;
