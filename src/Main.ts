import { window, Range, TextEditor, Position, QuickPickItem, Uri } from 'vscode';
import { AddTextParams, DeleteTextParams, Field, IMain, InsertTextParams, OPERATE, ReplaceTextParams, ReturnSelectedInfo, UpdateTextParams } from './interface/Main.interface';
import { asyncForEach } from './constant';
import { BaseClass } from './BaseClass';
import { diffLines } from 'diff'
import { Log } from './Log';
import { ErrorEnum, OtherEnum, WarnEnum } from './interface/Log.interface';

export class Main extends BaseClass implements IMain {

    // 区域 对比区域->更新区域
    operate: ({ value: number } & QuickPickItem) | undefined = undefined;
    // 分割符
    delimiter: string = '';

    // *********************
    // Execute function 
    // *********************

    // 执行插入操作
    async executeInsert(): Promise<void> {
        try {
            /**
             * 1. 输入插入的起始行数
             * 2. 选择多区域应该把这些都拼接起来，统一插入。 如果选择的行数目标编辑不存在，那么前面使用空行代替
             * 3. 错误处理
             */
            const { originEditor, targetEditors, targetEditorUri } = await this.getEditors();
            if (!originEditor || ((!targetEditors || targetEditors.length == 0) && (!targetEditorUri || targetEditorUri.length === 0))) return;

            const { ranges, texts } = this.getSelectedInfo(originEditor);
            if (!ranges || !texts) return;

            if (targetEditors && targetEditors.length > 0) {
                // 将内容插入另外编辑器相同内容
                await asyncForEach<TextEditor, Promise<void>>(targetEditors, async (editor) => {
                    await asyncForEach<string, Promise<void>>(texts, async (item) => {
                        await this.insertText({ editor, text: item })
                    })
                })
            } else if (targetEditorUri) {
                await asyncForEach<Uri, Promise<void>>(targetEditorUri, async (uri) => {
                    const editor = await this.openFile(uri);
                    if (editor) {
                        await asyncForEach<string, Promise<void>>(texts, async (item) => {
                            await this.insertText({ editor, text: item })
                        })
                    }
                })
            }
        } catch (error) {
            this.executeError(error);
        }
    }

    // 文本插入  line可选兼容replace调用
    async insertText(params: InsertTextParams): Promise<void> {
        try {
            let { editor, text, line } = params;
            let startLine = line ?? await window.showInputBox({ placeHolder: 'Insert the number of start line' });
            if (startLine === undefined) {
                throw new Error(OtherEnum.VOLUNTARILY_CANCEL);
            } else if (startLine && typeof +startLine !== 'number') {
                Log.warn({
                    type: WarnEnum.ILLEGAL_INPUT_VALUE,
                    data: 'Illegal number of inserted rows, please re-enter'
                });
            }
            startLine = startLine > 0 ? Math.round(+startLine) : 1;

            // 如果输入起始行大于最大行数,那么加空行
            const lineCount = editor.document.lineCount;
            const isOverflow = editor.document.lineCount < startLine ? true : false;
            // 溢出，目标结尾， 不溢出输入起始行数
            const position = new Position(isOverflow ? lineCount : startLine - 1, 0);
            if (isOverflow) {
                const overflowLine = startLine - lineCount;
                text = Array.from({ length: overflowLine }).fill('\r\n').join('') + text;
            } else {
                text = text.endsWith('\r\n') ? text : `${text}\r\n`;
            }
            await editor.edit((editorContext) => editorContext.insert(position, text));
        } catch (error) {
            this.executeError(error);
        }
    }

