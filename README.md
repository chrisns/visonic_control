# visonic_control

Super crude way to get & set the status of your powermaster alarm via the powermanage service.

Setting is done either via a shared secret or via MQTT - where you're expected to protect write access to the topic yourself.

```
docker run --rm -ti -p 8099:80 \
  -e USER_CODE=XXXX \
  -e PANEL_WEB_NAME=XXXXX \
  -e HOST=XXXXX \
  -e USER_ID=$(uuidgen) \
  -e SECRET=XXXXX \
  -e REFRESH=10000 \
  pinked/visonic
```

```
docker run --rm -ti -p 8099:80 \
  -e USER_CODE=XXXX \
  -e PANEL_WEB_NAME=XXXXX \
  -e HOST=XXXXX \
  -e USER_ID=$(uuidgen) \
  -e MQTT_HOST=mqtts://XXX \
  -e TOPIC_PREFIX='alarm' \
  -e MQTT_USER=XXX \
  -e MQTT_PASS=XXXX \
  pinked/visonic
```


Big thanks to @barcar for their hard work on https://github.com/barcar/visonic_control in reverse engineering the interface

## Other interesting urls not (yet) implemented that I guessed at:

##### GET: /rest_api/3.0/zones:
response body:
```json
[{
  "zone": 1,
  "location": "Front door",
  "type": "DELAY_1",
  "subtype": "CONTACT_V",
  "preenroll": false,
  "soak": false,
  "bypass": false,
  "alarms": null,
  "alerts": null,
  "troubles": null,
  "bypass_availability": false
},...

```
##### GET: /rest_api/3.0/events:
response body:
```json
[{
  "event": 123,
  "type_id": 179,
  "label": "OFFLINE",
  "description": "BBA module has gone offline",
  "appointment": "IPMP",
  "datetime": "2017-01-31 03:00:00",
  "video": false,
  "device_type": "IPMP_SERVER",
  "zone": null
}, {
  "event": 124,
  "type_id": 180,
  "label": "ONLINE",
  "description": "BBA module has come online",
  "appointment": "IPMP",
  "datetime": "2017-01-31 03:01:00",
  "video": false,
  "device_type": "IPMP_SERVER",
  "zone": null
}]
```

##### GET: /rest_api/3.0/alarms:
response body:
```json
[{
  "device_type": "ZONE",
  "alarm_type": "ALARM_IN_MEMORY",
  "datetime": "2017-01-31 03:00:00",
  "has_video": false,
  "evt_id": null,
  "location": "Front door",
  "zone": 1,
  "zone_type": "DELAY_2"
}]
```

##### GET: /rest_api/3.0/cameras:
response body:
```json
[{
  "zone": 2,
  "preenroll": false,
  "location": "Hall",
  "status": "SUCCEEDED",
  "preview_path": "/public/rest_event/XXXXX/camera2/preview.jpg",
  "timestamp": "2017-01-31 03:01:00",
}, {
  "zone": 3,
  "preenroll": false,
  "location": "Front door",
  "status": "SUCCEEDED",
  "preview_path": "/public/rest_event/XXXXX/camera3/preview.jpg",
  "timestamp": "2017-01-31 03:01:00",
}]
```

##### GET: /rest_api/3.0/troubles:
response body:
```json
[{
  "device_type": "ZONE",
  "zone_type": "DELAY_1",
  "zone": 1,
  "location": "Front door",
  "trouble_type": "OPENED"
}]
```

##### POST: /rest_api/3.0/arm_home:
post body:
```json
{
  "partition": "p1"
}
```

##### POST: /rest_api/3.0/arm_away:
post body:
```json
{
  "partition": "p1"
}
```


##### POST: /rest_api/3.0/arm_home_inst:
post body:
```json
{
  "partition": "p1"
}
```

##### POST: /rest_api/3.0/arm_away_inst:
post body:
```json
{
  "partition": "p1"
}
```

##### POST: /rest_api/3.0/disarm:
post body:
```json
{
  "partition": "p1"
}
```

##### GET: /rest_api/3.0/alerts:
response body:
```json
// didn't have any at time of writing but probably looks simialr to troubles
[]
```