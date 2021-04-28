
import { TextEditor } from 'vscode';
import { IBaseClass } from './interface/BaseClass.interface';

// todo 还在考虑基类怎么写
export class BaseClass implements IBaseClass {
    originEditor: TextEditor;
    targetEditor: Array<TextEditor>;
    constructor(originEditor: TextEditor, targetEditor: Array<TextEditor>) {
        this.originEditor = originEditor;
        this.targetEditor = targetEditor;
    }

    changeOriginEditor() { }

    changeTargetEditor() { }
}