    // 执行替换操作 
    async executeReplace(): Promise<void> {
        try {
            /**
             * 1. 判断选中的是否已经到行末尾了，整行替换
             * 2. 如果target窗口目标文本也有选中的文本，那么应该替换target选中的文本 (解决key:value场景下，我只需要替换key或者value的需求)
             * 3. 允许选择多个key或者value，或者其他替换
             */

            const { originEditor, targetEditors, targetEditorUri } = await this.getEditors();
            if (!originEditor || ((!targetEditors || targetEditors.length == 0)
                && (!targetEditorUri || targetEditorUri.length === 0))) return;

            const { ranges, texts } = this.getSelectedInfo(originEditor);
            if (!ranges || !texts) return;

            if (targetEditors && targetEditors.length > 0) {
                // 具有多窗口
                await asyncForEach<TextEditor, Promise<void>>(targetEditors, async (editor) => {
                    const { ranges: targetRanges, texts: targetTexts } = this.getSelectedInfo(editor);
                    await asyncForEach<string, Promise<void>>(texts, async (item, index) => {
                        if (!targetTexts || !targetTexts[index]) {
                            // 不存在对应的选择区域
                            const { start, end } = await this.getAreaValue();
                            // 判断是否大于文档最大行数，如果是
                            const maxLine = editor.document.lineCount;
                            if (start > maxLine) {
                                // 大于，转为插入模式
                                await this.insertText({ editor, text: item, line: maxLine + 1 });
                            } else if (end > maxLine) {
                                // 大于， start -> maxLine 匹配整个文件
                                await this.replaceText({ editor, startLine: start, endLine: maxLine, text: item });
                            } else {
                                // 范围内
                                await this.replaceText({ editor, startLine: start, endLine: end, text: item });
                            }
                        } else if (targetRanges && targetRanges[index]) {
                            // 存在对应的选择区域
                            await editor.edit(editorContext => editorContext.replace(targetRanges[index], texts[index]))
                        }
                    })
                })
            } else if (targetEditorUri) {
                // 没打开,使用这个
                await asyncForEach<Uri, Promise<void>>(targetEditorUri, async (uri) => {
                    const editor = await this.openFile(uri);
                    if (editor) {
                        // 具有多窗口
                        await asyncForEach<string, Promise<void>>(texts, async (item, index) => {
                            // 不存在对应的选择区域
                            const { start, end } = await this.getAreaValue();
                            // 判断是否大于文档最大行数，如果是
                            const maxLine = editor.document.lineCount;
                            if (start > maxLine) {
                                // 大于，转为插入模式
                                await this.insertText({ editor, text: item, line: maxLine + 1 });
                            } else if (end > maxLine) {
                                // 大于， start -> maxLine 匹配整个文件
                                await this.replaceText({ editor, startLine: start, endLine: maxLine, text: item });
                            } else {
                                // 范围内
                                await this.replaceText({ editor, startLine: start, endLine: end, text: item });
                            }
                        })
                    }
                })
            }
        } catch (error) {
            this.executeError(error);
        }
    }

    async replaceText(params: ReplaceTextParams): Promise<void> {
        try {
            const { editor, startLine, endLine, text } = params;
            const document = editor.document;
            const replaceRange = new Range(document.lineAt(startLine - 1).range.start, document.lineAt(endLine - 1).range.end);
            await editor.edit(editorContext => editorContext.replace(replaceRange, text));
        } catch (error) {
            this.executeError(error);
        }
    }

