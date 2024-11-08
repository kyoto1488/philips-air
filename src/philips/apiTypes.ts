export enum Mode {
    GENERAL_AUTO,
    SLEEP,
    TURBO
}

export enum Status {
    ON,
    OFF
}

export interface State {
    pm2_5: number,
    mode: Mode,
    status: Status
}

export interface Info {
    name: string,
    model: string
}

export interface CommandResult {
    status: 'failed' | 'success'
}