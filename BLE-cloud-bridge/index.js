var Bridge = require('./lib/Pannel');
var credentials = require('./credentials');

var brooklyn = new Bridge(credentials.url);
delete credentials.url;

var options = {
	delay: 1,
	type: [],
	priority: []
};

brooklyn.loginToApi(credentials, function(err, res){
  brooklyn.automatic(options);
});
