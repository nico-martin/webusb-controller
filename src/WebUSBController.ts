import EventBus from './eventBus/EventBus';

export type EventsDefinitions = {
  deviceConnect: USBDevice;
  dataReceived: DataView;
};

class WebUSBController {
  private device: USBDevice;
  private interfaceNumber: number = 0;
  private endpointIn: number = 0;
  private endpointOut: number = 0;
  private readonly showLog: boolean = false;
  private readonly showError: boolean = false;
  private eventBus = new EventBus<EventsDefinitions>('webusb-controller');

  constructor(error: boolean = false, log: boolean = false) {
    this.device = null;
    this.showLog = log;
    this.showError = error;

    // when the device is disconnected (plug is pulled)
    navigator.usb.addEventListener('disconnect', (ev) => {
      if (this.device === ev.device) {
        this.device = null;
        this.eventBus.publish('deviceConnect', null);
      }
    });

    // when the device is connected (plug is plugged in)
    navigator.usb.addEventListener('connect', async (ev) => {
      await this.connectDevice(ev.device);
    });

    // check if devices are already authorized
    navigator.usb.getDevices().then(async (devices) => {
      devices.length && (await this.connectDevice(devices[0]));
    });
  }

  private connectDevice = async (device: USBDevice): Promise<void> => {
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

    this.device = device;
    this.eventBus.publish('deviceConnect', this.device);

    // tell the device that we are ready to receive data
    await this.device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: 0x22,
      value: 0x01,
      index: this.interfaceNumber,
    });
    this.readLoop().catch((e) => this.error(e));
  };

  private readLoop = async (): Promise<void> => {
    this.log('start transferIn');
    const result = await this.device.transferIn(this.endpointIn, 64);
    this.log('transferIn', result);
    result.data && this.eventBus.publish('dataReceived', result.data);
    this.readLoop().catch((e) => this.error(e));
  };

  public disconnect = async (): Promise<void> => {
    this.device && (await this.device.close());
  };

  public connect = async (options?: USBDeviceRequestOptions): Promise<void> => {
    const device = await navigator.usb.requestDevice(options);
    await this.connectDevice(device);
  };

  public onReceive = (callback: (data: DataView) => void) => {
    this.eventBus.subscribe('dataReceived', (data: DataView) => callback(data));
  };

  public send = async (data: BufferSource): Promise<USBOutTransferResult> => {
    if (this.device) {
      return await this.device.transferOut(this.endpointOut, data);
    } else {
      this.error('device not connected');
    }
  };

  public onDeviceConnect = (callback: (device: USBDevice) => void) => {
    this.eventBus.subscribe('deviceConnect', (device: USBDevice) =>
      callback(device)
    );
  };

  private log = (...e) =>
    this.showLog ? console.log('WebUSBController:', ...e) : {};
  private error = (...e) =>
    this.showError ? console.error('WebUSBController:', ...e) : {};
}

export default WebUSBController;
