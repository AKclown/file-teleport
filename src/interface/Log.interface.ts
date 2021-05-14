export interface ILog {

}


export type ErrorType = {
    type: ErrorEnum;
    data: unknown;
    items?: Array<string>;
}
// 错误类型定义
export enum ErrorEnum {
    UNKNOWN_MISTAKE = 'UNKNOWN_MISTAKE',
}

export type WarnType = {
    type: WarnEnum;
    data: unknown;
    items?: Array<string>;
}

// 警告类型定义
export enum WarnEnum {
    CANCEL_AREA = 'CANCEL_AREA',
    ILLEGAL_AREA = 'ILLEGAL_AREA',
}

export type InfoType = {
    type: InfoEnum;
    data: unknown;
    items?: Array<string>;
}
// 错误类型定义
export enum InfoEnum {
    TO_SETTING = 'TO_SETTING'
}