import { workspace, window, ViewColumn, Uri, TextEditor, TextDocumentShowOptions, Range } from 'vscode';
import { asyncForEach } from './constant';
import { ConfigType, IBaseClass, ReturnEditors } from './interface/BaseClass.interface';
import { Logger } from './Logger';
import { basename } from 'path';
import { ErrorEnum, InfoEnum, WarnEnum, OtherEnum } from './interface/Logger.interface';
import { ReturnSelectedInfo } from './interface/Main.interface';
// 一些基础方法
export class BaseClass implements IBaseClass {

    // *********************
    // Config
    // *********************

    // 获取到配置信息
    getConfig(config: ConfigType): Array<string> | boolean {
        const EMPTY = config === 'multipleFilePath' ? [] : false;
        console.log( workspace.getConfiguration().get(config));
        
        return workspace.getConfiguration().get(config) || EMPTY;
    }

    // *********************
    // Editor
    // *********************

    // 获取到相关编辑器
    async getEditors(): Promise<ReturnEditors> {
        /**
         * 1. 最左边为origin  其余的都为target
         * 2. 如果可见窗口只有单个，那么匹配multipleFilePath, 如果没有提示去设置,有就打开它们。不以侧边栏的形式
         */
        try {
            const visibleEditor = window.visibleTextEditors;

            if (visibleEditor.length === 0) { return {}; }
            let [originEditor, ...rest] = visibleEditor;

            if (rest.length > 0) {
                return { originEditor, targetEditors: rest };
            } else {
                const multipleFilePath = this.getConfig('multipleFilePath') as Array<string>;
                let targetEditorUri: Array<Uri> = [];
                if (multipleFilePath.length === 0) {
                    Logger.info({
                        type: InfoEnum.TO_SETTING,
                        data: 'Go to the settings page to configure the multi-file path configuration',
                        items: ['ToSetting'],
                    });
                } else {
                    const name = workspace.name ?? '';
                    const originPath = originEditor.document.uri.path;
                    const rootPath = `${originPath.split(name)[0]}${name}`;
                    await asyncForEach<string, Promise<void>>(multipleFilePath, async (item, index) => {
                        const path = rootPath + (item.startsWith('/') ? item : `/${item}`);
                        // 排除掉自身
                        if (originPath !== path) {
                            const uri = originEditor.document.uri.with({ path });
                            targetEditorUri.push(uri);
                        }
                    });
                }
                console.log(targetEditorUri, '212121');

                return { originEditor, targetEditors: [], targetEditorUri };
            }
        } catch (error) {
            Logger.error({
                type: ErrorEnum.UNKNOWN_MISTAKE,
                data: error,
                items: ['OpenIssue']
            });
            return {};
        }
    }

    // 打开文件
    async openFile(uri: Uri, options?: TextDocumentShowOptions): Promise<TextEditor | undefined> {
        try {
            const document = await workspace.openTextDocument(uri);
            return await window.showTextDocument(document, options ?? { preview: false });
        } catch (error) {
            // 文件名不存在导致的异常
            if (error.message.search(/cannot open/gm)) {
                Logger.warn({
                    type: WarnEnum.FILE_OPENING_EXCEPTION,
                    data: `Operate file ${basename(uri.path)}  unsuccessfully, please check whether the file is normal`
                });
            } else {
                Logger.error({
                    type: ErrorEnum.UNKNOWN_MISTAKE,
                    data: error,
                    items: ['OpenIssue']
                });
            }
        }
    }

    //  执行命令打开
    async executeOpenFile(...args: any[]): Promise<void> {
        /**
         * 1.任意个 文件，
         * 2.自定义编辑模块，左边origin
         * 3. 如果以及窗口已经被打开那么
         */

        console.log(args, '21212');
        await asyncForEach<Uri, Promise<void>>(args[1], async (uri: Uri, index) => {
            const viewColumn = index === 0 ? ViewColumn.One : ViewColumn.Beside;
            this.openFile(uri, { viewColumn });
        });
    }

    // *********************
    // Service Function
    // *********************

    // 获取插入行的文本
    async getInsertLine(line?: number): Promise<number> {
        let startLine = line ?? await window.showInputBox({ placeHolder: 'Insert the number of start line' });
        if (startLine === undefined) {
            throw new Error(OtherEnum.VOLUNTARILY_CANCEL);
        } else if (startLine && typeof +startLine === 'number') {
            // startLine = startLine > 0 ? Math.round(+startLine) : 1;
            startLine = Math.max(Math.round(+startLine), 1);
            return startLine;
        } else {
            Logger.warn({
                type: WarnEnum.ILLEGAL_INPUT_VALUE,
                data: 'Illegal number of inserted rows, please re-enter'
            });
            return await this.getInsertLine(line);
        }
    }

    // 获取到输入区域的值
    async getAreaValue(): Promise<{ start: number, end: number }> {
        const result = await window.showInputBox({ placeHolder: 'Start line/End line (select matching area)' });
        if (result === undefined) {
            throw new Error(OtherEnum.VOLUNTARILY_CANCEL);
        } else {
            const splits = result.split('/');
            const firstLine = +splits[0];
            const secondLine = +splits[1];

            if (typeof firstLine !== 'number' || typeof secondLine !== 'number'
                || firstLine < 1 || secondLine < 1
            ) {
                Logger.warn({
                    type: WarnEnum.ILLEGAL_INPUT_VALUE,
                    data: '区域数据不合法,请重新输入'
                });
                return await this.getAreaValue();
            } else {
                const start = Math.round(Math.min(firstLine, secondLine)) || 1;
                const end = Math.round(Math.max(firstLine, secondLine)) || 1;
                return { start, end };
            }
        }
    }

    // 获取到选择的区域信息
    getSelectedInfo(editor: TextEditor): ReturnSelectedInfo {
        let ranges: Array<Range> = [];
        let texts: Array<string> = [];
        let selections = editor.selections;

        let noEmptySelect = selections.filter(item =>
            item.start.line !== item.end.line ||
            item.start.character !== item.end.character);

        noEmptySelect.sort((pre, next) => pre.start.line - next.start.line);

        noEmptySelect.forEach(item => {
            const range = new Range(item.start, item.end);
            ranges.push(range);
            texts.push(editor.document.getText(range));
        });
        return { ranges, texts };
    }
}
