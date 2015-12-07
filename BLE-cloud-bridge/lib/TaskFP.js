var async = require('async');
var helpers = require('./helpers');
var FlowerPower = require('../node-flower-power/index');
var clc = require('cli-color');

function TaskFP(flowerPowerUuid) {
	this.uuid = flowerPowerUuid;
	this.FP = null;
	this.state = 'standby';
	this.charac = {
		firmware_version: "readFirmwareRevision",
		hardware_version: "readHardwareRevision",
		history_nb_entries: "getHistoryNbEntries",
		history_last_entry_index: "getHistoryLastEntryIdx",
		history_current_session_id: "getHistoryCurrentSessionID",
		history_current_session_start_index: "getHistoryCurrentSessionStartIdx",
		history_current_session_period: "getHistoryCurrentSessionPeriod",
		start_up_time: "getStartupTime",
		soil_percent_vwc: 'getCalibratedSoilMoisture'
	};

	return this;
}

TaskFP.prototype.readDataBLE = function(keys) {
	var self = this;

	return new Promise(function(resolve, reject) {
		var array = {};
		var makeFn = function(fnName) {
			return function(callback) {
				self.FP[fnName](callback);
			};
		}

		for (var i in keys) {
			array[keys[i]] = makeFn(self.charac[keys[i]]);
		}
		async.parallel(array, function(err, results) {
			if (err) reject(err);
			else resolve(results);
		});
	});
}

TaskFP.prototype.findAndConnect = function(callbackBind, callback) {
	var self = this;

	if (typeof callback == 'undefined') {
		callback = callbackBind;
		callbackBind = null;
	}

	self.search(function(err, device) {
		if (err) return callback(err);
		else {
			async.series([
				function(callback) {
					self.init(callbackBind, callback);
				},
				function(callback) {
					self.connect(callback);
				}
				], function(err) {
					if (err) self.destroy(device);
					return callback(err, null);
				});
		}
	});
}

TaskFP.prototype.search = function(callback) {
	var self = this;

	self.process.unshift('Searching');
	helpers.proc(self.uuid, 'Searching');

	var discover = function(device) {
		if (device.uuid == self.uuid) {
			self.FP = device;
			FlowerPower.stopDiscoverAll(discover);
			self.process.unshift('Found');
			helpers.proc(self.FP.uuid, 'Found');
			return callback(null, device);
		}
		else self.destroy(device);
	};
	setTimeout(function() {
		if (self.process[0] == 'Searching') {
			self.process.unshift('Not found');
			helpers.proc(self.uuid, 'Not found', true);
			FlowerPower.stopDiscoverAll(discover);
			return callback('Not found');
		}
	}, 30000);

	FlowerPower.discoverAll(discover);
}

TaskFP.prototype.init = function(callbackBind, callback) {
	var self = this;

	self.FP._peripheral.on('disconnect', function() {
		self.process.unshift('Disconnected');
		helpers.proc(self.FP.uuid, 'Disconnected', false);
		helpers.tryCallback(callbackBind);
		self.destroy(self.FP);
	});
	self.FP._peripheral.on('connect', function() {
		self.process.unshift('Connected');
		helpers.proc(self.FP.uuid, 'Connected', false);
	});

	if (self.FP._peripheral.state == 'disconnected') { // and flags...
		self.process.unshift('Connection');
		helpers.proc(self.FP.uuid, 'Connection', false);
		return callback(null);
	}
	else if (self.FP._peripheral.state == 'connecting') {
		self.process.unshift('Not available');
		helpers.proc(self.FP.uuid, "is on connection");
		return callback('Connecting');
	}
	else {
		self.process.unshift('Not available ' + self.FP._peripheral.state);
		helpers.proc(self.FP.uuid, 'is not available: ' + self.FP._peripheral.state, true);
		return callback('Not available');
	}
}

TaskFP.prototype.connect = function(callback) {
	var self = this;

	setTimeout(function() {
		if (self.process[0] == 'Connection') {
			self.process.unshift('Connection failed');
			helpers.proc(self.FP.uuid, 'Connection failed', true);
			self.destroy(self.FP);
			throw (self.FP.uuid + ': Connection failed');
		}
	}, 30000);

	self.FP.connectAndSetup(function() {
		return callback(null);
	});
}

TaskFP.prototype.disconnect = function(callback) {
	var self = this;

	self.FP.disconnect(function() {
		if (typeof callback == 'function') return callback(null);
	});
}

TaskFP.prototype.destroy = function(device) {
	device._peripheral.removeAllListeners();
	device.removeAllListeners();
	device = null;
}

TaskFP.prototype.getSamples = function(callback) {
	var self = this;

	self.process.unshift('Getting samples');
	helpers.proc(self.FP.uuid, 'Getting samples', false);
	self.readDataBLE([
			'history_nb_entries',
			'history_last_entry_index',
			'history_current_session_id',
			'history_current_session_start_index',
			'history_current_session_period',
			'start_up_time',
			'firmware_version',
			'hardware_version'
			]).then(function(dataBLE) {
				var hw_v = dataBLE.hardware_version;
				var fw_v = dataBLE.firmware_version;
				var cloudIndex = self.user.sensors[helpers.uuidPeripheralToCloud(self.FP.uuid)].current_history_index;
				var firstEntryIndex = dataBLE.history_last_entry_index - dataBLE.history_nb_entries + 1;
				var startIndex = (cloudIndex >= firstEntryIndex) ? cloudIndex : firstEntryIndex;

				dataBLE.hardware_version = hw_v.substr(0, (hw_v.indexOf('\u0000')) ? hw_v.indexOf('\u0000') : hw_v.length);
				dataBLE.firmware_version = fw_v.substr(0, (fw_v.indexOf('\u0000')) ? fw_v.indexOf('\u0000') : fw_v.length);

				if (startIndex > dataBLE.history_last_entry_index) {
					self.process.unshift('No update required');
					helpers.proc(self.FP.uuid, 'No update required', true);
					return callback('No update required');
				}
				self.FP.getHistory(startIndex, function(error, history) {
					dataBLE.buffer_base64 = history;
					return callback(error, dataBLE);
				});
			});
}

module.exports = TaskFP;
