import type { Logging } from 'homebridge';
import { Status, Mode, CommandResult } from './apiTypes.js';
import EventEmitter from 'node:events';
export default class PhilipsAPI {
    private readonly logger;
    private readonly host;
    private readonly port;
    private readonly eventEmitter;
    constructor(logger: Logging, host: string, port: number);
    observeState(): void;
    private getSync;
    changeStatus(status: Status): Promise<CommandResult>;
    changeMode(mode: Mode): Promise<CommandResult>;
    private sendCommand;
    getEventEmitter(): EventEmitter;
}
