import { CharacteristicValue, type Logging, PlatformAccessory } from 'homebridge';
import PhilipsAPI from '../philips/api.js';
import type { PhilipsAirHomebridgePlatform } from '../platform.js';
export declare class AirPurifierAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly log;
    private readonly ip;
    private readonly port;
    private readonly api;
    private service;
    private currentState;
    private savedRotationSpeed;
    constructor(platform: PhilipsAirHomebridgePlatform, accessory: PlatformAccessory, log: Logging, ip: string, port: number, api: PhilipsAPI);
    private runIntervalPushState;
    getActiveStatus(): Promise<CharacteristicValue>;
    setActiveStatus(value: CharacteristicValue): Promise<void>;
    getState(): Promise<CharacteristicValue>;
    getTargetState(): Promise<CharacteristicValue>;
    setTargetState(value: CharacteristicValue): Promise<void>;
    setRotationSpeed(value: CharacteristicValue): Promise<void>;
    getRotationSpeed(): Promise<CharacteristicValue>;
}
