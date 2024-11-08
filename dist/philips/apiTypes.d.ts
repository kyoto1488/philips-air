export declare enum Mode {
    GENERAL_AUTO = 0,
    SLEEP = 1,
    TURBO = 2
}
export declare enum Status {
    ON = 0,
    OFF = 1
}
export interface State {
    pm2_5: number;
    mode: Mode;
    status: Status;
}
export interface Info {
    name: string;
    model: string;
}
export interface CommandResult {
    status: 'failed' | 'success';
}
