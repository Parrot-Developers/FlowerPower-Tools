var Bridge = require('./lib/Pannel');
var credentials = require('./credentials');

var brooklyn = new Bridge();

var options = {
	delay: 15,
	priority: []
};

brooklyn.loginToApi(credentials, function(err, res){
	if (err) console.log(err);
	else {
		brooklyn.automatic(options);
	}
});
