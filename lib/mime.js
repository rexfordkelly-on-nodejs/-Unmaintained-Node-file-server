// Extend node-mime
//

const mime = require('mime');

;(function extendMime() {
  var TYPES = {
    'text/javascript':['js']
  };
  mime.define(TYPES);
})();

module.exports = mime;
