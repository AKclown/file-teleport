// 日志系统 --- 错误边界定义    (将错误限定在当前插件内部)
import { window, commands, Uri } from 'vscode'
import { ILog } from "./interface/Log.interface";

export class Log implements ILog {
    static readonly _github: string = 'https://github.com/AKclown/file-teleport/issues';

    
    
    static async error(data: unknown) {
        const result = await window.showErrorMessage(JSON.stringify(data), 'OpenIssue');
        if (result === 'Issue')
            commands.executeCommand('vscode.open', Uri.parse(this._github));
    }

    static async warning(data: unknown) {
        const result = await window.showWarningMessage(JSON.stringify(data), 'Issue');
        if (result === 'Issue')
            commands.executeCommand('vscode.open', Uri.parse(this._github));
    }

    static async info(data: unknown) {
        const result = await window.showInformationMessage(JSON.stringify(data), 'OpenSetting');
        if (result === 'toSetting')
            commands.executeCommand('workbench.action.openWorkspaceSettings');
    }
}