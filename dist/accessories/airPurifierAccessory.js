import { Mode, Status } from '../philips/apiTypes.js';
export class AirPurifierAccessory {
    platform;
    accessory;
    log;
    ip;
    port;
    api;
    service;
    currentState = {
        pm2_5: 0,
        status: Status.OFF,
        mode: Mode.GENERAL_AUTO,
    };
    savedRotationSpeed = null;
    constructor(platform, accessory, log, ip, port, api) {
        this.platform = platform;
        this.accessory = accessory;
        this.log = log;
        this.ip = ip;
        this.port = port;
        this.api = api;
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Philips')
            .setCharacteristic(this.platform.Characteristic.Model, 'Air')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, '000000000');
        this.service = this.accessory.getService(this.platform.Service.AirPurifier)
            || this.accessory.addService(this.platform.Service.AirPurifier);
        this.service.getCharacteristic(this.platform.Characteristic.Active)
            .onSet(this.setActiveStatus.bind(this))
            .onGet(this.getActiveStatus.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState)
            .onGet(this.getState.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
            .onSet(this.setRotationSpeed.bind(this))
            .onGet(this.getRotationSpeed.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
            .onSet(this.setTargetState.bind(this))
            .onGet(this.getTargetState.bind(this));
        this.runIntervalPushState();
        this.api.getEventEmitter().on('source:state', (currentState) => {
            this.currentState = currentState;
        });
    }
    runIntervalPushState() {
        const callback = () => {
            this.getActiveStatus().then(status => {
                this.service.updateCharacteristic(this.platform.Characteristic.Active, status);
            });
            this.getState().then(state => {
                this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, state);
            });
            this.getTargetState().then(state => {
                this.service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, state);
            });
            setTimeout(callback.bind(this), 3000);
        };
        callback();
    }
    async getActiveStatus() {
        if (!this.currentState) {
            return this.platform.Characteristic.Active.INACTIVE;
        }
        if (this.currentState.status === Status.ON) {
            return this.platform.Characteristic.Active.ACTIVE;
        }
        return this.platform.Characteristic.Active.INACTIVE;
    }
    async setActiveStatus(value) {
        if (this.api) {
            if (this.platform.Characteristic.Active.ACTIVE === value) {
                await this.api.changeStatus(Status.ON);
                if (this.currentState) {
                    this.currentState.status = Status.ON;
                }
            }
            else if (this.platform.Characteristic.Active.INACTIVE === value) {
                await this.api.changeStatus(Status.OFF);
                if (this.currentState) {
                    this.currentState.status = Status.OFF;
                }
            }
        }
    }
    async getState() {
        if (!this.currentState) {
            return this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
        }
        const state = this.currentState;
        if (state.status === Status.OFF) {
            return this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
        }
        return this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
    }
    async getTargetState() {
        if (!this.currentState) {
            return this.platform.Characteristic.TargetAirPurifierState.MANUAL;
        }
        const state = this.currentState;
        if (state.mode === Mode.GENERAL_AUTO) {
            return this.platform.Characteristic.TargetAirPurifierState.AUTO;
        }
        return this.platform.Characteristic.TargetAirPurifierState.MANUAL;
    }
    async setTargetState(value) {
        if (this.api) {
            if (this.platform.Characteristic.TargetAirPurifierState.AUTO === value) {
                await this.api.changeMode(Mode.GENERAL_AUTO);
                if (this.currentState) {
                    this.currentState.mode = Mode.GENERAL_AUTO;
                }
            }
            else if (this.platform.Characteristic.TargetAirPurifierState.MANUAL === value) {
                await this.api.changeMode(Mode.TURBO);
                if (this.currentState) {
                    this.currentState.mode = Mode.TURBO;
                }
            }
        }
    }
    async setRotationSpeed(value) {
        if (typeof value === 'number') {
            if (value === 0) {
                await this.api.changeStatus(Status.OFF);
                this.currentState.status = Status.OFF;
                this.savedRotationSpeed = 0;
            }
            else if (value > 0 && value <= 33) {
                await this.api.changeMode(Mode.SLEEP);
                this.savedRotationSpeed = value;
                if (this.currentState) {
                    this.currentState.mode = Mode.SLEEP;
                }
            }
            else if (value > 33 && value <= 66) {
                await this.api.changeMode(Mode.GENERAL_AUTO);
                this.savedRotationSpeed = value;
                if (this.currentState) {
                    this.currentState.mode = Mode.GENERAL_AUTO;
                }
            }
            else if (value > 66) {
                await this.api.changeMode(Mode.TURBO);
                this.savedRotationSpeed = value;
                if (this.currentState) {
                    this.currentState.mode = Mode.TURBO;
                }
            }
        }
    }
    async getRotationSpeed() {
        if (this.savedRotationSpeed !== null) {
            return this.savedRotationSpeed;
        }
        if (this.currentState) {
            if (this.currentState.mode === Mode.SLEEP) {
                return 33;
            }
            if (this.currentState.mode === Mode.GENERAL_AUTO) {
                return 66;
            }
            if (this.currentState.mode === Mode.TURBO) {
                return 100;
            }
        }
        return 0;
    }
}
//# sourceMappingURL=airPurifierAccessory.js.map