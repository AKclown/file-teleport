export interface ILog {

}


export type ErrorType = {
    label: ErrorLabelType;
    data: unknown;
    items?: Array<string>;
}
export type ErrorLabelType = 'OpenIssue';

export type WarnType = {
    label: WarnLabelType;
    data: unknown;
    items?: Array<string>;
}
export type WarnLabelType = 'CancelArea' | 'IllegalArea';


export type InfoType = {
    label: InfoLabelType;
    data: unknown;
    items?: Array<string>;
}
export type InfoLabelType = 'ToSetting';