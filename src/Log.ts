// 日志系统 --- 错误边界定义    (将错误限定在当前插件内部)   如何定制一个错误
import { window, commands, Uri } from 'vscode'
import { ErrorEnum, ErrorType, ILog, InfoEnum, InfoType, WarnEnum, WarnType } from "./interface/Log.interface";
export class Log implements ILog {

    static readonly _github: string = 'https://github.com/AKclown/file-teleport/issues';

    static async error(error: ErrorType) {
        try {
            await window.showErrorMessage(JSON.stringify(error.data), ...(error.items ?? []));
            switch (error.type) {
                case ErrorEnum.UNKNOWN_MISTAKE:
                    commands.executeCommand('vscode.open', Uri.parse(this._github));
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.log(error);
        }
    }

    static async warn(warn: WarnType) {
        try {
            await window.showWarningMessage(JSON.stringify(warn.data), ...(warn.items ?? []));
            switch (warn.type) {
                case WarnEnum.ILLEGAL_INPUT_VALUE:
                    break;
                case WarnEnum.FILE_OPENING_EXCEPTION:
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.log(error);
        }
    }

    static async info(info: InfoType) {
        try {
            await window.showInformationMessage(JSON.stringify(info.data), ...(info.items ?? []));
            switch (info.type) {
                case InfoEnum.TO_SETTING:
                    commands.executeCommand('vscode.open', Uri.parse(this._github));
                default:
                    break;
            }
        } catch (error) {
            console.log(error);
        }
    }
}