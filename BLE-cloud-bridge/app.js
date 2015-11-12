var express = require('express');
var bodyParser = require('body-parser');
var CloudAPI = require('./FlowerCloud/index');
var app = express();

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
  res.setHeader('Content-Type', 'text/plain');
  res.end('Home');
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

app.get('/garden', function(req, res) {
  logServer({method: 'GET', path: req.originalUrl});

  Parrot.getGarden().then(function(results) {
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

app.listen(3000, function() {
  console.log('http://localhost:3000');
});
