var CloudAPI = require('./node-flower-power-cloud/flower-power-cloud').CloudAPI;
var FlowerPower = require('./node-flower-power/index');
var helpers = require('./helpers');
var comBle = require('./comBle');

var async = require('async');
var clc = require('cli-color');
var Chance = require('chance');
var chance = new Chance();

var dataCloud;
var running = false;

var API = new CloudAPI({
  clientID: 'parrottest.fpwebservice@gmail.com',
  clientSecret: 'cvSjfnONllkHLymF2gEUL73PPXJiMMcVCd1VtZaIXHSGyhaT'
});

API.on('error', function(err) {
  helpers.logTime('background error: ' + err.message);
});

function start(delay) {
  API.login('parrottest.fpwebservice@gmail.com', 'Parrot2015FP', function(err) {
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
    sensors: function(callback) {
      API.getGarden(function(err, locations, sensors) {
        if (err) helpers.logTime('getGarden: ' + err.message);
        callback(err, sensors);
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
  helpers.logTime(clc.bold(Object.keys(dataCloud.sensors).length), "sensors");

  var q = async.queue(function(task, callback) {
    setTimeout(function() {
      if (task.state == 'standby') {
        FlowerPower.stopDiscoverAll(discover);
        helpers.proc(task.uuid, 'Not Found');
        callback();
      }
    }, 20000);

    helpers.proc(task.uuid, 'Searching');
    FlowerPower.discoverAll(discover);

    function discover(device) {
      var flowerPower = device;

      if (flowerPower.uuid == task.uuid) {
        FlowerPower.stopDiscoverAll(discover);

        if (flowerPower._peripheral.state == 'disconnected' && flowerPower.flags.hasEntry) {
          helpers.proc(flowerPower.uuid, 'Available');
          flowerPower._peripheral.on('disconnect', function() { helpers.proc(flowerPower.uuid, 'Disconnected'); callback();});
          flowerPower._peripheral.on('connect', function() { helpers.proc(flowerPower.uuid, 'Connected');});
          comBle.retrieveSamples(flowerPower, dataCloud, API);
          task.state = 'running';
        }
        else if (flowerPower._peripheral.state == 'disconnected') {
          task.state = 'uploaded';
          helpers.proc(flowerPower.uuid, "Don't need to be upload");
          helpers.iDontUseTheDevice(flowerPower, callback);
        }
        else if (flowerPower._peripheral.state == 'connecting') {
          task.state = 'connect';
          helpers.proc(flowerPower.uuid, "is on connection");
          helpers.iDontUseTheDevice(flowerPower, callback);
        }
        else {
          task.state = 'not available';
          helpers.proc(flowerPower.uuid, 'is not available: ' + flowerPower._peripheral.state);
          helpers.iDontUseTheDevice(flowerPower, callback);
        }
      }
      else {
        helpers.iDontUseTheDevice(device);
      }
    }
  }, 1);

  q.drain = function() {
    helpers.logTime('All FlowerPowers have been updated, or not');
    running = false;
    firstEmit = true;
  }

  for (var uuid in dataCloud.sensors) {
    uuid = helpers.uuidCloudToPeripheral(uuid);
    q.push({uuid: uuid, state: 'standby'});
    if (typeof helpers.fp[uuid] == 'undefined') {
      helpers.fp[uuid] = {};
      helpers.fp[uuid].color = chance.natural({min: 100, max: 200});
    }
    helpers.fp[uuid].process = 'none';
    helpers.fp[uuid].date = new Date().toString().substr(4, 20);
  }
  helpers.proc();
}

exports.start = start;
