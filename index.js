const express = require('express')
const app = express()
const rp = require('request-promise')
const Promise = require("bluebird")
const cors = require('cors')
const bodyParser = require('body-parser')
const mqtt = require('mqtt')
const _ = require('lodash')

app.use(cors())
app.use(bodyParser.json())
app.set('trust proxy', 'loopback, linklocal, uniquelocal')

const {USER_CODE, PANEL_WEB_NAME, HOST, USER_ID, REFRESH, SECRET, MQTT_HOST, MQTT_USER, MQTT_PASS, TOPIC_PREFIX} = process.env

var status = {}
var zones = {}
var session_token = ''

app.get('/', (req, res) => {
    let responseobj = status
    responseobj.zones = zones
    return res.json(responseobj)
  }
)

app.post('/*', (req, res, next) => {
  if (req.body.secret === SECRET) {
    next()
  } else {
    console.log(req.ip, req.url, req.body.secret, "requested but was refused")
    res.sendStatus(403)
  }
})
if (SECRET) {
  app.post('/arm-home', (req, res) => change_state("arm_home", req, res))

  app.post('/arm-away', (req, res) => change_state("arm_away", req, res))

  app.post('/disarm', (req, res) => change_state("disarm", req, res))
}

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
      response.time = new Date()
      if (response.is_connected = true) {
        status = response
      }
      return response
    })
    .then(notify_mqtt_status)

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
    .tap(notify_mqtt_zones)

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

let notify_mqtt_status = () => arguments
let notify_mqtt_zones = () => arguments

if (MQTT_HOST) {

  // @TODO: manage state with MQTT queries rather than in local memory

  let previous_state
  let previous_ready_status
  let previous_time
  let previous_connected
  let previous_zones = []
  notify_mqtt_status = status => {
    try {
      if (previous_state !== status.partitions[0].state.toString()) {
        client.publish(`${TOPIC_PREFIX}/state`, status.partitions[0].state, {retain: true})
        client.publish(`${TOPIC_PREFIX}/new-state`, status.partitions[0].state)
      }

      if (previous_ready_status !== status.partitions[0].ready_status.toString()) {
        client.publish(`${TOPIC_PREFIX}/status`, status.partitions[0].ready_status.toString(), {retain: true})
      }

      if (previous_time !== status.time.toString()) {
        client.publish(`${TOPIC_PREFIX}/time`, status.time.toString(), {retain: true})
      }

      if (previous_connected !== status.is_connected.toString()) {
        client.publish(`${TOPIC_PREFIX}/connected`, status.is_connected.toString(), {retain: true})
      }

      // previous_time = status.time.toString()
      // previous_connected = status.is_connected.toString()
      // previous_state = status.partitions[0].state.toString()
      // previous_ready_status = status.partitions[0].ready_status.toString()
    } catch (e) {
      console.error(e, status)
    }
  }

  notify_mqtt_zones = zones => {
    try {
      zones.forEach((val, i) => {
        if (previous_ready_status === "true") {
          val.troubles = null
        }
        if (JSON.stringify(val) !== previous_zones[val.zone]) {
          // if (JSON.stringify(val) !== JSON.stringify(previous_zones[i])) {
          client.publish(`${TOPIC_PREFIX}/zones/${val.zone}`, JSON.stringify(val), {retain: true})
        }
      })
      // previous_zones = zones
    } catch (e) {
      console.error(e, zones)
    }
  }

  const client = mqtt.connect(MQTT_HOST, {
    username: MQTT_USER,
    password: MQTT_PASS
  })

  client.on('connect', () => client.subscribe(`$share/alarm/${TOPIC_PREFIX}/set-state`))

  client.on('connect', () => client.subscribe([
    `${TOPIC_PREFIX}/state`,
    `${TOPIC_PREFIX}/status`,
    `${TOPIC_PREFIX}/time`,
    `${TOPIC_PREFIX}/connected`,
    `${TOPIC_PREFIX}/zones/+`
  ]))

  client.on('connect', () => console.log("mqtt - connected"))

  client.on('error', (error) => console.error('mqtt', error))

  client.on('close', () => console.error("mqtt - connection close"))

  client.on('offline', () => console.log("mqtt - offline"))

  client.on('message', function (topic, message) {
    if (topic === `${TOPIC_PREFIX}/set-state`) {
      let state = message.toString()
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
          partition: "P1"
        }
      })
        .promise()
        .tap(response => console.log(new Date(), "mqtt", state, response))
    }
    if (topic === `${TOPIC_PREFIX}/state`) {
      previous_state = message.toString()
    }
    if (topic === `${TOPIC_PREFIX}/status`) {
      previous_ready_status = message.toString()
    }
    if (topic === `${TOPIC_PREFIX}/time`) {
      previous_time = message.toString()
    }
    if (topic === `${TOPIC_PREFIX}/connected`) {
      previous_connected = message.toString()
    }
    if (_.startsWith(topic, `${TOPIC_PREFIX}/zones/`)) {
      let zone = JSON.parse(message.toString())
      previous_zones[zone.zone] = message.toString()
    }
  })

}

module.exports = app