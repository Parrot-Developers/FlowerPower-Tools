var SyncFP = require('./SyncFP');
var FlowerPowerCloud = require('../node-flower-power-cloud/FlowerPowerCloud');
var helpers = require('./helpers');
var async = require('async');
var clc = require('cli-color');
var Chance = require('chance');
var chance = new Chance();


// Load page getUser
// When automatic process getUser to create Queud and make param for API
function Pannel() {
	this._state = 'off';
	this.user = null;
	this.api = new FlowerPowerCloud();
}

Pannel.prototype.loginToApi = function(credentials, callback) {
	this.api.login(credentials, callback);
}

Pannel.prototype.getState = function() {
	return (this._state);
}

Pannel.prototype._init = function() {
	this.getUser(function(err, user) {
		if (err) helpers.logTime('Error in getInformationsCloud');
		else {
			console.log('Init');
		}
	});
}

Pannel.prototype.getUser = function(callback) {
	var self = this;

	async.parallel({
		garden: function(callback) {
			self.api.getGarden(function(err, garden) {
				callback(err, garden);
			});
		},
		userConfig: function(callback) {
			self.api.getProfile(function(err, config) {
				callback(err, config);
			});
		},
	}, function(error, results) {
		var user = helpers.concatJson(results.userConfig, results.garden);
		var sensors = {};
		for (var i = 0; i < user.sensors.length; i++) {
			sensors[user.sensors[i].sensor_serial] = user.sensors[i];
		}
		user.sensors = sensors;
		self.user = user;
		callback(error, user);
	});
}


Pannel.prototype.automatic = function(options) {
	var self = this;
	var delay = 15;

	if (typeof options != 'undefined' && typeof options['delay'] != 'undefinded') {
		delay = options['delay'];
	}
	console.log('New process every ' + delay + ' minutes');
	self.processAll(options);
	setInterval(function() {
		if (self._state == 'off') self.processAll(options);
	}, delay * 60 * 1000);
}

Pannel.prototype.processAll = function(options) {
	var self = this;

	if (self._state == 'off') {
		self._state = 'automatic';

		self.getUser(function(err, user) {
			if (err) helpers.logTime('Error in getInformationsCloud');
			else self._makeQueud(user, options);
		});
	}
}

Pannel.prototype._makeQueud = function(user, options) {
	var self = this;
	var fpPriority = [];

	if (typeof options != 'undefined') {
		if (typeof options['priority'] != 'undefined') fpPriority = options['priority'];
	}

	helpers.logTime(clc.yellow('New scan for', clc.bold(Object.keys(user.sensors).length), "sensors"));
	var q = async.queue(function(task, callbackNext) {
		var FP = new SyncFP(task.uuid, user, self.api);

		async.series([
			function(callback) {
				FP.findAndConnect(callbackNext, callback);
			},
			function(callback) {
				self.syncFlowerPower(FP, callback);
			}
			], function(err, results) {
				if (err != 'Not found') FP.disconnect();
				helpers.tryCallback(callbackNext());
			});

	}, 1);

	q.drain = function() {
		helpers.logTime('All FlowerPowers have been processed\n');
		self._state = 'off';
	}

	for (var i = 0; i < fpPriority.length; i++) {
		q.push({uuid: fpPriority[i]});
	}

	for (var uuid in user.sensors) {
		var uuid = helpers.uuidCloudToPeripheral(uuid);
		q.push({uuid: uuid});
		if (typeof helpers.fp[uuid] == 'undefined') {
			helpers.fp[uuid] = {};
			helpers.fp[uuid].color = chance.natural({min: 100, max: 200});
		}
		helpers.fp[uuid].process = 'None';
		helpers.fp[uuid].date = new Date().toString().substr(4, 20);
	}
	helpers.proc();
}

Pannel.prototype.syncFlowerPower = function(FP, callback) {
	async.series([
			function(callback) {
				FP.syncSamples(callback);
			}
			// More features?
			], function(err, results) {
				callback(err, results);
			});
}

Pannel.prototype.live = function() {

}

module.exports = Pannel;
