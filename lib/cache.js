// Support for in-memory and 
// Redis caching

module.exports.createCache = function(options) {
  options = options || {};

  var storeType = !!options.redis 
  ? './store/RedisStore'
  : './store/MemoryStore';

  var Store = require(storeType);
  return new Store(options);
};

