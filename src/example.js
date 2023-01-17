import WebUSBController from './WebUSBController';

const Controller = new WebUSBController();

Controller.connect({ filters: [{ vendorId: 0x2e8a }] });

Controller.send(new Uint8Array([0, 255]));
Controller.onReceive((data) => console.log('received', data));

/*
const device = await navigator.usb.requestDevice({
  filters: [{ vendorId: 0x2e8a }],
});

await device.open();
await device.selectConfiguration(1);
await device.claimInterface(2);
await device.controlTransferOut({
  requestType: 'class',
  recipient: 'interface',
  request: 0x22,
  value: 0x01,
  index: 2,
});

const result = device.transferIn(0, 64);
*/