    // 执行更新操作  
    async executeUpdate(): Promise<void> {
        try {
            // 选择区域 -> 更新区域. 条件区域可以是left/right/all 更新区域只能all
            await this.getCondition();

            // 进行数据组装
            const { originEditor, targetEditors, targetEditorUri } = await this.getEditors();
            if (!originEditor || ((!targetEditors || targetEditors.length == 0)
                && (!targetEditorUri || targetEditorUri.length === 0))) return;

            const { ranges, texts } = this.getSelectedInfo(originEditor);
            if (!ranges || !texts) return;

            if (targetEditors && targetEditors.length > 0) {
                // 具有多窗口
                await asyncForEach<TextEditor, Promise<void>>(targetEditors, async (editor) => {
                    const { ranges: targetRanges, texts: targetTexts } = this.getSelectedInfo(editor);
                    await asyncForEach<string, Promise<void>>(texts, async (item, index) => {
                        if (!targetTexts || !targetTexts[index]) {
                            // 不存在对应的选择区域
                            const { start, end } = await this.getAreaValue();
                            // 判断是否大于文档最大行数，如果是
                            const maxLine = editor.document.lineCount;
                            if (start > maxLine) {
                                // 大于，转为插入模式
                                await this.insertText({ editor, text: item, line: maxLine + 1 });
                            } else if (end > maxLine) {
                                // 大于， start -> maxLine 对比整个文件
                                const range = new Range(new Position(start - 1, 0), editor.document.lineAt(maxLine - 1).range.end);
                                let targetText = editor.document.getText(range);
                                let originTexts = item.split('\n');
                                let targetTexts = targetText.split('\n');
                                await this.updateText({ originText: originTexts, targetText: targetTexts, editor, range });
                            } else {
                                // 范围内
                                const range = new Range(new Position(start - 1, 0), editor.document.lineAt(end - 1).range.end);
                                let targetText = editor.document.getText(range);
                                let originTexts = item.split('\n');
                                let targetTexts = targetText.split('\n');
                                await this.updateText({ originText: originTexts, targetText: targetTexts, editor, range });
                            }
                        } else if (targetRanges && targetRanges[index] && targetTexts) {
                            // 存在对应的选择区域
                            let originTexts = item.split('\n');
                            let targetText = targetTexts[index].split('\n');
                            await this.updateText({ originText: originTexts, targetText, editor, range: targetRanges[index] });
                        }
                    })
                })
            } else if (targetEditorUri) {
                await asyncForEach<Uri, Promise<void>>(targetEditorUri, async (uri) => {
                    const editor = await this.openFile(uri);
                    if (editor) {
                        await asyncForEach<string, Promise<void>>(texts, async (item) => {
                            // 不存在对应的选择区域
                            const { start, end } = await this.getAreaValue();
                            // 判断是否大于文档最大行数，如果是
                            const maxLine = editor.document.lineCount;
                            if (start > maxLine) {
                                // 大于，转为插入模式
                                await this.insertText({ editor, text: item, line: maxLine + 1 });
                            } else if (end > maxLine) {
                                // 大于， start -> maxLine 对比整个文件
                                const range = new Range(new Position(start - 1, 0), editor.document.lineAt(maxLine - 1).range.end);
                                let targetText = editor.document.getText(range);
                                let originTexts = item.split('\n');
                                let targetTexts = targetText.split('\n');
                                await this.updateText({ originText: originTexts, targetText: targetTexts, editor, range });
                            } else {
                                // 范围内
                                const range = new Range(new Position(start - 1, 0), editor.document.lineAt(end - 1).range.end);
                                let targetText = editor.document.getText(range);
                                let originTexts = item.split('\n');
                                let targetTexts = targetText.split('\n');
                                await this.updateText({ originText: originTexts, targetText: targetTexts, editor, range });
                            }
                        })
                    }
                })
            }
        } catch (error) {
            this.executeError(error);
        }
    }

