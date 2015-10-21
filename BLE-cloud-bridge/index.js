var CloudAPI = require('./node-flower-power-cloud/flower-power-cloud').CloudAPI;
var FlowerPower = require('./node-flower-power/index');
var helpers = require('./helpers');
var credentials = require('./credentials');

var async = require('async');
var clc = require('cli-color');
var Chance = require('chance');
var chance = new Chance();

var dataCloud;
var running = false;


var API = new CloudAPI({
  clientID: credentials.clientID,
  clientSecret: credentials.clientSecret,
  url: credentials.url
});

API.on('error', function(err) {
  helpers.logTime('background error: ' + err.message);
});

function start(delay) {
  API.login(credentials.username, credentials.passphrase, function(err) {
    if (!!err) {
      return helpers.logTime(clc.red('login error: ' + err.message));
    }
    else {
      helpers.logTime(clc.green('LogIn Successful!'));

      run();
      setInterval(function() {
        if (!running) {
          run();
        }
      }, delay);
    }
  });
}

function run() {
  running = true;
  getInformationsCloud(function(err) {
    if (err) {
      helpers.logTime('Error in getInformationsCloud');
      running = false;
    }
    else discoverAllFlowerPowers();
  });
}

function getInformationsCloud(callback) {
  async.parallel({
    garden: function(callback) {
      API.getGarden(function(err, garden) {
        if (err) logTime('getGarden: ' + err.message);
        callback(err, garden);
      })
    },
    userConfig: function(callback) {
      API.getUserConfig(function(err, config) {
        callback(err, config);
      })
    },
  }, function(error, results) {
    var sensors = {};

    dataCloud = helpers.concatJson(results.userConfig, results.garden);
    for (var i in dataCloud.locations) {
      if (dataCloud.locations[i].sensor) {
        sensors[dataCloud.locations[i].sensor.sensor_identifier] = dataCloud.locations[i];
      }
    }
    delete dataCloud.locations;
    dataCloud.sensors = sensors;
    callback(error);
  });
}

function discoverAllFlowerPowers() {
  helpers.logTime(clc.yellow('New scan for', clc.bold(Object.keys(dataCloud.sensors).length), "sensors"));

  var q = async.queue(function(task, callbackNext) {
    var discover = function(device) {
      if (device.name == task.name) {
        FlowerPower.stopDiscoverAll(discover);
        beginProccess(device, task, callbackNext);
      }
      else {
        helpers.iDontUseTheDevice(device);
      }
    };

    helpers.proc(task.name, 'Searching');
    FlowerPower.discoverAll(discover);

    setTimeout(function() {
      if (task.state == 'standby') {
        FlowerPower.stopDiscoverAll(discover);
        helpers.proc(task.name, 'Not Found');
        helpers.tryCallback(callbackNext);
      }
    }, 30000);
  }, 1);

  q.drain = function() {
    helpers.logTime('All FlowerPowers have been processed\n');
    running = false;
    firstEmit = true;
  }

  for (var identifier in dataCloud.sensors) {
    q.push({name: identifier, state: 'standby'});
    if (typeof helpers.fp[identifier] == 'undefined') {
      helpers.fp[identifier] = {};
      helpers.fp[identifier].color = chance.natural({min: 100, max: 200});
    }
    helpers.fp[identifier].process = 'None';
    helpers.fp[identifier].date = new Date().toString().substr(4, 20);
  }
  helpers.proc();
}



function beginProccess(flowerPower, task, callbackNext) {
  if (flowerPower._peripheral.state == 'disconnected' && flowerPower.flags.hasEntry) {
    helpers.proc(flowerPower.name, 'Connection');
    flowerPower._peripheral.on('disconnect', function() {
      helpers.proc(flowerPower.name, 'Disconnected');
      setTimeout(function() {
        helpers.tryCallback(callbackNext);
      }, 2000);
    });
    flowerPower._peripheral.on('connect', function() {
      helpers.proc(flowerPower.name, 'Connected');
    });
    retrieveSamples(flowerPower);
    task.state = 'running';
  }
  else if (flowerPower._peripheral.state == 'disconnected') {
    task.state = 'uploaded';
    helpers.proc(flowerPower.name, "No update required");
    helpers.iDontUseTheDevice(flowerPower, callbackNext);
  }
  else if (flowerPower._peripheral.state == 'connecting') {
    task.state = 'connect';
    helpers.proc(flowerPower.name, "is on connection");
    helpers.iDontUseTheDevice(flowerPower, callbackNext);
  }
  else {
    task.state = 'not available';
    helpers.proc(flowerPower.name, 'is not available: ' + flowerPower._peripheral.state);
    helpers.iDontUseTheDevice(flowerPower, callbackNext);
  }
}

function retrieveSamples(flowerPower) {
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
    if (!err) {
      sendSamples(flowerPower, dataBLE);
    }
    else {
      helpers.logTime('Error: retrieveSamples()');
      disconnectFlowerPower(flowerPower);
    }
  });
}

function sendSamples(flowerPower, dataBLE, callback) {
  var firstEntryIndex = dataBLE.history_last_entry_index - dataBLE.history_nb_entries + 1;
  var startIndex = ((dataCloud.sensors[flowerPower.name].sensor.current_history_index >= firstEntryIndex) ? dataCloud.sensors[flowerPower.name].sensor.current_history_index : firstEntryIndex);

  if (startIndex > dataBLE.history_last_entry_index) {
    finishUpdate(flowerPower, null, null);
  }
  else {
    helpers.proc(flowerPower.name, 'Getting samples');
    flowerPower.getHistory(startIndex, function(error, history) {
      dataBLE.buffer_base64 = history;
      var param = helpers.makeParam(flowerPower, dataBLE, dataCloud);
      API.sendSamples(param, function(error, buffer) {
        finishUpdate(flowerPower, error, buffer);
      });
    });
  }
}

function finishUpdate(flowerPower, err, buffer) {
  if (err) helpers.proc(flowerPower.name, 'Error send History');
  else if (buffer) helpers.proc(flowerPower.name, 'Updated');
  else helpers.proc(flowerPower.name, 'No update required');
  disconnectFlowerPower(flowerPower);
}

function disconnectFlowerPower(flowerPower) {
  if (flowerPower._peripheral.state == 'connected') {
    flowerPower.disconnect(function(err) {});
  }
}

exports.start = start;
