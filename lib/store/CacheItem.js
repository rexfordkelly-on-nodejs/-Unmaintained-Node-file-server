// Cache item

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

module.exports = CacheItem;
