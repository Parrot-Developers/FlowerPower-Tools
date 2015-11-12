var express = require('express');

var router = express.Router();

router.get('/', function(req, res) {
  res.render('garden');
});

router.get('/sensor/:uuid', function(req, res) {
  res.render('sensor', {uuid: req.params.uuid})
});

module.exports = router;
