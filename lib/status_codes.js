
/* HTTP Status Codes */

module.exports = function attachStatusCodes() {

  this['STATUS_CODES'] = {
    200:'OK',
    206:'Partial Content',
    304:'Not Modified',
    400:'Bad Request',
    403:'Forbidden',
    404:'Not Found',
    405:'Method Not Allowed',
    416:'Request Range Not Satisfiable',
    500:'Internal Error'
  };

};

