import { workspace, window, ViewColumn } from 'vscode';
import { IFile } from './type';

export class FileRelated implements IFile {
    async executeOpenFile(...args: any[]): Promise<void> {
        /**
         * 1.如果只选择一个文件，提示需要选择两个文件
         * 2.自定义编辑模块，左边origin 右边target
         */
        try {
            const [originFileUri, targetFilesUri] = args[1];
            const originDoc = await workspace.openTextDocument(originFileUri);
            const targetDoc = await workspace.openTextDocument(targetFilesUri);

            await window.showTextDocument(originDoc);
            await window.showTextDocument(targetDoc, ViewColumn.Beside);
        } catch (error) {

        }
    }
}