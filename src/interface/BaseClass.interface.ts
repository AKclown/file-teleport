import { TextEditor } from 'vscode';

export interface IBaseClass {
    originEditor: TextEditor | undefined;
    targetEditor: Map<string, TextEditor>;

    changeOriginEditor():void;

    changeTargetEditor():void;
}