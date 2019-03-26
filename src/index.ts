import { EventEmitter } from "events";
import * as usb from 'usb';
import { Stream } from "stream";

const sane = require('sane-scanimage-wrapper');

export interface IDocumentScannerDevice {
  name: string;
  vendor: string;
  model: string;
  type: string;
  index: string;
}

export interface IEventEmmiter {
  on(event: 'usbDevices', listener: (devices: usb.Device[]) => void): this;
  on(event: 'scannerDevices', listener: (devices: IDocumentScannerDevice[]) => void): this;
  on(event: string, listener: Function): this;
}

export class DocumentScanner extends EventEmitter implements IEventEmmiter {
  constructor(private device?: IDocumentScannerDevice) {
    super();

    const usbDevicesChange = () => {
      this.emit('usbDevices', usb.getDeviceList());
      sane.listDevices().then((devices: any[]) => this.emit('scannerDevices', devices));
    }
    
    let usbListen = false;

    this.on('newListener', (event, listener) => {
      if (event === 'usbDevices') {
        listener(usb.getDeviceList());
      }
      if (event === 'scannerDevices') {
        sane.listDevices().then((devices: any[]) => listener(devices));
      }
      if (usbListen) {
        return;
      }
      if (event === 'scannerDevices' || event === 'usbDevices') {
        usbListen = true;
        usb.on('attach', usbDevicesChange);
        usb.on('detach', usbDevicesChange);
      }
    });
    this.on('removeListener', (event) => {
      if (!usbListen) {
        return;
      }
      if (event === 'scannerDevices' && this.listenerCount('scannerDevices') > 0) {
        return;
      }
      if (event === 'usbDevices' && this.listenerCount('usbDevices') > 0) {
        return;
      }
      usbListen = false;
      usb.removeListener('attach', usbDevicesChange);
      usb.removeListener('detach', usbDevicesChange);
    });
  }

  scan(format: 'pnm' | 'tiff' | 'png' | 'jpeg' = 'png'): Stream {
    const scanner = new sane.Scanner(this.device);
    return scanner.scan({ format });
  }

  static listDevices(): Promise<IDocumentScannerDevice[]> {
    return sane.listDevices()
  }
}