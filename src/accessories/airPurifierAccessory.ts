import { CharacteristicValue, type Logging, PlatformAccessory, Service } from 'homebridge';
import PhilipsAPI from '../philips/api.js';
import { Mode, State, Status } from '../philips/apiTypes.js';
import type { PhilipsAirHomebridgePlatform } from '../platform.js';

export class AirPurifierAccessory {
  private service: Service;
  private currentState: State = {
    pm2_5: 0,
    status: Status.OFF,
    mode: Mode.GENERAL_AUTO,
  };
  private savedRotationSpeed: number|null = null;

  constructor(
        private readonly platform: PhilipsAirHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
        private readonly log: Logging,
        private readonly ip: string,
        private readonly port: number,
        private readonly api: PhilipsAPI,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
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

    this.api.getEventEmitter().on('source:state', (currentState: State): void => {
      this.currentState = currentState;
    });
  }

  private runIntervalPushState(): void {
    const callback = (): void => {
      this.getActiveStatus().then(status => {
        this.service.updateCharacteristic(this.platform.Characteristic.Active, status);
      });

      this.getState().then(state => {
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, state);
      });

      this.getTargetState().then(state => {
        this.service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, state);
      });

      setTimeout(callback.bind(this), 2000);
    };

    callback();
  }

  public async getActiveStatus(): Promise<CharacteristicValue> {
    if (! this.currentState) {
      return this.platform.Characteristic.Active.INACTIVE;
    }

    if (this.currentState.status === Status.ON) {
      return this.platform.Characteristic.Active.ACTIVE;
    }

    return this.platform.Characteristic.Active.INACTIVE;
  }

  public async setActiveStatus(value: CharacteristicValue) {
    if (this.api) {
      if (this.platform.Characteristic.Active.ACTIVE === value) {
        await this.api.changeStatus(Status.ON);

        if (this.currentState) {
          this.currentState.status = Status.ON;
        }
      } else if (this.platform.Characteristic.Active.INACTIVE === value) {
        await this.api.changeStatus(Status.OFF);

        if (this.currentState) {
          this.currentState.status = Status.OFF;
        }
      }
    }
  }

  public async getState(): Promise<CharacteristicValue> {
    if (! this.currentState) {
      return this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
    }

    const state: State = this.currentState;

    if (state.status === Status.OFF) {
      return this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
    }

    return this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
  }

  public async getTargetState(): Promise<CharacteristicValue> {
    if (! this.currentState) {
      return this.platform.Characteristic.TargetAirPurifierState.MANUAL;
    }

    const state: State = this.currentState;

    if (state.mode === Mode.GENERAL_AUTO) {
      return this.platform.Characteristic.TargetAirPurifierState.AUTO;
    }

    return this.platform.Characteristic.TargetAirPurifierState.MANUAL;
  }

  public async setTargetState(value: CharacteristicValue) {
    if (this.api) {
      if (this.platform.Characteristic.TargetAirPurifierState.AUTO === value) {
        await this.api.changeMode(Mode.GENERAL_AUTO);

        if (this.currentState) {
          this.currentState.mode = Mode.GENERAL_AUTO;
        }
      } else if (this.platform.Characteristic.TargetAirPurifierState.MANUAL === value) {
        await this.api.changeMode(Mode.TURBO);

        if (this.currentState) {
          this.currentState.mode = Mode.TURBO;
        }
      }
    }
  }

  public async setRotationSpeed(value: CharacteristicValue): Promise<void> {
    if (typeof value === 'number') {
      if (value === 0) {
        await this.api.changeStatus(Status.OFF);
        this.currentState.status = Status.OFF;
        this.savedRotationSpeed = 0;
      } else if (value > 0 && value <= 33) {
        await this.api.changeMode(Mode.SLEEP);

        this.savedRotationSpeed = value;
        if (this.currentState) {
          this.currentState.mode = Mode.SLEEP;
        }
      } else if (value > 33 && value <= 66) {
        await this.api.changeMode(Mode.GENERAL_AUTO);

        this.savedRotationSpeed = value;
        if (this.currentState) {
          this.currentState.mode = Mode.GENERAL_AUTO;
        }
      } else if (value > 66) {
        await this.api.changeMode(Mode.TURBO);

        this.savedRotationSpeed = value;
        if (this.currentState) {
          this.currentState.mode = Mode.TURBO;
        }
      }
    }
  }

  public async getRotationSpeed(): Promise<CharacteristicValue> {
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