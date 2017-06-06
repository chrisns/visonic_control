# visonic_control

Super crude way to just get the status of your powermaster alarm via the powermanage service

```
docker run --rm -ti -p 8099:80 -e USER_CODE=XXXX -e PANEL_WEB_NAME=XXXXX -e HOST=XXXXX -e USER_ID=`uuidgen pinked/visonic
```

Big thanks to @barcar for their hard work on https://github.com/barcar/visonic_control in reverse engineering the interface
