const express = require('express')
const app = express()
const rp = require('request-promise');
const Promise = require("bluebird");
const cors = require('cors')
const bodyParser = require('body-parser');

app.use(cors())
app.use(bodyParser.json())
app.set('trust proxy', 'loopback, linklocal, uniquelocal')

const {USER_CODE, PANEL_WEB_NAME, HOST, USER_ID, REFRESH, SECRET} = process.env;

var status = {};
var zones = {};
var session_token = '';

app.get('/', (req, res) => {
    let responseobj = status
    responseobj.zones = zones
    return res.json(responseobj)
  }
)

app.post('/*', (req, res, next) => {
  if (req.body.secret === SECRET) {
    next();
  } else {
    console.log(req.ip, req.url, req.body.secret, "requested but was refused");
    res.sendStatus(403)
  }
})

app.post('/arm-home', (req, res) => change_state("arm_home", req, res))

app.post('/arm-away', (req, res) => change_state("arm_away", req, res))

app.post('/disarm', (req, res) => change_state("disarm", req, res))

const change_state = (state, req, res) =>
  rp({
    uri: `https://${HOST}/rest_api/3.0/${state}`,
    method: "POST",
    json: true,
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      'User-Agent': "Visonic-GO/2.6.8 CFNetwork/808.1.4 Darwin/16.1.0",
      "Accept-Language": "en-gb",
      "Session-Token": session_token
    },
    body: {
      partition: req.body.partition
    }
  })
    .promise()
    .tap(response => console.log(new Date(), req.ip, state, response))
    .then(response => res.json(response))
    .catch(response =>
      res.sendStatus(response.statusCode).end(response.message)
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
    .then(response => zones = response)

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
    .tap(session_token => console.log("session token", session_token))
    .then(loop)
)

module.exports = app