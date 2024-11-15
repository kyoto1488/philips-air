import { CharacteristicValue, type Logging, PlatformAccessory, Service } from 'homebridge';
import PhilipsAPI from '../philips/api.js';
import { CommandResult, Mode, State, Status } from '../philips/apiTypes.js';
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
        private readonly logger: Logging,
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

    this.api.getEventEmitter().on('source:state', (currentState: State): void => {
      this.currentState = currentState;
    });

    setInterval(() => {
      this.getActiveStatus().then((status: CharacteristicValue): void => {
        this.service.updateCharacteristic(this.platform.Characteristic.Active, status);
      });

      this.getState().then((state: CharacteristicValue): void => {
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, state);
      });

      this.getTargetState().then((state: CharacteristicValue): void => {
        this.service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, state);
      });
    }, 2000);
  }

  public async getActiveStatus(): Promise<CharacteristicValue> {
    if (this.currentState) {
      if (this.currentState.status === Status.ON) {
        return this.platform.Characteristic.Active.ACTIVE;
      }
    }

    return this.platform.Characteristic.Active.INACTIVE;
  }

  public async setActiveStatus(value: CharacteristicValue) {
    if (this.platform.Characteristic.Active.ACTIVE === value) {
      await this.changeStatus(Status.ON);

    } else if (this.platform.Characteristic.Active.INACTIVE === value) {
      await this.changeStatus(Status.OFF);
    }
  }

  public async getState(): Promise<CharacteristicValue> {
    if (this.currentState) {
      if (this.currentState.status === Status.OFF) {
        return this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
      }
    }

    return this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
  }

  public async getTargetState(): Promise<CharacteristicValue> {
    if (this.currentState) {
      if (this.currentState.mode === Mode.GENERAL_AUTO) {
        return this.platform.Characteristic.TargetAirPurifierState.AUTO;
      }
    }

    return this.platform.Characteristic.TargetAirPurifierState.MANUAL;
  }

  public async setTargetState(value: CharacteristicValue) {
    if (this.platform.Characteristic.TargetAirPurifierState.AUTO === value) {
      await this.changeMode(Mode.GENERAL_AUTO);

    } else if (this.platform.Characteristic.TargetAirPurifierState.MANUAL === value) {
      await this.changeMode(Mode.TURBO);
    }
  }

  public async setRotationSpeed(value: CharacteristicValue) {
    if (typeof value === 'number') {
      if (value === 0) {
        await this.changeStatus(Status.OFF);
        this.savedRotationSpeed = 0;

      } else if (value > 0 && value <= 33) {
        await this.changeMode(Mode.SLEEP);
        this.savedRotationSpeed = value;

      } else if (value > 33 && value <= 66) {
        await this.changeMode(Mode.GENERAL_AUTO);
        this.savedRotationSpeed = value;

      } else if (value > 66) {
        await this.changeMode(Mode.TURBO);
        this.savedRotationSpeed = value;
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

  private async changeMode(mode: Mode): Promise<CommandResult|null> {
    let commandResult: CommandResult|null = null;
    if (this.currentState) {
      if (this.currentState.mode !== mode) {
        commandResult = await this.api.changeMode(mode);
      }
    } else {
      commandResult = await this.api.changeMode(mode);
    }

    if (commandResult && this.currentState && commandResult.status === 'success') {
      this.currentState.mode = mode;

      return commandResult;
    } else {
      return null;
    }
  }

  private async changeStatus(status: Status): Promise<CommandResult|null> {
    let commandResult: CommandResult|null = null;
    if (this.currentState) {
      if (this.currentState.status !== status) {
        commandResult = await this.api.changeStatus(status);
      }
    } else {
      commandResult = await this.api.changeStatus(status);
    }

    if (commandResult && this.currentState && commandResult.status === 'success') {
      this.currentState.status = status;

      return commandResult;
    } else {
      return null;
    }
  }
}