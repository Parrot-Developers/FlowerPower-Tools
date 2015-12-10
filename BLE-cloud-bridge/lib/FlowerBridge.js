var util = require('util');
var async = require('async');
var clc = require('cli-color');
var Chance = require('chance');
var SyncFP = require('./SyncFP');
var helpers = require('./helpers')
var EventEmitter = require('events');
var CloudAPI = require('../node-flower-power-cloud/FlowerPowerCloud');

var chance = new Chance();

// Load page getUser
// When automatic process getUser to create Queud and make param for API
function FlowerBridge(url) {
	EventEmitter.call(this);
	this._state = 'off';
	this.user = null;
	this.api = new CloudAPI(url);
};

util.inherits(FlowerBridge, EventEmitter);

FlowerBridge.prototype.loginToApi = function(credentials, callback) {
	var self = this;

	self.api.login(credentials, function(err, token) {
		if (!err) self.emit('login', token);
		if (typeof callback != 'undefined') callvack(err, token);
	});
};

FlowerBridge.prototype.logTime = function() {
	var dest = '[' + new Date().toString().substr(4, 20) + ']:';
	var argv = arguments;
	var i = 0;

	for (i; argv[i]; i++) {
		dest += ' ' + argv[i];
	}
	console.log(dest);
};

FlowerBridge.prototype.getState = function() {
	return (this._state);
};

FlowerBridge.prototype.getUser = function(callback) {
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
		if (error) self._state = 'off';
		else {
			var user = helpers.concatJson(results.userConfig, results.garden);
			self.user = user;
		}
		callback(error, user);
	});
};

FlowerBridge.prototype.automatic = function(options) {
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
};

FlowerBridge.prototype.processAll = function(options) {
	var self = this;

	if (self._state == 'off') {
		self._state = 'automatic';

		self.getUser(function(err, user) {
			if (err) self.logTime('Error in getInformationsCloud');
			else self._makeQueud(user, options);
		});
	}
};

FlowerBridge.prototype._makeQueud = function(user, options) {
	var self = this;
	var typeFilter = [];
	var fpPriority = [];

	if (typeof options != 'undefined') {
		if (typeof options['type'] != 'undefined') typeFilter = options['type'];
		if (typeof options['priority'] != 'undefined') fpPriority = options['priority'];
	}

	self.logTime(clc.yellow('New scan for', clc.bold(Object.keys(user.sensors).length), "sensors"));
	var q = async.queue(function(task, callbackNext) {
		var FP = new SyncFP(task.name, user, self.api);

		FP.on('newProcess', function(flowerPower) {
			self.emit('newProcess', flowerPower);
			if (flowerPower.lastProcess == 'Disconnected') return callbackNext();
			if (options.fnLog != 'undefined') options.fnLog(flowerPower);
		});
		FP.findAndConnect(function(err) {
			if (err) return callbackNext();
			self.syncFlowerPower(FP, function(err, res) {
				FP.disconnect();
			});
		});
	}, 1);

	q.drain = function() {
		self.logTime('All FlowerPowers have been processed\n');
		self._state = 'off';
	}

	for (var i = 0; i < fpPriority.length; i++) {
		q.push({name: fpPriority[i]});
	}

	for (var identifier in user.sensors) {
		if (typeFilter.length == 0) q.push({name: identifier});
		else {
			typeFilter.forEach(function(type) {
				if (identifier.toLowerCase().indexOf(type) != -1) {
					q.push({name: identifier});
				}
			});
		}
	}
};

FlowerBridge.prototype.syncFlowerPower = function(FP, callback) {
	async.series([
			function(callback) {
				FP.syncStatus(callback);
			},
			function(callback) {
				FP.syncSamples(callback);
			}
			], function(err, results) {
				callback(err, results);
			});
}

FlowerBridge.prototype.live = function() {

};

module.exports = FlowerBridge;
