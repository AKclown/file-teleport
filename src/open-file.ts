import { Uri, workspace, window } from 'vscode';

export async function executeOpenFile(...args: any[]) {
    /**
     * 1.自定义编辑模块，左边origin 右边target
     */
    const [originFileUri, filesUri] = args;

    const originFileDocument = await workspace.openTextDocument(originFileUri);


}