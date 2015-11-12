'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var request = require('request');
var qs = require('querystring');

var FlowerCloud = (function () {
  function FlowerCloud(apiKey, apiSecret) {
    _classCallCheck(this, FlowerCloud);

    this._apiKey = apiKey ? apiKey : "unknow";
    this._apiSecret = apiSecret ? apiSecret : "unknow";
    this.username = "unknow";
    this.password = "unknow";
    this.token = {};
    this._logged = false;

    return this;
  }

  _createClass(FlowerCloud, [{
    key: 'setClient',
    value: function setClient(apiKey, apiSecret) {
      if (apiKey && apiSecret) {
        this._apiKey = apiKey;
        this._apiSecret = apiSecret;
      } else throw "Error: need api Key AND api Secret";
    }
  }, {
    key: 'login',
    value: function login(username, password, callback) {
      var _this = this;

      var path = '/user/v1/authenticate';

      return new Promise(function (resolve, reject) {
        _this.username = username;
        _this.password = password;

        var data = qs.stringify({
          'username': _this.username,
          'password': _this.password,
          'client_id': _this._apiKey,
          'client_secret': _this._apiSecret,
          'grant_type': 'password'
        });
        var options = {
          json: true,
          headers: { 'Content-length': data.length, 'Content-type': 'application/x-www-form-urlencoded' },
          url: FlowerCloud.url + path,
          body: data
        };

        request.post(options, function (err, res, body) {
          if (err || res.statusCode != 200) {
            resolve(err || body);
            if (typeof callback == 'function') callback(err || body);
          } else {
            _this.token = body;
            _this._logged = true;
            resolve(null);
            if (typeof callback == 'function') callback(null);
          }
        });
      });
    }
  }, {
    key: '_promised',
    value: function _promised(err, res, body, callback) {
      if (err || res.statusCode != 200) {
        if (typeof callback == 'function') callback(err || body, null);
        return err || body;
      } else {
        if (typeof callback == 'function') callback(null, body);
        return body;
      }
    }
  }, {
    key: '_headersAuth',
    value: function _headersAuth(path) {
      var options = {
        json: true,
        headers: { 'Authorization': 'Bearer ' + this.token.access_token },
        url: FlowerCloud.url + path
      };
      return options;
    }
  }, {
    key: '_isLogged',
    value: function _isLogged() {
      return this._logged;
    }
  }, {
    key: 'getProfile',
    value: function getProfile(callback) {
      var _this2 = this;

      var path = '/user/v4/profile';

      return new Promise(function (resolve, reject) {
        if (_this2._isLogged()) {
          var options = _this2._headersAuth(path);

          request.get(options, function (err, res, body) {
            resolve(_this2._promised(err, res, body, callback));
          });
        } else reject('Not authorized');
      });
    }
  }, {
    key: 'getGarden',
    value: function getGarden(callback) {
      var _this3 = this;

      var path = '/sensor_data/v4/garden_locations_status';

      return new Promise(function (resolve, reject) {
        if (_this3._isLogged()) {
          var options = _this3._headersAuth(path);

          request.get(options, function (err, res, body) {
            resolve(_this3._promised(err, res, body, callback));
          });
        } else reject('Not authorized');
      });
    }
  }, {
    key: 'getSamplesLocation',
    value: function getSamplesLocation(callback) {
      var path = '/sensor_data/v3/sample/location';

      var options = {};
    }
  }, {
    key: 'putSamples',
    value: function putSamples(parameters, callback) {}
  }]);

  return FlowerCloud;
})();

FlowerCloud.url = 'https://apiflowerpower.parrot.com';

module.exports = FlowerCloud;

