var Bridge = require('./lib/FlowerBridge');
var credentials = require('./credentials');
var clc = require('cli-color')

var brooklyn = new Bridge();
var valid = clc.green.bold('✔');
var bad = clc.red.bold('✘');

var options = {
	delay: 15,
	priority: ['a0143d08b456'],
	fnLog: function(flowerPower) {
		if (flowerPower.lastProcess == 'Searching') {
			process.stdout.write(flowerPower.uuid + " ");
		}
		else if (flowerPower.lastProcess == 'Disconnected') {
			if (flowerPower.process[1] == 'Updated') console.log(valid);
			else console.log(bad + ' -> ' + flowerPower.process[1]);
		}
		else if (flowerPower.lastProcess == 'Not found') {
			console.log(bad + ' -> Not found');
		}
	}
};

brooklyn.loginToApi(credentials);

brooklyn.on('login', function() {
	console.log(valid, clc.green('Login!'));
	brooklyn.automatic(options);
});
