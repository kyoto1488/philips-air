import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import PhilipsAPI from './philips/api.js';
/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export declare class PhilipsAirHomebridgePlatform implements DynamicPlatformPlugin {
    readonly logger: Logging;
    readonly config: PlatformConfig;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: PlatformAccessory[];
    constructor(logger: Logging, config: PlatformConfig, api: API);
    /**
       * This function is invoked when homebridge restores cached accessories from disk at startup.
       * It should be used to set up event handlers for characteristics and update respective values.
       */
    configureAccessory(accessory: PlatformAccessory): void;
    /**
       * This is an example method showing how to register discovered accessories.
       * Accessories must only be registered once, previously created accessories
       * must not be registered again to prevent "duplicate UUID" errors.
       */
    discoverDevices(api: PhilipsAPI): void;
    registerSensor(api: PhilipsAPI): void;
    registerPurifier(api: PhilipsAPI): void;
}
