
// Create default response pages

var path = require('path');
var fs = require('fs');

var version = require(__dirname + '/../package.json').version;
var publicPath = path.resolve(__dirname + '/../public');
var join = path.join.bind(this, publicPath);

var template = ''
+ '<html>'
+ '<head>'
+ '<meta charset=\'utf-8\'/>'
+ '<title>{{status}} {{message}}</title>'
+ '<style>'
+ '* { color:#444; font-family:sans-serif; }'
+ '#center { width:50%; margin:100px auto; text-align:center; }'
+ '</style>'
+ '</head>'
+ '<body>'
+ '<div id=\'center\'>'
+ '<h1>{{message}}</h1>'
+ '<hr/>'
+ '<p>Lactate/{{version}}</p>'
+ '</div>'
+ '</body>'
+ '</html>'

var render = function(page, args) {
  var res = page;
  for (key in args) {
    var re = new RegExp('{{'+key+'}}', 'g');
    res = res.replace(re, args[key]);
  };
  return res;
};

fs.writeFileSync(join('404.html'), render(template, {
  status:'404',
  message:'Not Found',
  version:version
}));

fs.writeFileSync(join('403.html'), render(template, {
  status:'403',
  message:'Forbidden',
  version:version
}));

