var Bridge = require('./lib/FlowerBridge');
var credentials = require('./credentials');
var clc = require('cli-color');

var brooklyn = new Bridge(credentials.url);
delete credentials.url;

var options = {
	delay: 15,
	type: [],
	priority: [],
	fnLog: function(flowerPower) {
		console.log(flowerPower.toString());
	}
};

brooklyn.loginToApi(credentials);

brooklyn.on('login', function() {
	console.log(clc.green.bold('✓') + ' ' + clc.green('Loggin!'));
	brooklyn.automatic(options);
});

