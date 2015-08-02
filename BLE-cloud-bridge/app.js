var async = require('async');
var CloudAPI = require('node-flower-power-cloud');
var Noble = require ('noble');
var FlowerPower = require('node-flower-power');
var fs = require('fs');
var lazy = require("lazy");
var asyncFunction = require("sync");
var uuid = require('node-uuid');

var sessionPeriod = "";
var sUpTime = "";
var sessionStartIndex = "";
var currentID = "";
var historic = "";
var uuid = "";
var user_config_version1 = "";

var clientID     = '';
var clientSecret = '';
var userName     = '';
var passPhrase   = '';

var api = '';

var loop1 = 0;
var loop2 = 0;
var loop3 = 0;

var startIdx = 0;
var NbrEntries = 0;
var lastEntry = 0;

var firstPartUuid = 7;
var lastPartUuid = 11;
var defaultIndexRecovery = 200;
var maxIndexRecovery = 3840;
var waitTimeoutMs = 10000;

var tab = [];
var tabSensors = [];
var tabIndex = [];
var uuidTab = [];
var param = [];

async.series([

  function(callback) {
    var p = 0;
    new lazy(fs.createReadStream('./params.txt'))
    .lines
    .forEach(function(line){
      param.push(line.toString());
      p = p + 1;
      if (p == 4) {
        callback();
      }
    }
  );

},

function(callback) {
  clientID     = param[0];
  clientSecret = param[1];
  userName     = param[2];
  passPhrase   = param[3];
  console.log(clientID);
  console.log(clientSecret);
  console.log(userName);
  console.log(passPhrase);

  api = new CloudAPI.CloudAPI({ clientID: clientID, clientSecret: clientSecret });

  callback();
},

function(callback) {
  api.login(userName, passPhrase, function(err) {
    if (!!err) return console.log('login error: ' + err.message);

    api.getGarden(function(err, sensors, tabSensorSerial, tabHistoryIndex, user_config_version) {
      if (!!err) return console.log('getGarden: ' + err.message);

      user_config_version1 = user_config_version;
      tabSensors = tabSensorSerial;
      tabIndex = tabHistoryIndex;
      callback();
    });
  }).on('error', function(err) {
    console.log('background error: ' + err.message);
  });
},

function(callback) {
  function discoUuid(){
    if (loop1 === tabSensors.length) {
      callback();
    }

    else {
      loop3 = 0;
      var uuid1 = tabSensors[loop1].toLowerCase();
      var res = uuid1.split("");

      for(t = 0; t < firstPartUuid; t++){
        uuid += res[t];
      }
      for(t = lastPartUuid; t < res.length; t++){
        uuid += res[t];
      }
      uuidTab.push(uuid);
      loop1 = loop1 + 1;
      uuid = "";
      discoUuid();
    }
  };
  discoUuid();
},

function(callback) {
  var timeout;
  loop1 = 0;
  FlowerPower.discoverAll(function onDiscover(flowerPower) {
    clearTimeout(timeout);
    console.log(flowerPower.uuid)
    asyncFunction(timeout = setTimeout(function() {
      FlowerPower.stopDiscoverAll(onDiscover);
      console.log("End of discovery")
      callback();
    },waitTimeoutMs));

    for(i = 0; i < uuidTab.length; i++){
      if(uuidTab[i] === flowerPower.uuid) {
        tab.splice(i,0,flowerPower);
        console.log("SLICE")
      }
    }
    loop1 = loop1 + 1
  });
},

function(callback) {
  function analyser(i) {
    if(i < tab.length) {
      if(tab[i] == 1) {
        loop2 ++;
        analyser(loop2);
      }
      else{
        async.series([
          function(callback) {
            tab[i].on('disconnect', function() {
              console.log('disconnected!');
              callback();
            });
            console.log('connectAndSetup' + tab[i]);
            tab[i].connectAndSetup(callback);
          },

          function(callback) {
            console.log('readFriendlyName');
            tab[i].readFriendlyName(function(friendlyName) {
              tab[i].writeFriendlyName(friendlyName, callback);
            });
          },

          function(callback) {
            console.log('getHistoryNbEntries');
            tab[i].getHistoryNbEntries(function(data) {
              NbrEntries = data;
              callback();
            });
          },

          function(callback) {
            console.log('getHistoryLastEntryIdx');
            tab[i].getHistoryLastEntryIdx(function(data) {
              lastEntry = data;
              startIdx = tabIndex[i];
              callback();
            });
          },

          function(callback) {
            console.log('getHistoryCurrentSessionID');
            tab[i].getHistoryCurrentSessionID(function(data) {
              currentID = data;
              callback();
            });
          },

          function(callback) {
            console.log('getHistoryCurrentSessionStartIdx');
            tab[i].getHistoryCurrentSessionStartIdx(function(data) {
              sessionStartIndex = data;
              callback();
            });
          },

          function(callback) {
            console.log('getHistoryCurrentSessionPeriod');
            tab[i].getHistoryCurrentSessionPeriod(function(data) {
              sessionPeriod = data;
              callback();
            });
          },

          function(callback) {
            console.log('getStartUpTime');
            tab[i].getStartupTime(function(startupTime) {
              sUpTime = startupTime;
              callback();
            });
          },

          function(callback) {
            console.log('getHistory ' + startIdx);
            if (startIdx == null || (lastEntry - startIdx) > maxIndexRecovery || (startIdx - lastEntry) > 1) {
              startIdx = lastEntry - defaultIndexRecovery;
            }
            else {
              startIdx = startIdx;
            }
            if ((startIdx - lastEntry) == 1) {
              console.log("All samples already uploaded");
              console.log('disconnect');
              tab[i].disconnect(callback);
              loop2 ++;
              analyser(loop2);
            }
            else {
              tab[i].getHistory(startIdx, function(error, history) {
                historic = history;
                callback();
              });
            }
          },

          function (callback) {
            fs.appendFile(tab[i].uuid+'.txt', historic, function (err) {
              if (err) throw err;
              callback();
            });
          },

          function (callback) {
            api.uploadGarden(tabSensors[i], user_config_version1, sUpTime, historic, currentID, sessionPeriod, sessionStartIndex, function(err) {
              console.log('disconnect');
              tab[i].disconnect(callback);
              loop2 ++;
              analyser(loop2);
            });
          },
        ]);
      }
    }
    else {
      process.exit(0);
    }
  }
  analyser(loop2);
}
]);
