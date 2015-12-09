var Bridge = require('./lib/FlowerBridge');
var credentials = require('./credentials');

var brooklyn = new Bridge();

var options = {
	delay: 15,
	priority: ['a0143d08b456']
};

brooklyn.loginToApi(credentials);

brooklyn.on('login', function() {
	console.log("I'm log");
	brooklyn.automatic(options);
});

brooklyn.on('process', function(proc) {
	console.log("[" + proc.date.toString().substr(4, 20) + "]: " + proc.uuid + ": " + proc.state);
});
