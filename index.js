const express = require('express')
const app = express()
const rp = require('request-promise');
const Promise = require("bluebird");
const cors = require('cors')

app.use(cors())

const {USER_CODE, PANEL_WEB_NAME, HOST, USER_ID, REFRESH} = process.env;

var status = {};
var session_token = '';

app.get('/', (req, res) =>
  res.json(status)
)

const get_status = () =>
  rp({
    uri: `https://${HOST}/rest_api/3.0/status`,
    json: true,
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      'User-Agent': "Visonic-GO/2.6.8 CFNetwork/808.1.4 Darwin/16.1.0",
      "Accept-Language": "en-gb",
      "Session-Token": session_token
    }
  })
    .promise()
    .tap(console.log)
    .then(response => {
      response.time = new Date();
      if (response.is_connected = true) {
        status = response;
      }
    })

const loop = () =>
  get_status()
    .then(get_zones)
    .delay(REFRESH ? parseInt(REFRESH) : 60000)
    .finally(loop)

const get_zones = () =>
  rp({
    uri: `https://${HOST}/rest_api/3.0/zones`,
    json: true,
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      'User-Agent': "Visonic-GO/2.6.8 CFNetwork/808.1.4 Darwin/16.1.0",
      "Accept-Language": "en-gb",
      "Session-Token": session_token
    }
  })
    .promise()
    .tap(console.log)
    .then(response => status.zones = response)

app.listen(3000, () =>
  rp({
    uri: `https://${HOST}/rest_api/3.0/login`,
    method: "POST",
    json: true,
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      'User-Agent': "Visonic-GO/2.6.8 CFNetwork/808.1.4 Darwin/16.1.0",
      "Accept-Language": "en-gb",
    },
    body: {
      user_id: USER_ID,
      panel_web_name: PANEL_WEB_NAME,
      user_code: USER_CODE,
      app_type: "com.visonic.PowerMaxApp",
    }
  })
    .then(response => session_token = response.session_token)
    .then(loop)
)

module.exports = app