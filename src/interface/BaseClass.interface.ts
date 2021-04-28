import { TextEditor } from 'vscode';

export interface IBaseClass {
    originEditor: TextEditor;
    targetEditor: Array<TextEditor>;

    changeOriginEditor():void;

    changeTargetEditor():void;
}