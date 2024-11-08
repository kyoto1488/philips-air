import { CharacteristicValue, type Logging, PlatformAccessory, Service } from 'homebridge';

import type { PhilipsAirHomebridgePlatform } from '../platform.js';
import PhilipsAPI from '../philips/api.js';
import { State } from '../philips/apiTypes.js';

export class AirQualitySensorAccessory {
  private service: Service;
  private currentState: State | undefined;

  constructor(
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
      .onGet(this.getCommonQuality.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .onGet(this.getPM2_5Density.bind(this));

    this.api.getEventEmitter().on('source:state', (currentState: State): void => {
      this.currentState = currentState;
    });
    this.runIntervalPushState();
  }

  private runIntervalPushState(): void {
    const callback = (): void => {
      if (this.currentState) {
        this.logger.debug('Attempting to send the state to HomeKit', this.currentState);

        this.service.updateCharacteristic(
          this.platform.Characteristic.AirQuality,
          this.getAirQualityForPM2_5(this.currentState.pm2_5),
        );
        this.service.updateCharacteristic(
          this.platform.Characteristic.PM2_5Density,
          this.currentState.pm2_5,
        );
      }

      setTimeout(callback, 30000);
    };

    callback();
  }

  async getCommonQuality(): Promise<CharacteristicValue> {
    if (this.currentState) {
      return this.getAirQualityForPM2_5(this.currentState.pm2_5);
    }

    return this.platform.Characteristic.AirQuality.UNKNOWN;
  }

  private getAirQualityForPM2_5(pm2_5: number) {
    if (pm2_5 > 55) {
      return this.platform.Characteristic.AirQuality.POOR;
    }

    if (pm2_5 >= 36 && pm2_5 <= 55) {
      return this.platform.Characteristic.AirQuality.INFERIOR;
    }

    if (pm2_5 >= 20 && pm2_5 <= 35) {
      return this.platform.Characteristic.AirQuality.FAIR;
    }

    if (pm2_5 >= 13 && pm2_5 < 20) {
      return this.platform.Characteristic.AirQuality.GOOD;
    }

    if (pm2_5 >= 0 && pm2_5 <= 12) {
      return this.platform.Characteristic.AirQuality.EXCELLENT;
    }

    return this.platform.Characteristic.AirQuality.UNKNOWN;
  }

  async getPM2_5Density(): Promise<CharacteristicValue> {
    if (!this.currentState) {
      return 0;
    }
    return this.currentState.pm2_5;
  }
}