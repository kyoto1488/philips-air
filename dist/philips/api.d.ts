import type { Logging } from 'homebridge';
import { Status, Info, Mode, State, CommandResult } from './apiTypes.js';
import EventEmitter from 'node:events';
export default class PhilipsAPI {
    private readonly logger;
    private readonly host;
    private readonly port;
    private clientKey;
    private readonly eventEmitter;
    private constructor();
    static create(logger: Logging, host: string, port?: number): Promise<PhilipsAPI>;
    runObserver(): void;
    private static getSync;
    getInfo(): Promise<Info>;
    getState(): Promise<State>;
    changeStatus(status: Status): Promise<CommandResult>;
    changeMode(mode: Mode): Promise<CommandResult>;
    private sendCommand;
    getEventEmitter(): EventEmitter;
}
