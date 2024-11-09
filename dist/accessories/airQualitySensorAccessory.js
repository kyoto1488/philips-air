export class AirQualitySensorAccessory {
    platform;
    accessory;
    logger;
    ip;
    port;
    api;
    service;
    currentState;
    constructor(platform, accessory, logger, ip, port, api) {
        this.platform = platform;
        this.accessory = accessory;
        this.logger = logger;
        this.ip = ip;
        this.port = port;
        this.api = api;
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Philips')
            .setCharacteristic(this.platform.Characteristic.Model, 'Air')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, '000000000');
        this.service = this.accessory.getService(this.platform.Service.AirQualitySensor)
            || this.accessory.addService(this.platform.Service.AirQualitySensor);
        this.service.getCharacteristic(this.platform.Characteristic.AirQuality)
            .onGet(this.getCommonQuality.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.PM2_5Density)
            .onGet(this.getPM2_5Density.bind(this));
        this.api.getEventEmitter().on('source:state', (currentState) => {
            this.currentState = currentState;
        });
        this.runIntervalPushState();
    }
    runIntervalPushState() {
        const callback = () => {
            if (this.currentState) {
                this.logger.debug('Attempting to send the state to HomeKit', this.currentState);
                this.service.updateCharacteristic(this.platform.Characteristic.AirQuality, this.getAirQualityForPM2_5(this.currentState.pm2_5));
                this.service.updateCharacteristic(this.platform.Characteristic.PM2_5Density, this.currentState.pm2_5);
            }
            setTimeout(callback, 10000);
        };
        callback();
    }
    async getCommonQuality() {
        if (this.currentState) {
            return this.getAirQualityForPM2_5(this.currentState.pm2_5);
        }
        return this.platform.Characteristic.AirQuality.UNKNOWN;
    }
    getAirQualityForPM2_5(pm2_5) {
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
    async getPM2_5Density() {
        if (!this.currentState) {
            return 0;
        }
        return this.currentState.pm2_5;
    }
}
//# sourceMappingURL=airQualitySensorAccessory.js.map