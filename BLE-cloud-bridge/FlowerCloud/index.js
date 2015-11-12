var request = require('request');
var qs = require('querystring');

class FlowerCloud {
  constructor(apiKey, apiSecret) {
    this._apiKey = (apiKey) ? apiKey : "unknow";
    this._apiSecret = (apiSecret) ? apiSecret : "unknow";
    this.username = "unknow";
    this.password = "unknow";
    this.token = {};
    this._logged = false;

    return this;
  }

  setClient(apiKey, apiSecret) {
    if (apiKey && apiSecret) {
      this._apiKey = apiKey;
      this._apiSecret = apiSecret;
    }
    else throw "Error: need api Key AND api Secret";
  }

  login(username, password, callback) {
    let path = '/user/v1/authenticate'

    return new Promise((resolve, reject) => {
      this.username = username;
      this.password = password;

      let data = qs.stringify({
      	'username'	: this.username,
      	'password'	: this.password,
      	'client_id'	: this._apiKey,
      	'client_secret'	: this._apiSecret,
      	'grant_type'	: 'password',
      });
      let options = {
        json: true,
        headers: {'Content-length': data.length, 'Content-type':'application/x-www-form-urlencoded'},
        url: FlowerCloud.url + path,
        body: data,
      };

      request.post(options, (err, res, body) => {
        if (err || res.statusCode != 200) {
          resolve(err || body);
          if (typeof callback == 'function') callback(err || body);
        }
        else {
          this.token = body;
          this._logged = true;
          resolve(null);
          if (typeof callback == 'function') callback(null);
        }
      });
    });
  }

  _promised(err, res, body, callback) {
    if (err || res.statusCode != 200) {
      if (typeof callback == 'function') callback(err || body, null);
      return (err || body);
    }
    else {
      if (typeof callback == 'function') callback(null, body);
      return (body);
    }
  }

  _headersAuth(path) {
    let options = {
      json: true,
      headers: { 'Authorization': 'Bearer ' + this.token.access_token },
      url: FlowerCloud.url + path
    };
    return options;
  }

  _isLogged() {
    return (this._logged);
  }

  getProfile(callback) {
    let path = '/user/v4/profile';

    return new Promise((resolve, reject) => {
      if (this._isLogged()) {
        let options = this._headersAuth(path);

        request.get(options, (err, res, body) => {
          resolve(this._promised(err, res, body, callback));
        });
      }
      else reject('Not authorized');
    });
  }

  getGarden(callback) {
    let path = '/sensor_data/v4/garden_locations_status';

    return new Promise((resolve, reject) => {
      if (this._isLogged()) {
        let options = this._headersAuth(path);

        request.get(options, (err, res, body) => {
          resolve(this._promised(err, res, body, callback));
        });
      }
      else reject('Not authorized');
    });
  }

  getSamplesLocation(callback) {
    let path = '/sensor_data/v3/sample/location';

    let options = {};
  }

  putSamples(parameters, callback) {

  }
}

FlowerCloud.url = 'https://apiflowerpower.parrot.com';

module.exports = FlowerCloud;
