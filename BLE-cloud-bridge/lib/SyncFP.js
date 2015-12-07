var TaskFP = require('./TaskFP');
var helpers = require('./helpers');

function SyncFP(flowerPowerUuid, user, api) {
	TaskFP.call(this, flowerPowerUuid);
	this.user = user;
	this.api = api;
	this.process = [];
}

SyncFP.prototype = new TaskFP;

SyncFP.prototype.syncSamples = function(callback) {
	var self = this;

	self.getSamples(function(err, dataBLE) {
		self.process.unshift('Sending samples');
		helpers.proc(self.FP.uuid, 'Sending samples', false);
		var param = {};
		var session = {};
		var uploads = {};
		var now = new Date();

		param["tmz_offset"] = self.user.user_profile.tmz_offset;
		param["client_datetime_utc"] = now.toISOString();
		param["user_config_version"] = self.user.user_config_version;

		session["sensor_serial"] = helpers.uuidPeripheralToCloud(self.FP.uuid);
		session["sensor_startup_timestamp_utc"] = dataBLE.start_up_time;
		session["session_id"] = dataBLE.history_current_session_id;
		session["session_start_index"] = dataBLE.history_current_session_start_index;
		session["sample_measure_period"] = dataBLE.history_current_session_period;

		uploads["sensor_serial"] = helpers.uuidPeripheralToCloud(self.FP.uuid);
		uploads["upload_timestamp_utc"] = now.toISOString();
		uploads["buffer_base64"] = dataBLE.buffer_base64;
		uploads["app_version"] = "";
		uploads["sensor_fw_version"] = dataBLE.firmware_version;
		uploads["sensor_hw_identifier"] = dataBLE.hardware_version;

		param["session_histories"] = [session];
		param["uploads"] = [uploads];

		self.api.sendSamples(param, function(error, resutls) {
			if (!error) {
				self.state = 'Updated';
				helpers.proc(self.FP.uuid, 'Updated', true);
			}
			else {
				self.state = 'Failed to updated';
				// console.log(error);
				helpers.proc(self.FP.uuid, 'Failed to updated', true);
			}
		return callback(error, resutls);
		});
	});
}

SyncFP.prototype.syncStatus = function(callback) {
	var self = this;

	self.getStatusWatering(function(err, watering) {
		self.process.unshift('Sending status watering');
		helpers.proc(self.FP.uuid, 'Sending status watering', false);
		var param = {};
		var update_status = {};
		var now = new Date();

		param["client_datetime_utc"] = now.toISOString();
		param["user_config_version"] = self.user.user_config_version;
		update_status['location_identifier'] = self.user.sensors[self.FP.uuid].location_identifier;
		update_status['status_creation_datetime_utc'] =  self.user.sensors[self.FP.uuid].status_creation_datetime_utc;
		update_status['watering'] = watering;

		param['update_status'] = [update_status];
		self.api.sendGardenStatus(param, function(error, results) {
			if (!error) {
				self.state = 'Status updated';
				helpers.proc(self.FP.uuid, 'Status updated', true);
			}
			else {
				self.state = 'Failed to status updated';
				helpers.proc(self.FP.uuid, 'Failed to status updated', true);
			}
		return callback(error, self.state);
		});
	});
}

module.exports = SyncFP;
