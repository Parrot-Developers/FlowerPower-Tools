var async = require('async');
var helpers = require('./helpers');

var dataCloud;
var API;

function retrieveSamples(flowerPower, cloud, api) {
  dataCloud = cloud;
  API = api;
  getInformationsFlowerPower(flowerPower, function(err, dataBLE) {
    if (!err) {
      delete dataBLE.connected;
      dataBLE.uuid = flowerPower.uuid;
      sendHistory(flowerPower, dataBLE, finishUpdate);
    }
    else {
      helpers.logTime('Error: retrieveSamples()');
      flowerPower.disconnect(function(err) {});
    }
  });
}

function finishUpdate(flowerPower, err, buffer) {
  if (err) helpers.proc(flowerPower.uuid, 'Error send History');
  else if (buffer) helpers.proc(flowerPower.uuid, 'Updated');
  flowerPower.disconnect(function(err) {});
}

function sendHistory(flowerPower, dataBLE, callback) {
  var firstEntryIndex = dataBLE.history_last_entry_index - dataBLE.history_nb_entries + 1;
  var startIndex = ((dataCloud.sensors[helpers.uuidPeripheralToCloud(flowerPower.uuid)].current_history_index >= firstEntryIndex) ? dataCloud.sensors[helpers.uuidPeripheralToCloud(flowerPower.uuid)].current_history_index : firstEntryIndex);

  if (startIndex > dataBLE.history_last_entry_index) {
    helpers.proc(flowerPower.uuid, 'No update required');
    callback(flowerPower);
  }
  else {
    helpers.proc(flowerPower.uuid, 'Start getting samples');
    flowerPower.getHistory(startIndex, function(error, history) {
      dataBLE.buffer_base64 = history;
      var param = makeParam(flowerPower, dataBLE);
      API.sendSamples(param, function(error, buffer) {
        callback(flowerPower, error, buffer);
      });
    });
  }
}

function getInformationsFlowerPower(flowerPower, callback) {
  async.series({
    connected: function(callback) {

      flowerPower.connectAndSetup(callback);
    },
    history_nb_entries: function(callback) {
      flowerPower.getHistoryNbEntries(callback);
    },
    history_last_entry_index: function(callback) {
      flowerPower.getHistoryLastEntryIdx(callback);
    },
    history_current_session_id: function(callback) {
      flowerPower.getHistoryCurrentSessionID(callback);
    },
    history_current_session_start_index: function(callback) {
      flowerPower.getHistoryCurrentSessionStartIdx(callback);
    },
    history_current_session_period: function(callback) {
      flowerPower.getHistoryCurrentSessionPeriod(callback);
    },
    start_up_time: function(callback) {
      flowerPower.getStartupTime(callback);
    },
  }, function(err, dataBLE) {
    callback(err, dataBLE);
  });
}


function makeParam(flowerPower, dataBLE) {
  var results = {};

  var session = {};
  var uploads = {};

  results["client_datetime_utc"] = new Date().toISOString();
  results["user_config_version"] = dataCloud.userConfig.user_config_version;
  results["plant_science_database_identifier"] = "en_20150210_2.1";

  session["sensor_serial"] = flowerPower.name;
  session["sensor_startup_timestamp_utc"] = dataBLE.start_up_time;
  session["session_id"] = dataBLE.history_current_session_id;
  session["session_start_index"] = dataBLE.history_current_session_start_index;
  session["sample_measure_period"] = dataBLE.history_current_session_period;

  uploads["sensor_serial"] = flowerPower.name;
  uploads["upload_timestamp_utc"] = new Date().toISOString();
  uploads["buffer_base64"] = dataBLE.buffer_base64;
  uploads["app_version"] = "";
  uploads["sensor_fw_version"] = "";
  uploads["sensor_hw_identifier"] ="";

  results["session_histories"] = [session];
  results["uploads"] = [uploads];

  return results;
}

exports.retrieveSamples = retrieveSamples;
