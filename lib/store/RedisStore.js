const util = require('util');
const Store = require('./Store');

try {
  const redis = require('redis').createClient();
}catch (exception) {
  throw new Error('Must have node_redis installed.');
};

module.exports = RedisStore;

function RedisStore(options) { 
  Store.call(this);

  this.prefix = 'Lactate:';
  this.keys = [];

  function cleanup() { };
  process.on('exit', cleanup.bind(this));
};

util.inherits(RedisStore, Store);

RedisStore.prototype.set = function(filePath, headers, data, fn) { 
  var len = data.length;

  if (this.size + len > this.max_size) {
    return fn && process.nextTick(fn);
  } else {
    this.size += len;
  };

  var _headers = JSON.stringify(headers);
  var _data = data.toString('binary');
  var key = this.prefix + filePath;

  redis.multi()
    .hmset(key, 'headers', _headers, 'data', _data, fn)
    .expire(key, this.expire)
  .exec(fn);

  this.keys.push(key);

  if (++this.count > this.max_keys) {
    var prune = this.prune.bind(this);
    process.nextTick(prune);
  };
};

RedisStore.prototype.get = function(filePath, fn) { 
  var key = this.prefix + filePath;

  function redisGetCB(err, data) {
    if (err || !data) {
      fn(new Error('No key exists'));
    } else {
      var _headers = JSON.parse(data.headers);
      var _data = new Buffer(data.data, 'binary');
      fn(null, new this.item(_headers, _data));
      redis.expire(key, this.expire);
    };
  };

  redis.hgetall(key, redisGetCB.bind(this));
};

RedisStore.prototype.remove = function(filePath, fn) { 
  var key = this.prefix + filePath;
  redis.hdel(key, 'headers', 'data', fn);
};

RedisStore.prototype.prune = function() {
  var rand = Math.random() * this.keys.length;
  var key = this.keys[rand];
  this.remove(key);
};

