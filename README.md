# WebUSBController Class

A JavaScript class that abstracts the [WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API) and concentrates it on a handful of methods:

## Install
```
npm i @nico-martin/webusb-controller
```

## About

```javascript
import WebUSBController from '@nico-martin/webusb-controller';

const Controller = new WebUSBController();

// Connect to a device, accepts USBDeviceRequestOptions as a parameter
Controller.connect({ filters: [{ vendorId: 0x2e8a }] });

// Send a DataView to the connected device
Controller.send(new Uint8Array([0, 255]));

// listener that accepts a callback function that runs whenever new data (DataView) is sent
Controller.onReceive((data) => console.log('received', data));

// listener that accepts a callback function that runs whenever a device is connected or disconnected
Controller.onDeviceConnect((device) =>
  console.log(device ? 'connect' : 'disconnect')
);
```
