

module.exports = Logger;

function Logger(options) {
  options = options || {};

  var _msg = this.msg = this.getColor.bind(this, 'gray');

  for (key in this.HTTP) {
    var status = this.getColor(this.HTTP[key], key);
    this[key] = function(status, msg, path) {
      var str = [status, _msg(msg), path].join(' ');
      console.log(str);
    }.bind(this, status);
  };
};

Logger.prototype.log = function(status, msg) {
  return this[status];
};

Logger.prototype.HTTP = {
  '200':'green',
  '304':'yellow',
  '403':'red',
  '404':'red'
};

Logger.prototype.PREFIX = '\u001b[';
Logger.prototype.SUFFIX = 'm';

Logger.prototype.TERM_COLORS = {
  clear:          '0',

  brightgreen:    '1;32',
  brightcyan:     '1;36',
  brightred:      '1;31',
  brightblue:     '1;34',
  brightmagenta:  '1;35',
  brightyellow:   '1;33',
  white:          '1;37',

  green:          '0;32',
  cyan:           '0;36',
  red:            '0;31',
  blue:           '0;34',
  magenta:        '0;35',
  yellow:         '0;33',
  gray:           '0;37'
};

Logger.prototype.getColor = function(_color) {
  var PREFIX = this.PREFIX;
  var SUFFIX = this.SUFFIX;
  var TERM_COLORS = this.TERM_COLORS;

  var _text = ([]).slice.call(arguments, 1).join(' ');
  var clear = [PREFIX, SUFFIX].join(TERM_COLORS.clear);
  var color = [PREFIX, SUFFIX].join(TERM_COLORS[_color] || 0);

  return [color, clear].join(_text);
};

