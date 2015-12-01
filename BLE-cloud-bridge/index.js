var Pannel = require('./lib/Pannel');

var CloudAPI = require('./node-flower-power-cloud/FlowerPowerCloud');
var credentials = require('./credentials');

var Parrot = new CloudAPI(credentials.url);
var myPannel = new Pannel(Parrot);
delete credentials.url;

var options = {
	delay: 15,
	type: [],
	priority: []
};

myPannel.loginToApi(credentials, function(err, res){
  myPannel.automatic(options);
});
