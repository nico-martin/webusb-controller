const RECEIVE_EVENT_KEY = 'nm-webusbcontroller-receive-emitter';
const CONNECT_EVENT_KEY = 'nm-webusbcontroller-connect-emitter';
let INSTANCES = 0;

export default class WebUSBController {
  device: USBDevice;
  private interfaceNumber: number = 0;
  private endpointIn: number = 0;
  private endpointOut: number = 0;
  private receiveEventKey: string = null;
  private connectEventKey: string = null;

  constructor() {
    INSTANCES++;
    this.receiveEventKey = RECEIVE_EVENT_KEY + '-' + INSTANCES;
    this.connectEventKey = CONNECT_EVENT_KEY + '-' + INSTANCES;
    this.device = null;

    navigator.usb.addEventListener('disconnect', (ev) => {
      if (this.device === ev.device) {
        this.device = null;
        document.dispatchEvent(
          new CustomEvent(this.connectEventKey, {
            detail: null,
          })
        );
      }
    });

    navigator.usb.addEventListener(
      'connect',
      async (ev) => await this.connectDevice(ev.device)
    );

    navigator.usb
      .getDevices()
      .then(
        async (devices) =>
          devices.length && (await this.connectDevice(devices[0]))
      );
  }

  private readLoop = () => {
    this.device.transferIn(this.endpointIn, 64).then(
      (result) => {
        document.dispatchEvent(
          new CustomEvent(this.receiveEventKey, {
            detail: result.data,
          })
        );
        this.readLoop();
      },
      (error) => console.log('onReceiveError', error)
    );
  };

  private async connectDevice(device: USBDevice) {
    await device.open();
    await device.selectConfiguration(1);
    device.configuration.interfaces.map((element) =>
      element.alternates.map((elementalt) => {
        if (elementalt.interfaceClass == 0xff) {
          this.interfaceNumber = element.interfaceNumber;
          elementalt.endpoints.map((elementendpoint) => {
            if (elementendpoint.direction == 'out') {
              this.endpointOut = elementendpoint.endpointNumber;
            }
            if (elementendpoint.direction == 'in') {
              this.endpointIn = elementendpoint.endpointNumber;
            }
          });
        }
      })
    );

    await device.claimInterface(this.interfaceNumber);
    await device.selectAlternateInterface(this.interfaceNumber, 0);
    await device.claimInterface(this.interfaceNumber);

    device
      .controlTransferOut({
        requestType: 'class',
        recipient: 'interface',
        request: 0x22,
        value: 0x01,
        index: this.interfaceNumber,
      })
      .then(() => {
        this.readLoop();
      });

    document.dispatchEvent(
      new CustomEvent(this.connectEventKey, {
        detail: this.device,
      })
    );

    document.dispatchEvent(
      new CustomEvent(this.connectEventKey, {
        detail: device,
      })
    );

    this.device = device;
  }

  async connect(options?: USBDeviceRequestOptions) {
    const device = await navigator.usb.requestDevice(options);
    await this.connectDevice(device);
    return device;
  }

  async disconnect() {
    return await this.device.close();
  }

  async send(data: BufferSource) {
    if (this.device) {
      return await this.device.transferOut(this.endpointOut, data);
    } else {
      console.error('ERROR: device not connected');
    }
  }

  onReceive(callback: (data: DataView) => void) {
    document.addEventListener(
      this.receiveEventKey,
      ({ detail }: CustomEvent<DataView>) => {
        callback(detail);
      }
    );
  }

  onDeviceConnect(callback: (device: USBDevice) => void) {
    document.addEventListener(
      this.connectEventKey,
      ({ detail }: CustomEvent<USBDevice>) => {
        callback(detail);
      }
    );
  }
}
