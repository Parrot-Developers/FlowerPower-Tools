var events = require('events');
var clc = require('cli-color');
var FlowerPower = require('./node-flower-power/index');

var emitter = new events.EventEmitter;
var fp = {};

emitter.on('process', function(uuid, proc) {
  var messColor = {
    'Connected': clc.green('Connected'),
    'No update required': clc.yellow('No update required'),
    'Don\'t need to be upload': clc.yellow('Don\'t need to be upload'),
    'Updated': clc.green.bold('Updated'),
    'none': clc.xterm(238)('none'),
    'Not Found': clc.red.bold('Not Found'),
    'Searching': clc.yellow.bold('Searching'),
  }

  if (!uuid) firstEmit = false;
  else {
    if (proc == 'Disconnected') {
      if (fp[uuid].process == 'Connected') {
        fp[uuid].process = 'Disconnected for no reason';
      }
    }
    else {
      fp[uuid].process = proc;
    }
    fp[uuid].date = new Date().toString().substr(4, 20);
    process.stdout.write(clc.move.up(Object.keys(fp).length));
  }
  for (identifier in fp) {
    process.stdout.write(clc.erase.line);
    console.log("[" + fp[identifier].date + "]:", clc.xterm(fp[identifier].color)(identifier + ":"), (messColor[fp[identifier].process]) ? messColor[fp[identifier].process] : fp[identifier].process);
  }
});

function proc(uuid, proc) {
  emitter.emit('process', uuid, proc);
}

function uuidPeripheralToCloud(uuid) {
  return ((uuid.substr(0, 6) + '0000' + uuid.substr(6, 6)).toUpperCase());
}
function uuidCloudToPeripheral(uuid) {
  return (uuid.substr(0, 6).toLowerCase() + uuid.substr(10, 6).toLowerCase());
}

function logTime(flowerPower) {
  var dest = '[' + new Date().toString().substr(4, 20) + ']:';
  var argv = arguments;
  var i = 0;

  var uuid = false;
  if (flowerPower instanceof FlowerPower) {
    dest += ' ' + clc.xterm(color[flowerPower.uuid])( ((uuid) ? flowerPower.uuid : flowerPower.name) + ':');
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
    callback();
  }
}

exports.fp = fp;
exports.proc = proc;
exports.emitter = emitter;
exports.logTime = logTime;
exports.iDontUseTheDevice = iDontUseTheDevice;
exports.uuidPeripheralToCloud = uuidPeripheralToCloud;
exports.uuidCloudToPeripheral = uuidCloudToPeripheral;
