var async = require('async');
var helpers = require('./helpers');
var FlowerPower = require('../node-flower-power/index');
var clc = require('cli-color');

function TaskFP(flowerPowerName) {
  this.name = flowerPowerName;
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
    water_tank_level: "getWaterTankLevel",
    watering_algorithm_status: "getWateringAlgorithmStatus",
    status_flags: 'getStatusFlags',
    watering_mode: 'getWateringMode',
    next_watering_date: 'getNextWateringDateTime',
    full_tank_autonomy: 'getFullTankAutonomy',
    next_empty_tank_date: 'getNextEmptyTankDate',
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
  helpers.proc(self.name, 'Searching');

  var discover = function(device) {
    if (device.name == self.name) {
      self.FP = device;
      FlowerPower.stopDiscoverAll(discover);
      self.process.unshift('Found');
      helpers.proc(self.FP.name, 'Found');
      return callback(null, device);
    }
    else self.destroy(device);
  };
  setTimeout(function() {
    if (self.process[0] == 'Searching') {
      self.process.unshift('Not found');
      helpers.proc(self.name, 'Not found', true);
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
    helpers.proc(self.FP.name, 'Disconnected', false);
    helpers.tryCallback(callbackBind);
    self.destroy(self.FP);
  });
  self.FP._peripheral.on('connect', function() {
    self.process.unshift('Connected');
    helpers.proc(self.FP.name, 'Connected', false);
  });

  if (self.FP._peripheral.state == 'disconnected') { // and flags...
    self.process.unshift('Connection');
    helpers.proc(self.FP.name, 'Connection', false);
    return callback(null);
  }
  else if (self.FP._peripheral.state == 'connecting') {
    self.process.unshift('Not available');
    helpers.proc(self.FP.name, "is on connection");
    return callback('Connecting');
  }
  else {
    self.process.unshift('Not available ' + + self.FP._peripheral.state);
    helpers.proc(self.FP.name, 'is not available: ' + self.FP._peripheral.state, true);
    return callback('Not available');
  }
}

TaskFP.prototype.connect = function(callback) {
  var self = this;

  setTimeout(function() {
    if (self.process[0] == 'Connection') {
      self.process.unshift('Connection failed');
      helpers.proc(self.FP.name, 'Connection failed', true);
      self.destroy(self.FP);
      throw (self.FP.name + ': Connection failed');
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
  helpers.proc(self.FP.name, 'Getting samples', false);
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
    var cloudIndex = self.user.sensors[self.FP.name].sensor.current_history_index;

    dataBLE.hardware_version = hw_v.substr(0, (hw_v.indexOf('\u0000')) ? hw_v.indexOf('\u0000') : hw_v.length);
    dataBLE.firmware_version = fw_v.substr(0, (fw_v.indexOf('\u0000')) ? fw_v.indexOf('\u0000') : fw_v.length);
    var firstEntryIndex = dataBLE.history_last_entry_index - dataBLE.history_nb_entries + 1;
    var startIndex = ((cloudIndex >= firstEntryIndex) ? cloudIndex : firstEntryIndex);
    self.FP.getHistory(startIndex, function(error, history) {
      dataBLE.buffer_base64 = history;
      return callback(error, dataBLE);
    });
  });
}

TaskFP.prototype.getStatusWatering = function(callback) {
  var self = this;

  self.process.unshift('Getting status watering');
  helpers.proc(self.FP.name, 'Getting status watering', false);
  var watering = {
    'status_key': 'status_ok',
    'instruction_key': 'soil_moisture_good',
    'soil_moisture': {
      'status_key': 'status_ok',
      'instruction_key': 'soil_moisture_good',
      'current_vwc': 0
    },
    'automatic_watering': {
      'status_key': 'status_ok',
      'instruction_key': 'automatic_watering_off',
      'next_watering_datetime_utc': null,
      'full_autonomy_days': null,
      'predicted_action_datetime_utc': null,
      'current_water_level': 0
    }
  };

  self.readDataBLE(['soil_percent_vwc']).then(function(dataCommun) {

    watering['soil_moisture']['current_vwc'] = dataCommun.soil_percent_vwc;

    if (self.FP.generation == 1) return callback(null, watering);
    else if (self.FP.generation == 2) {
      self.readDataBLE([
        'status_flags'
      ]).then(function(dataFlags) {
        if (dataFlags.status_flags['Soil dry'] && !dataFlags.status_flags['Soil wet']) {
          watering['soil_moisture']['status_key'] = 'status_critical';
          watering['soil_moisture']['instruction_key'] = 'soil_moisture_too_low';
        }
        else if (!dataFlags.status_flags['Soil dry'] && dataFlags.status_flags['Soil wet']) {
          watering['soil_moisture']['status_key'] = 'status_warning';
          watering['soil_moisture']['instruction_key'] = 'soil_moisture_too_high';
        }

        if (self.FP.type == 'Flower power') return callback(null, watering);
        else {
          self.readDataBLE([
            'next_watering_date',
            'next_empty_tank_date',
            'full_tank_autonomy',
            'watering_mode',
            'watering_algorithm_status',
            'water_tank_level'
          ]).then(function(dataWatering) {
            watering['automatic_watering']['next_watering_datetime_utc'] = (dataPlantDoctor.next_watering_date) ? dataPlantDoctor.next_watering_date.toISOString() : null;
            watering['automatic_watering']['predicted_action_datetime_utc'] = (dataPlantDoctor.next_empty_tank_date) ? dataPlantDoctor.next_empty_tank_date.toISOString() : null;
            watering['automatic_watering']['full_autonomy_days'] = (dataPlantDoctor.full_tank_autonomy) ? dataPlantDoctor.full_tank_autonomy : null;

            if (dataWatering.watering_mode == 'Manual') return callback(null, watering);
            else {
              watering['automatic_watering']['current_water_level'] = dataWatering.water_tank_level;
              watering['automatic_watering']['status_key'] = 'status_critical';
              if (dataWatering.watering_algorithm_status == 'Error vwc still') watering['automatic_watering']['instruction_key'] = 'automatic_watering_check_system';
              else if (dataWatering.watering_algorithm_status == 'Error internal') watering['automatic_watering']['instruction_key'] = 'automatic_watering_unkwown_error';
              else {
                if (dataPlantDoctor.status_flags['Sensor in air']) {
                  watering['automatic_watering']['status_key'] = 'status_warning';
                  watering['automatic_watering']['instruction_key'] = 'automatic_watering_in_air';
                }
                else if (dataPlantDoctor.status_flags['Tank empty']) {
                  watering['automatic_watering']['status_key'] = 'status_critical';
                  watering['automatic_watering']['instruction_key'] = 'automatic_watering_reserve_empty';
                }
                else {
                  watering['automatic_watering']['status_key'] = 'status_ok';
                  watering['automatic_watering']['instruction_key'] = 'automatic_watering_good';
                }
              }
              watering['status_key'] = watering['automatic_watering']['status_key'];
              watering['instruction_key'] = watering['automatic_watering']['instruction_key'];
              return callback(null, watering);
            }
          });
        }
      });
    }
  });
}


//
//
// TaskFP.prototype.makeStatusWatering = function(dataBLE, callback) {
//   var self = this;
//
//   self.readDataBLE([
//     'status_flags',
//     'soil_percent_vwc'
//   ]).then(function(communTypeDataBLE) {
//     var watering = {};
//     var soil_moisture = {};
//     var automatic_watering = {};
//
//     soil_moisture['current_vwc'] = communTypeDataBLE.soil_percent_vwc;
//     if (communTypeDataBLE.status_flags['Soil dry'] && !communTypeDataBLE.status_flags['Soil wet']) {
//       soil_moisture['status_key'] = 'status_critical';
//       soil_moisture['instruction_key'] = 'soil_moisture_too_low';
//     }
//     else if (!communTypeDataBLE.status_flags['Soil dry'] && communTypeDataBLE.status_flags['Soil wet']) {
//       soil_moisture['status_key'] = 'status_warning';
//       soil_moisture['instruction_key'] = 'soil_moisture_too_high';
//     }
//     else {
//       soil_moisture['status_key'] = 'status_ok';
//       soil_moisture['instruction_key'] = 'soil_moisture_good';
//     }
//     automatic_watering['status_key'] = 'status_ok';
//     automatic_watering['instruction_key'] = 'automatic_watering_off';
//     automatic_watering['next_watering_datetime_utc'] = null;
//     automatic_watering['full_autonomy_days'] = null;
//     automatic_watering['predicted_action_datetime_utc'] = null;
//     automatic_watering['current_water_level'] = 0;
//
//     if (typeof dataBLE != undefined) {
//       if ((self.FP.type == 'Pot' || self.FP.type == 'H2o') && dataBLE.watering_mode != 'Manual') {
//         automatic_watering['next_watering_datetime_utc'] = (dataBLE.next_watering_date) ? dataBLE.next_watering_date.toISOString() : null;
//         automatic_watering['full_autonomy_days'] = (dataBLE.full_tank_autonomy) ? dataBLE.full_tank_autonomy : null;
//         automatic_watering['predicted_action_datetime_utc'] = (dataBLE.next_empty_tank_date) ? dataBLE.next_empty_tank_date.toISOString() : null;
//         automatic_watering['current_water_level'] = dataBLE.water_tank_level;
//
//         if (communTypeDataBLE.status_flags['Sensor in air']) {
//           automatic_watering['status_key'] = 'status_warning';
//           automatic_watering['instruction_key'] = 'automatic_watering_in_air';
//         }
//         else if (communTypeDataBLE.status_flags['Tank empty']) {
//           automatic_watering['status_key'] = 'status_critical';
//           automatic_watering['instruction_key'] = 'automatic_watering_reserve_empty';
//         }
//         else {
//           automatic_watering['status_key'] = 'status_ok';
//           automatic_watering['instruction_key'] = 'automatic_watering_good';
//         }
//       }
//     }
//
//     watering['status_key'] = automatic_watering['status_key'];
//     watering['instruction_key'] =  automatic_watering['instruction_key'];
//     watering['soil_moisture'] = soil_moisture;
//     watering['automatic_watering'] = automatic_watering;;
//     return callback(null, watering);
//   });
// }

module.exports = TaskFP;
