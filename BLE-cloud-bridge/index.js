var Bridge = require('./lib/Pannel');
var credentials = require('./credentials');

var brooklyn = new Bridge();

var options = {
	delay: 15,
	priority: []
};

brooklyn.loginToApi(credentials, function(err, res){
	brooklyn.automatic(options);
});
