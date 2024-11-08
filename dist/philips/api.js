import crypto from 'crypto';
import coap from 'coap';
import { decrypt, encrypt, nextClientKey } from './encryption.js';
import { Status, Mode } from './apiTypes.js';
import AsyncLock from 'async-lock';
import EventEmitter from 'node:events';
const lock = new AsyncLock({
    timeout: 60000,
});
export default class PhilipsAPI {
    logger;
    host;
    port;
    clientKey;
    eventEmitter = new EventEmitter;
    constructor(logger, host, port, clientKey) {
        this.logger = logger;
        this.host = host;
        this.port = port;
        this.clientKey = clientKey;
        this.logger.debug('An API client for the device has been created');
    }
    static async create(logger, host, port = 5683) {
        const clientKey = (await PhilipsAPI.getSync(host, port)).toString();
        return new PhilipsAPI(logger, host, port, clientKey);
    }
    runObserver() {
        const callback = () => {
            this.getState()
                .then((currentState) => {
                this.getEventEmitter().emit('source:state', currentState);
            })
                .catch(() => null)
                .finally(() => {
                setTimeout(this.runObserver.bind(this), 5000);
            });
        };
        callback();
    }
    static getSync(host, port) {
        return new Promise((resolve, reject) => {
            const fn = (done) => {
                const payload = crypto.randomBytes(4)
                    .toString('hex')
                    .toUpperCase();
                const request = coap.request({
                    host: host,
                    port: port,
                    method: 'POST',
                    pathname: '/sys/dev/sync',
                });
                request.write(Buffer.from(payload));
                request.on('response', (incomingMessage) => {
                    incomingMessage.on('data', (data) => {
                        done(null, data);
                    });
                });
                request.on('error', (err) => {
                    done(err);
                });
                request.end();
            };
            const cb = (err, ret) => {
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
    getInfo() {
        this.logger.info('Attempt to make a request to retrieve device information');
        return new Promise((resolve, reject) => {
            const fn = (done) => {
                const request = coap.request({
                    host: this.host,
                    port: this.port,
                    method: 'GET',
                    pathname: '/sys/dev/info',
                });
                request.on('response', (incomingMessage) => {
                    incomingMessage.on('data', (data) => {
                        const parsed = JSON.parse(data.toString());
                        done(null, {
                            name: parsed['D01-03'],
                            model: parsed['D01-05'],
                        });
                    });
                });
                request.on('error', (err) => {
                    done(err);
                });
                request.end();
            };
            const cb = (err, ret) => {
                if (err) {
                    this.logger.error('An error occurred during the API request', err);
                    reject(err);
                }
                if (ret) {
                    resolve(ret);
                }
            };
            lock.acquire('api:get_info', fn, cb);
        });
    }
    getState() {
        this.logger.debug('Attempt to make a request to retrieve the state');
        return new Promise((resolve, reject) => {
            const fn = (done) => {
                const request = coap.request({
                    host: this.host,
                    port: this.port,
                    method: 'GET',
                    pathname: '/sys/dev/status',
                    observe: true,
                    retrySend: 10,
                });
                request.on('response', (incomingMessage) => {
                    incomingMessage.on('data', (data) => {
                        const parsedData = decrypt(data.toString());
                        const parsed = parsedData.state.reported;
                        incomingMessage.close();
                        this.logger.debug('Status received from the device', parsed);
                        let mode = Mode.GENERAL_AUTO;
                        switch (parsed['D03-12']) {
                            case 'Turbo':
                                mode = Mode.TURBO;
                                break;
                            case 'Sleep':
                                mode = Mode.SLEEP;
                                break;
                        }
                        let status = Status.OFF;
                        switch (parsed['D03-02']) {
                            case 'ON':
                                status = Status.ON;
                                break;
                            case 'OFF':
                                status = Status.OFF;
                                break;
                        }
                        done(null, {
                            pm2_5: parsed['D03-33'],
                            mode,
                            status,
                        });
                    });
                });
                request.on('error', (err) => {
                    this.logger.error('Error while request on state', err);
                    PhilipsAPI.getSync(this.host, this.port)
                        .then(token => {
                        this.clientKey = token.toString();
                        done(err);
                    })
                        .catch(() => done(err));
                });
                request.end();
            };
            const cb = (err, ret) => {
                if (err) {
                    reject(err);
                }
                if (ret) {
                    resolve(ret);
                }
            };
            lock.acquire('api:get_state', fn, cb);
        });
    }
    changeStatus(status) {
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
    changeMode(mode) {
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
    sendCommand(params) {
        this.logger.debug('Attempt to execute a command on the device');
        return new Promise((resolve, reject) => {
            const fn = (done) => {
                this.clientKey = nextClientKey(this.clientKey);
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
                const payload = encrypt(this.clientKey, JSON.stringify(state));
                const request = coap.request({
                    host: this.host,
                    port: this.port,
                    method: 'POST',
                    pathname: '/sys/dev/control',
                });
                request.write(payload);
                request.on('response', (incomingMessage) => {
                    incomingMessage.on('data', (data) => {
                        done(null, JSON.parse(data.toString()));
                    });
                });
                request.on('error', (err) => {
                    done(err);
                });
                request.end();
            };
            const cb = (err, ret) => {
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
    getEventEmitter() {
        return this.eventEmitter;
    }
}
//# sourceMappingURL=api.js.map