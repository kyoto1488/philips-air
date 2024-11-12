import crypto from 'crypto';
import coap, { IncomingMessage, OutgoingMessage } from 'coap';
import { decrypt, encrypt, nextClientKey } from './encryption.js';
import type { Logging } from 'homebridge';
import { Status, Mode, CommandResult } from './apiTypes.js';
import AsyncLock, { AsyncLockDoneCallback } from 'async-lock';
import EventEmitter from 'node:events';
import BufferListStream from 'bl';

const lock = new AsyncLock({
  timeout: 15000,
});

export default class PhilipsAPI {
  private readonly eventEmitter: NodeJS.EventEmitter = new EventEmitter;

  public constructor(
      private readonly logger: Logging,
      private readonly host: string,
      private readonly port: number,
  ) {
    this.logger.debug('An API client for the device has been created');
  }

  public observeState(): void {
    this.logger.debug('Attempt to make a request to get the device status');

    const request: OutgoingMessage = coap.request({
      host: this.host,
      port: this.port,
      method: 'GET',
      pathname: '/sys/dev/status',
      observe: true,
    });

    request.on('response', (response: IncomingMessage): void => {
      response.on('data', (data: Buffer): void => {
        const parsedData = decrypt(data.toString());
        const parsed = parsedData.state.reported;

        this.logger.debug('Status received from the device', parsed);

        let mode: Mode = Mode.GENERAL_AUTO;
        switch (parsed['D03-12']) {
        case 'Turbo':
          mode = Mode.TURBO;
          break;
        case 'Sleep':
          mode = Mode.SLEEP;
          break;
        }

        let status: Status = Status.OFF;
        switch (parsed['D03-02']) {
        case 'ON':
          status = Status.ON;
          break;
        case 'OFF':
          status = Status.OFF;
          break;
        }

        this.eventEmitter.emit('source:state', {
          pm2_5: parsed['D03-33'],
          mode,
          status,
        });
      });
    });

    request.on('error', (err) => {
      this.logger.error('Error while request on state', err);

      this.observeState();
    });

    request.end();
  }

  private getSync(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const fn = (done: AsyncLockDoneCallback<Buffer>): void => {
        const payload = crypto.randomBytes(4)
          .toString('hex')
          .toUpperCase();

        const request: OutgoingMessage = coap.request({
          host: this.host,
          port: this.port,
          method: 'POST',
          pathname: '/sys/dev/sync',
        });

        request.write(Buffer.from(payload));

        request.on('response', (response: IncomingMessage): void => {
          response.pipe(BufferListStream((err: Error, buffer: Buffer): void => {
            if (buffer) {
              done(null, buffer);
            }
          }));
        });

        request.on('error', (err): void => {
          done(err);
        });

        request.end();
      };

      const cb: AsyncLockDoneCallback<Buffer> = (err?: Error|null, ret?: Buffer): void => {
        if (err) {
          reject(err);
        }
        if (ret) {
          resolve(ret);
        }
      };

      lock.acquire('api:get_sync', fn, cb);
    });
  }

  public changeStatus(status: Status): Promise<CommandResult> {
    const mapStatus = [
      ['ON', Status.ON],
      ['OFF', Status.OFF],
    ];

    for (const map of mapStatus) {
      if (map[1] === status) {
        return this.sendCommand({
          'D03-02': map[0],
        });
      }
    }

    throw new Error('Invalid mode');
  }

  public changeMode(mode: Mode): Promise<CommandResult> {
    const mapModes = [
      ['Sleep', Mode.SLEEP],
      ['Auto General', Mode.GENERAL_AUTO],
      ['Turbo', Mode.TURBO],
    ];

    for (const map of mapModes) {
      if (map[1] === mode) {
        return this.sendCommand({
          'D03-12': map[0],
        });
      }
    }

    throw new Error('Invalid mode');
  }

  private sendCommand(params: object): Promise<CommandResult> {
    this.logger.debug('Attempt to execute a command on the device');

    return new Promise((resolve, reject): void => {
      const fn = (done: AsyncLockDoneCallback<CommandResult>): void => {
        this.getSync().then((buffer: Buffer): void => {
          const originalCounter = buffer.toString();
          this.logger.debug('The counter has been received from the device', originalCounter);

          const clientKey: string = nextClientKey(originalCounter);

          const state = {
            state: {
              desired: {
                CommandType: 'app',
                DeviceId: '',
                EnduserId: '',
                ...params,
              },
            },
          };

          const payload = encrypt(clientKey, JSON.stringify(state));

          const request = coap.request({
            host: this.host,
            port: this.port,
            method: 'POST',
            pathname: '/sys/dev/control',
            retrySend: 3,
          });

          request.write(payload);

          request.on('response', (response: IncomingMessage): void => {
            response.pipe(BufferListStream((err: Error, buffer: Buffer): void => {
              if (err) {
                this.logger.error('Buffer error', err);
              }

              if (buffer) {
                done(null, JSON.parse(buffer.toString()));
              }
            }));
          });

          request.on('error', (err) => {
            done(err);
          });

          request.end();
        });
      };

      const cb: AsyncLockDoneCallback<CommandResult> = (err?: Error|null, ret?: CommandResult): void => {
        if (err) {
          reject(err);
        }

        if (ret) {
          resolve(ret);
        }
      };

      lock.acquire('api:send_command', fn, cb);
    });
  }

  public getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }
}