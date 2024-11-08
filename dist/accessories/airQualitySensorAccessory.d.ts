import { CharacteristicValue, type Logging, PlatformAccessory } from 'homebridge';
import type { PhilipsAirHomebridgePlatform } from '../platform.js';
import PhilipsAPI from '../philips/api.js';
export declare class AirQualitySensorAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly logger;
    private readonly ip;
    private readonly port;
    private readonly api;
    private service;
    private currentState;
    constructor(platform: PhilipsAirHomebridgePlatform, accessory: PlatformAccessory, logger: Logging, ip: string, port: number, api: PhilipsAPI);
    private runIntervalPushState;
    getCommonQuality(): Promise<CharacteristicValue>;
    private getAirQualityForPM2_5;
    getPM2_5Density(): Promise<CharacteristicValue>;
}
