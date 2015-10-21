var events = require('events');
var clc = require('cli-color');
var FlowerPower = require('./node-flower-power/index');

var emitter = new events.EventEmitter;
var fp = {};

var debug = true;

emitter.on('process', function(name, proc) {
  var messColor = {
    'Connected': clc.green('Connected'),
    'No update required': clc.yellow('No update required'),
    'Updated': clc.green.bold('Updated'),
    'None': clc.xterm(238)('None'),
    'Not Found': clc.red.bold('Not Found'),
    'Searching': clc.yellow.bold('Searching'),
  }

  if (debug) {
    if (name) {
      fp[name].process = proc;
      fp[name].date = new Date().toString().substr(4, 20);
      console.log("[" + fp[name].date + "]:", clc.xterm(fp[name].color)(name + ":"), (messColor[fp[name].process]) ? messColor[fp[name].process] : fp[name].process);
    }
  }
  else {
    if (!name) firstEmit = false;
    else {
      if (proc == 'Disconnected') {
        if (fp[name].process != 'No update required' && fp[name].process != 'Updated') {
          fp[name].process = 'Disconnected for no reason';
        }
      }
      else {
        fp[name].process = proc;
      }
      fp[name].date = new Date().toString().substr(4, 20);
      process.stdout.write(clc.move.up(Object.keys(fp).length));
    }
    for (identifier in fp) {
      process.stdout.write(clc.erase.line);
      console.log("[" + fp[identifier].date + "]:", clc.xterm(fp[identifier].color)(identifier + ":"), (messColor[fp[identifier].process]) ? messColor[fp[identifier].process] : fp[identifier].process);
    }
  }
});

function proc(uuid, proc) {
  emitter.emit('process', uuid, proc);
}

function logTime(flowerPower) {
  var dest = '[' + new Date().toString().substr(4, 20) + ']:';
  var argv = arguments;
  var i = 0;
  var color = 255;

  var uuid = false;
  if (flowerPower instanceof FlowerPower) {
    if (typeof fp[flowerPower.uuid] != 'undefined') {
      color = fp[flowerPower.uuid].color;
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

function makeParam(flowerPower, dataBLE, dataCloud) {
  var results = {};

  var session = {};
  var uploads = {};

  results["client_datetime_utc"] = new Date().toISOString();
  results["user_config_version"] = dataCloud.user_config_version;
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
exports.uuidPeripheralToCloud = uuidPeripheralToCloud;
exports.uuidCloudToPeripheral = uuidCloudToPeripheral;
