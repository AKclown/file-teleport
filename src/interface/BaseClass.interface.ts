import { TextDocumentShowOptions, TextEditor, Uri } from 'vscode';

export interface IBaseClass {
    getConfig(): Array<string>;

    getEditors(): Promise<ReturnEditors>;

    openFile(uri: Uri, options?: TextDocumentShowOptions): Promise<TextEditor | undefined>;

    executeOpenFile(...args: any[]): Promise<void>;
}

// *********************
// type 
// *********************

export type ReturnEditors = {
    originEditor?: TextEditor;
    targetEditors?: Array<TextEditor>;
    // 解决无法多窗口先开修改问题
    targetEditorUri?: Array<Uri>
}