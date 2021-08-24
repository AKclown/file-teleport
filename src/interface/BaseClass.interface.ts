import { TextDocumentShowOptions, TextEditor, Uri } from 'vscode';

export interface IBaseClass {
    getConfig(config: ConfigType): Array<string> | boolean;

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
};

// 设置项
export type ConfigType = 'multipleFilePath' | 'persistentInput';