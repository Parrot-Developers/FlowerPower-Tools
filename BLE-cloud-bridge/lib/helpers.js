//var clc = require('cli-color');

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

exports.concatJson = concatJson;
