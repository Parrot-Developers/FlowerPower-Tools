let taskFP = require('./taskFP');
let helpers = require('./helpers');
let async = require('async');
let clc = require('cli-color');
let Chance = require('chance');
let chance = new Chance();

export default class Pannel {
  constructor(api) {
    this._state = 'off';
    this.api = api;
    this.io = null;
  }

  loginToApi(credentials, callback) {
    this.api.login(credentials, callback);
  }

  setIo(io) {
    this.io = io;
  }

  getState() {
    return (this._state);
  }

  loadGarden() {
    console.log(".loadGarden()");
    this._init();
  }

  _init() {
    this.getUser((err, user) => {
      if (err) helpers.logTime('Error in getInformationsCloud');
      else {
        console.log('Init');
        this.io.emit('sensors', user.garden.sensors);
        // display all sensors
        // the handle will change HTML fater
        // For each refresh /garden, just call api to create the Page

        // buttun to start/stop automatic, live/graph on sensors
        // this.automatic();
      }
    });
  }

  getUser(callback) {
    async.series({
      garden: (callback) => {
        this.api.getGarden((err, garden) => {
          callback(err, garden);
        })
      },
      userConfig: (callback) =>{
        this.api.getProfile((err, config) => {
          callback(err, config);
        })
      },
    }, (error, results) => {
      let sensors = {};

      for (let i in results.garden.sensors) {
          if (results.garden.sensors[i].sensor_serial) {
          sensors[results.garden.sensors[i].sensor_serial] = results.garden.sensors[i];
        }
      }
      results.garden.sensors = sensors;
      callback(error, results);
    });
  }

  automatic(delay) {
    if (this._state == 'off') {
      this._state = 'automatic';

      this.getUser((err, user) => {
        if (err) helpers.logTime('Error in getInformationsCloud');
        else this._makeQueud(user);
      });

    }
    else console.log("Nooooo, I'm not available");
  }

  _checkToEmit(task, mess) {
    if (mess == 'Disconnected') {
      if (task.state != 'Updated') {
        this.io.emit('process', task.uuid, 'error');
      }
    }
    else {
      this.io.emit('process', task.uuid, mess);
    }
  }

  _makeQueud(user) {
    helpers.logTime(clc.yellow('New scan for', clc.bold(Object.keys(user.garden.sensors).length), "sensors"));

    var q = async.queue((task, callbackNext) => {
      this._checkToEmit(task, 'Searching');
      taskFP.findAndConnect(task, (err, flowerPower) => {
        if (err) {
          this._checkToEmit(task, 'Disconnected');
          helpers.tryCallback(callbackNext);
        }
        else {
          flowerPower._peripheral.on('disconnect', () => {
            this._checkToEmit(task, 'Disconnected');
            helpers.tryCallback(callbackNext);
          });
          this.syncFlowerPower(flowerPower, task, user, (err, history) => {
            if (err) this._checkToEmit(task, 'Failed to update');
            else this._checkToEmit(task, 'Updated');
            taskFP.disconnect(flowerPower);
          });
        }
      });
    }, 1);

    q.drain = function() {
      helpers.logTime('All FlowerPowers have been processed\n');
      running = false;
      firstEmit = true;
    }

    q.push({uuid: 'a0143d090cb8', state: 'standby'});
    for (let i in user.garden.sensors) {
      let uuid = helpers.uuidCloudToPeripheral(user.garden.sensors[i].sensor_serial);
      q.push({uuid: uuid, state: 'standby'});
      if (typeof helpers.fp[uuid] == 'undefined') {
        helpers.fp[uuid] = {};
        helpers.fp[uuid].color = chance.natural({min: 100, max: 200});
      }
      helpers.fp[uuid].process = 'None';
      helpers.fp[uuid].date = new Date().toString().substr(4, 20);
    }
    helpers.proc();
  }

  syncFlowerPower(flowerPower, task, user, callback) {
    taskFP.readDataBLE(flowerPower, [
      'history_nb_entries',
      'history_last_entry_index',
      'history_current_session_id',
      'history_current_session_start_index',
      'history_current_session_period',
      'start_up_time'
    ]).then((dataBLE) => {
      taskFP.getSamples(flowerPower, task, this.findStartIndex(flowerPower, dataBLE, user), (err, history) => {
        dataBLE.buffer_base64 = history;
        let param = helpers.makeParam(flowerPower, dataBLE, user);

        taskFP.sendSamples(flowerPower, task, param, this.api, (err, history) => {
          callback(err, history);
        });
      });
    });
  }

  findStartIndex(flowerPower, dataBLE, user) {
    let firstEntryIndex = dataBLE.history_last_entry_index - dataBLE.history_nb_entries + 1;
    let cloudIndex = user.garden.sensors[helpers.uuidPeripheralToCloud(flowerPower.uuid)].current_history_index;
    return ((cloudIndex >= firstEntryIndex) ? cloudIndex : firstEntryIndex) - 10;
    // return firstEntryIndex;
  }

  live() {

  }
};
