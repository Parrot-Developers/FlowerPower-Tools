var async = require('async');
var helpers = require('./helpers');
var FlowerPower = require('../node-flower-power/index');
var clc = require('cli-color');

var charac = {
  history_nb_entries: "getHistoryNbEntries",
  history_last_entry_index: "getHistoryLastEntryIdx",
  history_current_session_id: "getHistoryCurrentSessionID",
  history_current_session_start_index: "getHistoryCurrentSessionStartIdx",
  history_current_session_period: "getHistoryCurrentSessionPeriod",
  start_up_time: "getStartupTime",
};


function findAndConnect(task, callback) {
  search(task, function(err, device) {
    if (err) callback(err);
    else {
      async.series([
        function(callback) {
          init(device, task, callback);
        },
        function(callback) {
          connect(device, task, callback);
        }
      ], function(err) {
        if (err) {
          destroy(device);
          callback(err, null);
        }
        else callback(null, device);
      });
    }
  });
}

function search(task, callback) {
  task.state = 'Searching';

    var discover = function(device) {
      if (device.uuid == task.uuid) {
        FlowerPower.stopDiscoverAll(discover);
        task.state = 'found';
        return callback(null, device);
      }
      else destroy(device);
    };
    setTimeout(function() {
      if (task.state == 'Searching') {
        FlowerPower.stopDiscoverAll(discover);
        helpers.proc(task.uuid, 'Not Found', true);
        task.state = 'Not found';
        return callback('Not Found');
      }
    }, 30000);

    helpers.proc(task.uuid, 'Searching', false);
    FlowerPower.discoverAll(discover);
}



function init(flowerPower, task, callback) {
  flowerPower._peripheral.on('disconnect', function() {
    helpers.proc(flowerPower.uuid, 'Disconnected', false);
    destroy(flowerPower);
  });
  flowerPower._peripheral.on('connect', function() {
    task.state = 'Running';
    helpers.proc(flowerPower.uuid, 'Connected', false);
  });

  if (flowerPower._peripheral.state == 'disconnected') {
    task.state = 'Svailable';
    helpers.proc(flowerPower.uuid, 'Connection', false);
    return callback(null);
  }
  else if (flowerPower._peripheral.state == 'disconnected') {
    task.state = 'Uploaded';
    helpers.proc(flowerPower.uuid, "No update required");
    return callback('Uploaded');
  }
  else if (flowerPower._peripheral.state == 'connecting') {
    task.state = 'Connect';
    helpers.proc(flowerPower.uuid, "is on connection");
    return callback('Connecting');
  }
  else {
    task.state = 'Not available';
    helpers.proc(flowerPower.uuid, 'is not available: ' + flowerPower._peripheral.state, true);
    return callback('Not available');
  }
}

function connect(flowerPower, task, callback) {
  setTimeout(function () {
    if (task.state == 'Available') {
      helpers.proc(flowerPower.uuid, 'Connection failed', true);
      destroy(flowerPower);
      throw (flowerPower.uuid + ': Connection failed');
    }
  }, 30000);

  flowerPower.connectAndSetup(function() {
    callback(null);
  });
}

function disconnect(flowerPower, callback) {
  flowerPower.disconnect(function() {
    destroy(flowerPower);
    if (typeof callback == 'function') callback(null);
  });
}

function destroy(device) {
  device._peripheral.removeAllListeners();
  device.removeAllListeners();
  device = null;
}

function makeFn(flowerPower, fnName) {
  return function(callback) {
    flowerPower[fnName](callback);
  };
}

function readDataBLE(flowerPower, keys) {
  return new Promise(function(resolve, reject) {
    var array = {};

    for (var i in keys) {
      array[keys[i]] = makeFn(flowerPower, charac[keys[i]]);
    }
    async.parallel(array, function(err, results) {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function getSamples(flowerPower, task, startIndex, callback) {
  flowerPower.getHistory(startIndex, function(error, history) {
    callback(error, history);
  });
}

function sendSamples(flowerPower, task, param, api, callback) {
  api.sendSamples(param, function(error, resutls) {
    // console.log(clc.underline("ERROR:"), resutls[0]);
    // console.log(clc.underline("BEFFER:"), resutls);
    if (!error) {
      task.state = 'Updated';
      helpers.proc(flowerPower.uuid, 'Updated', true);
    }
    else {
      task.state = 'Failed to updated';
      helpers.proc(flowerPower.uuid, 'Failed to updated', true);
    }
    callback(error, resutls);
  });
}


exports.init = init;
exports.search = search;
exports.connect = connect;
exports.destroy = destroy;
exports.getSamples = getSamples;
exports.disconnect = disconnect;
exports.sendSamples = sendSamples;
exports.readDataBLE = readDataBLE;
exports.findAndConnect = findAndConnect;
