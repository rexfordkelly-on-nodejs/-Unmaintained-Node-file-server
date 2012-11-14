/* Range parser */

module.exports = function attachRangeParser() {
  this.parseRange = parseRange;
};

function parseRange () { 
  var args = Array.prototype.slice.call(arguments);

  var size = typeof args[0] === 'number'
    ? args.shift()
    : 1024;

  var str = args.shift();
  var ind = str.indexOf('=');
  var invalid = false;

  if (ind === -1) return invalid;

  var range = str
    .slice(++ind)
    .split(',');

  if (range.length > 1) {
    return invalid;
  } else {
    range = range.shift().split('-');
  };

  if (range.length < 2) return invalid;

  var start = parseInt(range[0], 10);
  var end = parseInt(range[1], 10);
  var m1 = size - 1;

  if (isNaN(start)) {
    start = size - end;
    end = m1;
  } else if (isNaN(end)) {
    end = m1;
  };

  if (end > m1) end = m1;

  if (isNaN(start) || isNaN(end) || start > end || start < 0) {
    return invalid;
  } else {
    return { start:start, end:end };
  };
};
