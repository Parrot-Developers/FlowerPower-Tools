import Pannel from './lib/Pannel';

var CloudAPI = require('./node-flower-power-cloud/FlowerPowerCloud');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var PORT = 3000;

var server = app.listen(PORT, function() {
  console.log('http://localhost:' + PORT);
});
var io = require('socket.io');
// var bridge = require('./index');


var Parrot = new CloudAPI();
var myPannel = new Pannel(Parrot);

myPannel.setIo(io.listen(server));
myPannel.io.sockets.on('connection', function(socket) {
  console.log('New connection');
  socket.on('automatic', function() {
    myPannel.automatic();
  });
  // socket.on('process', function(uuid, flowerPower) {
    // console.log('PROCESS');
    // console.log(uuid, flowerPower.proc);
    // socket.broadcast.emit('process', uuid, flowerPower);
  // });
});

function logServer(infos) {
  var str = '[';
  str += new Date().toString().substr(4, 20);
  str += ']';
  for (var key in infos) {
    str += ' | ' + key + ': ' + infos[key];
  }
  console.log(str);
}

function checkSession(res, callback) {
  if (!Parrot._logged) {
    callback(true, res);
  }
  else {
    callback(null, res);
  }
}

app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

app.use(bodyParser());
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  logServer({method: 'GET', path: req.originalUrl});

  res.render('index');
});

app.route('/login')
  .get(function(req, res) {
    logServer({method: 'GET', path: req.originalUrl});

    res.render('login');
  })
  .post(function(req, res) {
    logServer({method: 'POST', path: req.originalUrl});

    let credentials = {
          	'username'	: req.body.user.name,
          	'password'	: req.body.user.pass,
          	'client_id'	: req.body.client.id,
          	'client_secret'	: req.body.client.secret,
          	'grant_type'	: 'password',
          };
    myPannel.loginToApi(credentials, function(err, body) {
      if (err) res.redirect('/login');
      else res.redirect('/garden');
    });
  });

app.get('/garden', function(req, res) {
  logServer({method: 'GET', path: req.originalUrl});
  myPannel.loadGarden();
    // bridge.start({delay: 15 * 60 * 1000, api: Parrot, handle: handle});
    res.render('garden');
    // else res.redirect('/login');
});

app.get('/garden/sensor/:uuid', function(req, res) {
  logServer({method: 'GET', path: req.originalUrl});

  res.render('sensor', {uuid: req.params.uuid});
});

app.use(function(req, res, next) {
  res.setHeader('Content-Type', 'text/plain');
  res.send(404, 'Page not found');
});
