import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { AirQualitySensorAccessory } from './accessories/airQualitySensorAccessory.js';
import { AirPurifierAccessory } from './accessories/airPurifierAccessory.js';
import PhilipsAPI from './philips/api.js';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class PhilipsAirHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
        public readonly logger: Logging,
        public readonly config: PlatformConfig,
        public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.logger.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      logger.debug('Executed didFinishLaunching callback');

      if (this.config.ip && this.config.port) {
        PhilipsAPI.create(this.logger, this.config.ip, this.config.port)
          .then((api: PhilipsAPI) => {
            api.runObserver();
            this.discoverDevices(api);
          });
      }
    });
  }

  /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to set up event handlers for characteristics and update respective values.
     */
  configureAccessory(accessory: PlatformAccessory) {
    this.logger.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
  discoverDevices(api: PhilipsAPI) {
    this.registerSensor(api);
    this.registerPurifier(api);
  }

  registerSensor(api: PhilipsAPI) {
    const uuid: string = this.api.hap.uuid.generate(PLUGIN_NAME + ':Quality');

    const existingAccessory = this.accessories.find(
      accessory => accessory.UUID === uuid,
    );

    if (!existingAccessory) {
      const accessory = new this.api.platformAccessory('Quality', uuid);

      new AirQualitySensorAccessory(
        this,
        accessory,
        this.logger,
        this.config.ip,
        this.config.port,
        api,
      );

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    } else {
      new AirQualitySensorAccessory(
        this,
        existingAccessory,
        this.logger,
        this.config.ip,
        this.config.port,
        api,
      );
    }
  }

  registerPurifier(api: PhilipsAPI) {
    const uuid: string = this.api.hap.uuid.generate(PLUGIN_NAME + ':Purifier');

    const existingAccessory = this.accessories.find(
      accessory => accessory.UUID === uuid,
    );

    if (!existingAccessory) {
      const accessory = new this.api.platformAccessory('Purifier', uuid);

      new AirPurifierAccessory(
        this,
        accessory,
        this.logger,
        this.config.ip,
        this.config.port,
        api,
      );

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    } else {
      new AirPurifierAccessory(
        this,
        existingAccessory,
        this.logger,
        this.config.ip,
        this.config.port,
        api,
      );
    }
  }
}
