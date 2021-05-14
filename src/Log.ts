// 日志系统 --- 错误边界定义    (将错误限定在当前插件内部)   如何定制一个错误
import { window, commands, Uri } from 'vscode'
import { ErrorEnum, ErrorType, ILog, InfoEnum, InfoType, WarnEnum, WarnType } from "./interface/Log.interface";
export class Log implements ILog {
    static readonly _github: string = 'https://github.com/AKclown/file-teleport/issues';

    static async error(error: ErrorType) {
        await window.showErrorMessage(JSON.stringify(error.data), ...(error.items ?? []));
        switch (error.type) {
            case ErrorEnum.UNKNOWN_MISTAKE:
                commands.executeCommand('vscode.open', Uri.parse(this._github));
            default: null;
        }
    }

    static async warning(warn: WarnType) {
        await window.showWarningMessage(JSON.stringify(warn.data), ...(warn.items ?? []));
        switch (warn.type) {
            case WarnEnum.CANCEL_AREA:
                commands.executeCommand('vscode.open', Uri.parse(this._github));
            default: null;
        }
    }

    static async info(info: InfoType) {
        await window.showInformationMessage(JSON.stringify(info.data), ...(info.items ?? []));
        switch (info.type) {
            case InfoEnum.TO_SETTING:
                commands.executeCommand('vscode.open', Uri.parse(this._github));
            default: null;
        }
    }
}