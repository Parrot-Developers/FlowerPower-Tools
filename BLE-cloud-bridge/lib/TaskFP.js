var async = require('async');
var clc = require('cli-color');
var util = require('util');
var EventEmitter = require('events');
var helpers = require('./helpers');
var FlowerPower = require('../node-flower-power/index');

function TaskFP(flowerPowerUuid) {
	EventEmitter.call(this);
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
};

util.inherits(TaskFP, EventEmitter);

TaskFP.prototype.proc = function(processMsg, pushDb) {
	var self = this;

	self.process.unshift(processMsg);
	self.emit('process', {
		uuid: self.uuid,
		state: processMsg,
		date: new Date()
	});
};

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
};

TaskFP.prototype.findAndConnect = function(callback) {
	var self = this;

	self.search(function(err, device) {
		if (err) return callback(err);
		else {
			async.series([
				function(callback) {
					self.init(callback);
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
};

TaskFP.prototype.search = function(callback) {
	var self = this;

	self.proc('Searching');
	var discover = function(device) {
		if (device.uuid == self.uuid) {
			self.FP = device;
			FlowerPower.stopDiscoverAll(discover);
			self.proc('Found');
			return callback(null, device);
		}
		else self.destroy(device);
	};
	setTimeout(function() {
		if (self.process[0] == 'Searching') {
			FlowerPower.stopDiscoverAll(discover);
			self.proc('Not found', true);
			return callback('Not found');
		}
	}, 10000);

	FlowerPower.discoverAll(discover);
};

TaskFP.prototype.init = function(callback) {
	var self = this;

	self.FP._peripheral.on('disconnect', function() {
		self.proc('Disconnected');
		self.destroy(self.FP);
	});
	self.FP._peripheral.on('connect', function() {
		self.process.unshift('Connected');
		self.proc('Connected');
	});

	if (self.FP._peripheral.state == 'disconnected') {
		self.proc('Connection');
		return callback(null);
	}
	else if (self.FP._peripheral.state == 'connecting') {
		self.proc('Not availaible: is on connection');
		return callback('Connecting');
	}
	else {
		self.proc('Not available: ' + self.FP._peripheral.state, true);
		return callback('Not available');
	}
};

TaskFP.prototype.connect = function(callback) {
	var self = this;

	setTimeout(function() {
		if (self.process[0] == 'Connection') {
			self.proc('Connection failed', true);
			self.destroy(self.FP);
			throw (self.FP.uuid + ': Connection failed');
		}
	}, 30000);

	self.FP.connectAndSetup(function() {
		return callback(null);
	});
};

TaskFP.prototype.disconnect = function(callback) {
	var self = this;

	self.FP.disconnect(function() {
		if (typeof callback == 'function') return callback(null);
	});
};

TaskFP.prototype.destroy = function(device) {
	device._peripheral.removeAllListeners();
	device.removeAllListeners();
	device = null;
};

TaskFP.prototype.getSamples = function(callback) {
	var self = this;

	self.proc('Getting samples');
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
					self.proc('No update required', true);
					return callback('No update required');
				}
				self.FP.getHistory(startIndex, function(error, history) {
					dataBLE.buffer_base64 = history;
					return callback(error, dataBLE);
				});
			});
};

module.exports = TaskFP;
