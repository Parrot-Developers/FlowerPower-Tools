var SyncFP = require('./SyncFP');

var helpers = require('./helpers');
var async = require('async');
var clc = require('cli-color');
var Chance = require('chance');
var chance = new Chance();


// Load page getUser
// When automatic process getUser to create Queud and make param for API
function Pannel(api) {
  this._state = 'off';
  this.user = null;
  this.api = api;
}

Pannel.prototype.loginToApi = function(credentials, callback) {
  this.api.login(credentials, callback);
}

Pannel.prototype.getState = function() {
  return (this._state);
}

Pannel.prototype._init = function() {
  this.getUser(function(err, user) {
    if (err) helpers.logTime('Error in getInformationsCloud');
    else {
      console.log('Init');
    }
  });
}

Pannel.prototype.getUser = function(callback) {
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
    var user = helpers.concatJson(results.userConfig, results.garden);
    self.user = user;
    callback(error, user);
  });
}


Pannel.prototype.automatic = function(delay) {
  var self = this;

  if (typeof delay == 'undefined') delay = 15 * 60 * 1000;
  self.processAll();
  setInterval(function() {
    self.processAll();
  }, delay);
}

Pannel.prototype.processAll = function() {
  var self = this;

  if (self._state == 'off') {
    self._state = 'automatic';

    self.getUser(function(err, user) {
      if (err) helpers.logTime('Error in getInformationsCloud');
      else self._makeQueud(user);
    });

  }
}

Pannel.prototype._makeQueud = function(user) {
  var self = this;
  var typeFilter = [];

  helpers.logTime(clc.yellow('New scan for', clc.bold(Object.keys(user.sensors).length), "sensors"));
  var q = async.queue(function(task, callbackNext) {
    var FP = new SyncFP(task.name, user, self.api);

    async.series([
      function(callback) {
        FP.findAndConnect(callbackNext, callback);
      },
      function(callback) {
        self.syncFlowerPower(FP, callback);
      }
    ], function(err, results) {
      if (err != 'Not found') FP.disconnect();
      else callbackNext();
    });

  }, 1);

  q.drain = function() {
    helpers.logTime('All FlowerPowers have been processed\n');
    self._state = 'off';
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

    if (typeof helpers.fp[identifier] == 'undefined') {
      helpers.fp[identifier] = {};
      helpers.fp[identifier].color = chance.natural({min: 100, max: 200});
    }
    helpers.fp[identifier].process = 'None';
    helpers.fp[identifier].date = new Date().toString().substr(4, 20);
  }
  helpers.proc();
}

Pannel.prototype.syncFlowerPower = function(FP, callback) {
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

Pannel.prototype.live = function() {

}

module.exports = Pannel;
