var events = require('events');
var clc = require('cli-color');
var FlowerPower = require('../node-flower-power/index');
var Datastore = require('nedb');
var db = new Datastore({ filename: './database/process.db', autoload: true });

var emitter = new events.EventEmitter;
var fp = {};

var messColor = {
  'Connected': clc.green('Connected'),
  'No update required': clc.yellow('No update required'),
  'Updated': clc.green.bold('Updated'),
  'Status updated': clc.green.bold('Status updated'),
  'Failed to status updated': clc.red.bold('Failed to status updated'),
  'None': clc.xterm(238)('None'),
  'Not found': clc.red.bold('Not found'),
  'Searching': clc.yellow.bold('Searching'),
}

var debug = true;
emitter.on('process', function(name, proc, pushDb) {

  var exepect = [
    'Updated',
    'No update required',
    'Status update',
    'Failed to status updated'
  ];
  if (name) {
    fp[name].process = proc;
    fp[name].date = new Date().toString().substr(4, 20);
  }
  if (!debug) {
    process.stdout.write(clc.move.up(Object.keys(fp).length));
    for (identifier in fp) {
      process.stdout.write(clc.erase.line);
      console.log(printTimeLog(fp, identifier));
    }
  }
  else if (name) console.log(printTimeLog(fp, name));

  if (pushDb) {
    db.insert({
      name: name,
      proc: fp[name].process,
      color: fp[name].color,
      date: fp[name].date
    });
  }
});

function printTimeLog(fp, identifier) {
  if (identifier) return ("[" + fp[identifier].date + "]: " + clc.xterm(fp[identifier].color)(identifier + ": ") + ((messColor[fp[identifier].process]) ? messColor[fp[identifier].process] : fp[identifier].process));
}

function proc(name, proc, pushDb) {
  emitter.emit('process', name, proc, pushDb);
}

function logTime(flowerPower) {
  var dest = '[' + new Date().toString().substr(4, 20) + ']:';
  var argv = arguments;
  var i = 0;
  var color = 255;

  var uuid = false;
  if (flowerPower instanceof FlowerPower) {
    if (typeof fp[flowerPower.name] != 'undefined') {
      color = fp[flowerPower.name].color;
    }
    dest += ' ' + clc.xterm(color)( ((uuid) ? flowerPower.uuid : flowerPower.name) + ':');
    i++;
  }

  for (i; argv[i]; i++) {
    dest += ' ' + argv[i];
  }
  console.log(dest);
}

function iDontUseTheDevice(device, callback) {
  device._peripheral.removeAllListeners();
  device.removeAllListeners();
  device = null;
  if (typeof callback == 'function') {
    tryCallback(callback);
  }
}

function makeParam(flowerPower, dataBLE, dataCloud, startIndex) {
  var results = {};

  var session = {};
  var uploads = {};

  var now = new Date();

  results["client_datetime_utc"] = now.toISOString();
  results["user_config_version"] = dataCloud.user_config_version;
  results["plant_science_database_identifier"] = "en_20150210_2.1";

  session["sensor_serial"] = flowerPower.name;
  session["sensor_startup_timestamp_utc"] = dataBLE.start_up_time;
  session["session_id"] = dataBLE.history_current_session_id;
  session["session_start_index"] = dataBLE.history_current_session_start_index;
  session["sample_measure_period"] = dataBLE.history_current_session_period;

  uploads["sensor_serial"] = flowerPower.name;
  uploads["upload_timestamp_utc"] = now.toISOString();
  uploads["buffer_base64"] = dataBLE.buffer_base64;
  uploads["app_version"] = "";
  uploads["sensor_fw_version"] = "";
  uploads["sensor_hw_identifier"] ="";

  results["session_histories"] = [session];
  results["uploads"] = [uploads];


  return results;
}

function concatJson(json1, json2) {
  var dest = json1;

  for (var key in json2) {
    if (typeof json1[key] == 'object' && typeof json2[key] == 'object') {
      dest[key] = concatJson(json1[key], json2[key]);
    }
    else {
      dest[key] = json2[key];
    }
  }
  return dest;
}

function tryCallback(callback, error, data) {
  try {
    callback(error, data);
  }
  catch(err) {
    logTime('Try Callback:', err);
  }
}

exports.fp = fp;
exports.proc = proc;
exports.emitter = emitter;
exports.logTime = logTime;
exports.makeParam = makeParam;
exports.concatJson = concatJson;
exports.tryCallback = tryCallback;
exports.iDontUseTheDevice = iDontUseTheDevice;
