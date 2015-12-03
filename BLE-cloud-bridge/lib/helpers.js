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
	'Disconnected': clc.yellow.bold('Disconnected'),
	'Searching': clc.yellow.bold('Searching'),
}

var debug = true;
emitter.on('process', function(name, proc, pushDb) {

	var exepect = ['Updated', 'No update required', 'Status update', 'Failed to status updated'];
	if (name) {
		if (proc != 'Disconnected') {
			fp[name].process = proc;
			fp[name].date = new Date().toString().substr(4, 20);
		}
		else if (proc == 'Disconnected' && exepect.indexOf(fp[name].process) == -1) {
			fp[name].process = proc;
			fp[name].date = new Date().toString().substr(4, 20);
			pushDb = true;
		}
	}
	if (!debug) {
		process.stdout.write(clc.move.up(Object.keys(fp).length));
		for (identifier in fp) {
			process.stdout.write(clc.erase.line);
			console.log(printTimeLog(fp, identifier));
		}
	}
	else if (name && proc != 'Disconnected') {
		console.log(printTimeLog(fp, name));
	}
	else if (name && proc == 'Disconnected' && exepect.indexOf(fp[name].process) == -1) {
		console.log(printTimeLog(fp, name));
	}
		
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
exports.concatJson = concatJson;
exports.tryCallback = tryCallback;
exports.iDontUseTheDevice = iDontUseTheDevice;
