var bodyParser = require('body-parser');
var CloudAPI = require('./FlowerCloud/index2');
var express = require('express');
var app = express();
var server = app.listen(3000, function() {
  console.log('http://localhost:3000');
});
var io = require('socket.io');
var Global = require('./Global');
var bridge = require('./index');

var Parrot = new CloudAPI();


function logServer(infos) {
  var str = '[';
  str += new Date().toString().substr(4, 20);
  str += ']';
  for (var key in infos) {
    str += ' | ' + key + ': ' + infos[key];
  }
  console.log(str);
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

    Parrot.setClient(req.body.client.id, req.body.client.secret);
    Parrot.login(req.body.user.name, req.body.user.pass).then(function(err) {
      if (err) res.end(err.error);
      else res.end('Login Successful!');
    });
  });

app.get('/gg', function(req, res) {
  logServer({method: 'GET', path: req.originalUrl});

  bridge.start(15 * 60 * 1000);
  res.end('end');
})

app.get('/garden', function(req, res) {
  logServer({method: 'GET', path: req.originalUrl});

  Parrot.getGarden().then(function(results) {
    bridge.start(15 * 60 * 1000);
    res.render('garden', results);
  }).catch(function(err) {
    res.redirect('/login');
  });
});

app.get('/garden/sensor/:uuid', function(req, res) {
  logServer({method: 'GET', path: req.originalUrl});

  res.render('sensor', {uuid: req.params.uuid});
});

app.use(function(req, res, next) {
  res.setHeader('Content-Type', 'text/plain');
  res.send(404, 'Page not found');
});

Global.io = io.listen(server);
Global.io.sockets.on('connection', function(socket) {

  socket.on('process', function(uuid, flowerPower) {
    console.log('PROCESS');
    // console.log(uuid, flowerPower.proc);
    socket.broadcast.emit('process', uuid, flowerPower);
  });
});
