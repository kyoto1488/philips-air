import { CharacteristicValue, type Logging, PlatformAccessory, Service } from 'homebridge';

import type { PhilipsAirHomebridgePlatform } from '../platform.js';
import PhilipsAPI from '../philips/api.js';
import { State } from '../philips/apiTypes.js';

export class AirQualitySensorAccessory {
  private service: Service;
  private currentState: State | undefined;

  public constructor(
        private readonly platform: PhilipsAirHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
        private readonly logger: Logging,
        private readonly ip: string,
        private readonly port: number,
        private readonly api: PhilipsAPI,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Philips')
      .setCharacteristic(this.platform.Characteristic.Model, 'Air')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '000000000');

    this.service = this.accessory.getService(this.platform.Service.AirQualitySensor)
        || this.accessory.addService(this.platform.Service.AirQualitySensor);

    this.service.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getAirQuality.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .onGet(this.getPM2_5Density.bind(this));
    
    this.api.getEventEmitter().on('source:event', (currentState: State) => {
      this.currentState = currentState;
    });

    setInterval(() => {
      if (this.currentState) {
        this.service.updateCharacteristic(
          this.platform.Characteristic.AirQuality,
          this.getAirQualityCharacteristicValue(),
        );

        this.service.updateCharacteristic(
          this.platform.Characteristic.PM2_5Density,
          this.currentState.pm2_5,
        );
      }
    }, 15000);
  }

  async getAirQuality(): Promise<CharacteristicValue> {
    return this.getAirQualityCharacteristicValue();
  }

  async getPM2_5Density(): Promise<CharacteristicValue> {
    if (!this.currentState) {
      return 0;
    }
    return this.currentState.pm2_5;
  }

  private getAirQualityCharacteristicValue(): number {
    if (this.currentState) {
      const pm2_5 = this.currentState.pm2_5;
      if (pm2_5 > 55) {
        return this.platform.Characteristic.AirQuality.POOR;
      } else if (pm2_5 >= 36 && pm2_5 <= 55) {
        return this.platform.Characteristic.AirQuality.INFERIOR;
      } else if (pm2_5 >= 20 && pm2_5 <= 35) {
        return this.platform.Characteristic.AirQuality.FAIR;
      } else if (pm2_5 >= 13 && pm2_5 < 20) {
        return this.platform.Characteristic.AirQuality.GOOD;
      } else if (pm2_5 >= 0 && pm2_5 <= 12) {
        return this.platform.Characteristic.AirQuality.EXCELLENT;
      }
    }

    return this.platform.Characteristic.AirQuality.UNKNOWN;
  }
}