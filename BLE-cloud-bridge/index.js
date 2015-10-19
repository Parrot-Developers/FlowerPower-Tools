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
    dataCloud = results;
    callback(error);
  });
}

function discoverAllFlowerPowers() {
  helpers.logTime(clc.yellow('New scan'));
  helpers.logTime(clc.bold(Object.keys(dataCloud.garden.status).length), "sensors");

  var q = async.queue(function(task, callback) {
    setTimeout(function() {
      if (task.state == 'standby') {
        FlowerPower.stopDiscoverAll(discover);
        helpers.proc(task.name, 'Not Found');
        callback();
      }
    }, 30000);

    helpers.proc(task.name, 'Searching');
    FlowerPower.discoverAll(discover);

    function discover(device) {
      var flowerPower = device;

      if (flowerPower.name == task.name) {
        FlowerPower.stopDiscoverAll(discover);

        if (flowerPower._peripheral.state == 'disconnected' && flowerPower.flags.hasEntry) {
          helpers.proc(flowerPower.name, 'Connection');
          flowerPower._peripheral.on('disconnect', function() {
            helpers.proc(flowerPower.name, 'Disconnected');
            setTimeout(function() {
             callback();
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
          helpers.iDontUseTheDevice(flowerPower, callback);
        }
        else if (flowerPower._peripheral.state == 'connecting') {
          task.state = 'connect';
          helpers.proc(flowerPower.name, "is on connection");
          helpers.iDontUseTheDevice(flowerPower, callback);
        }
        else {
          task.state = 'not available';
          helpers.proc(flowerPower.name, 'is not available: ' + flowerPower._peripheral.state);
          helpers.iDontUseTheDevice(flowerPower, callback);
        }
      }
      else {
        helpers.iDontUseTheDevice(device);
      }
    }

    function retrieveSamples(flowerPower) {
      getInformationsFlowerPower(flowerPower, function(err, dataBLE) {
        if (!err) {
          sendSamples(flowerPower, dataBLE, finishUpdate);
        }
        else {
          helpers.logTime('Error: retrieveSamples()');
          disconnectFlowerPower(flowerPower);
        }
      });
    }

    function sendSamples(flowerPower, dataBLE, callback) {
      var firstEntryIndex = dataBLE.history_last_entry_index - dataBLE.history_nb_entries + 1;
      var startIndex = ((dataCloud.garden.status[flowerPower.name].sensor.current_history_index >= firstEntryIndex) ? dataCloud.garden.status[flowerPower.name].sensor.current_history_index : firstEntryIndex);

      if (startIndex > dataBLE.history_last_entry_index) {
        helpers.proc(flowerPower.name, 'No update required');
        callback(flowerPower);
      }
      else {
        helpers.proc(flowerPower.name, 'Getting samples');
        flowerPower.getHistory(startIndex, function(error, history) {
          dataBLE.buffer_base64 = history;
          var param = helpers.makeParam(flowerPower, dataBLE, dataCloud);
          API.sendSamples(param, function(error, buffer) {
            callback(flowerPower, error, buffer);
          });
        });
      }
    }

    function finishUpdate(flowerPower, err, buffer) {
      if (err) helpers.proc(flowerPower.name, 'Error send History');
      else if (buffer) helpers.proc(flowerPower.name, 'Updated');
      disconnectFlowerPower(flowerPower);
    }

    function disconnectFlowerPower(flowerPower) {
      if (flowerPower._peripheral.state == 'connected') {
        flowerPower.disconnect(function(err) {});
      }
    }

  }, 1);

  q.drain = function() {
    helpers.logTime('All FlowerPowers have been updated, or not');
    running = false;
    firstEmit = true;
  }

  for (var identifier in dataCloud.garden.status) {
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


exports.start = start;
