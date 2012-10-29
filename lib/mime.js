// Extend node-mime
//

var mime = require('mime');
module.exports = mime;

;(function extendMime() {
  var TYPES = {
    'text/javascript':['js']
  };
  mime.define(TYPES);
})();

