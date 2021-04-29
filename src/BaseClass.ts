import { TextEditor } from 'vscode';
import { IBaseClass } from './interface/BaseClass.interface';

export class BaseClass implements IBaseClass {
    originEditor: TextEditor | undefined = undefined;
    // 频繁操作 map比object性能更加
    targetEditor: Map<string, TextEditor> = new Map();

    changeOriginEditor() { }

    changeTargetEditor() { }
}