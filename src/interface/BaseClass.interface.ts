import { TextEditor, Uri } from 'vscode';

export interface IBaseClass {

}


export type ReturnEditors = {
    originEditor?: TextEditor;
    targetEditors?: Array<TextEditor>;
    // 解决无法多窗口先开修改问题
    targetEditorUri?: Array<Uri>
}