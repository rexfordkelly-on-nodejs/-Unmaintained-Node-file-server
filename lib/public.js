
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
+ '</html>\n'

var render = function(page, args) {
  var res = page;
  for (key in args) {
    var re = new RegExp('{{'+key+'}}', 'g');
    res = res.replace(re, args[key]);
  };
  return res;
};

var writeFile = function(name, data) {
  try {
    fs.writeFileSync(join(name), data);
  } catch(exception) {
  };
};

writeFile('400.html', render(template, {
  status:'400',
  message:'Bad Request',
  version:version
}));

writeFile('403.html', render(template, {
  status:'403',
  message:'Forbidden',
  version:version
}));

writeFile('404.html', render(template, {
  status:'404',
  message:'Not Found',
  version:version
}));

writeFile('405.html', render(template, {
  status:'405',
  message:'Invalid Method',
  version:version
}));

writeFile('500.html', render(template, {
  status:'500',
  message:'Internal Server Error',
  version:version
}));