    // 获取到选择的区域信息
    getSelectedInfo(editor: TextEditor): Partial<ReturnSelectedInfo> {
        try {
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
            })
            return { ranges, texts };
        } catch (error) {
            this.executeError(error);
            return {};
        }
    }

    async getAreaValue(): Promise<{ start: number, end: number }> {
        const result = await window.showInputBox({ placeHolder: 'Start line/End line (select matching area)' });
        if (result === undefined) {
            throw new Error(OtherEnum.VOLUNTARILY_CANCEL);
        } else {
            const splits = result.split('/');
            if (typeof +splits[0] !== 'number' || typeof +splits[1] !== 'number'
                || +splits[0] < 1 || +splits[1] < 1
            ) {
                Log.warn({
                    type: WarnEnum.ILLEGAL_INPUT_VALUE,
                    data: '区域数据不合法,请重新输入'
                });
                return this.getAreaValue();
            } else {
                const start = Math.round(Math.min(+splits[0], +splits[1])) || 1;
                const end = Math.round(Math.max(+splits[0], +splits[1])) || 1;
                return { start, end };
            }
        }
    }

    // 更新文本
    async updateText(params: UpdateTextParams): Promise<void> {
        try {
            let { originText, targetText, editor, range } = params;

            // 对比的行数记录
            let originLine = 0;
            let addLine = 0;
            let deleteLine = 0;

            // 生成files组装数据
            let originFiles = this.generalFields(originText);
            let originCompareText = this.assembleCompareData(originFiles);
            let targetFiles = this.generalFields(targetText);
            let targetCompareText = this.assembleCompareData(targetFiles);

            // 对比不同
            let diffText = diffLines(targetCompareText, originCompareText);

            // 造出数据来，一次性replace掉
            diffText.forEach(item => {
                // 判断数据是否更改了 (行数需要移动)
                if (item.removed) {
                    const params = {
                        targetText,
                        deleteLine,
                        count: item.count ?? 0
                    }
                    targetText = this.deleteText(params);
                } else if (item.added) {
                    const params = {
                        originText,
                        originLine,
                        targetText,
                        addLine,
                        count: item.count ?? 0
                    }
                    targetText = this.addText(params);
                    addLine += item.count ?? 0;
                    deleteLine += item.count ?? 0;
                    originLine += item.count ?? 0;
                } else {
                    addLine += item.count ?? 0;
                    deleteLine += item.count ?? 0;
                    originLine += item.count ?? 0;
                }
            })
            await editor.edit(editorContext => editorContext.replace(range, targetText.join('\n')));
        } catch (error) {
            this.executeError(error);
        }
    }

    // 添加
    addText(params: AddTextParams): Array<string> {
        try {
            // $ 当更新区域时left\right的时候，需要整行更新，直接插入
            const { originText, originLine, targetText, addLine, count } = params;
            const addTexts = Array.from({ length: count }).map((item, index) => originText[originLine + index]);
            targetText.splice(addLine, 0, ...addTexts);
            return targetText;
        } catch (error) {
            this.executeError(error);
            return [];
        }
    }

    // 删除
    deleteText(params: DeleteTextParams): Array<string> {
        try {
            const { targetText, deleteLine, count } = params;
            targetText.splice(deleteLine, count)
            return targetText;
        } catch (error) {
            this.executeError(error);
            return [];
        }
    }

    async getCondition(): Promise<void> {
        // 匹配操作
        this.operate = await window.showQuickPick<{ value: number } & QuickPickItem>(
            [
                {
                    label: OPERATE[0],
                    value: OPERATE['Left  ->  All']
                }, {
                    label: OPERATE[1],
                    value: OPERATE['Right ->  All']
                }, {
                    label: OPERATE[2],
                    value: OPERATE['All   ->  All']
                }
            ], { placeHolder: 'Select the comparison area -> Update area (behavior unit)' });

        if (this.operate === undefined) {
            throw new Error(OtherEnum.VOLUNTARILY_CANCEL);
        }

        if (this.operate?.value !== OPERATE['All   ->  All']) {
            // 匹配模式， 分割符， 以分隔符为中线， 条件 左/右/全部 ;  更新 左/右/全部
            const result = await window.showInputBox({ placeHolder: 'Separator' });
            if (result === undefined) {
                throw new Error(OtherEnum.VOLUNTARILY_CANCEL);
            }
            this.delimiter = result;
        }
    }

    // 生成fields
    generalFields(rows: string[]): Field[] {
        try {
            let Fields: Field[] = []
            // all -> all不用对数组进行分割
            if (this.operate?.value === OPERATE['All   ->  All']) {
                Fields = rows.map((item) => ({ left: '', right: '', all: item }))
            } else {
                Fields = rows.map((item) => {
                    let mid = item.indexOf(this.delimiter);
                    let left = item.substring(0, mid);
                    let right = item.substring(mid + 1, item.length);
                    return { left, right, all: item }
                })
            }
            return Fields;
        } catch (error) {
            this.executeError(error);
            return [];
        }
    }

    // 组装对比数据
    assembleCompareData(Fields: Field[]): string {
        try {
            let result = '';
            switch (this.operate?.value) {
                case OPERATE['All   ->  All']: {
                    result = Fields.map(item => item.all).join('\n')
                    break;
                }
                case OPERATE['Right ->  All']: {
                    result = Fields.map(item => item.right).join('\n')
                    break;
                }
                case OPERATE['Left  ->  All']: {
                    result = Fields.map(item => item.left).join('\n')
                    break;
                }
            }
            return result + '\n';
        } catch (error) {
            this.executeError(error);
            return '';
        }
    }

    // 处理错误
    executeError(error: unknown) {
        if ((error as Error).message !== OtherEnum.VOLUNTARILY_CANCEL) {
            Log.error({
                type: ErrorEnum.UNKNOWN_MISTAKE,
                data: error,
                items: ['OpenIssue']
            });
        }
    }
}