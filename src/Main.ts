import { window, Range, TextEditor, Position, QuickPickItem, Uri } from 'vscode';
import { AddTextParams, DeleteTextParams, Field, IMain, OPERATE, ReturnRelatedData, ReturnRelatedEditor, ReturnSelectedInfo } from './interface/Main.interface';
import { asyncForEach } from './constant';
import { BaseClass } from './BaseClass';
import { diffLines } from 'diff'
import { Log } from './Log';

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
            let insertStartLine = +(await window.showInputBox({ placeHolder: '插入起始行数' }) || '1');
            insertStartLine = insertStartLine > 0 ? Math.round(insertStartLine) : 1

            const { originEditor, targetEditors, targetEditorUri } = await this.getEditors();
            if (!originEditor || ((!targetEditors || targetEditors.length == 0) && (!targetEditorUri || targetEditorUri.length === 0))) return;

            const { ranges, texts } = this.getSelectedInfo(originEditor);
            if (!ranges || !texts) return;

            if (targetEditors && targetEditors.length > 0) {
                // 将内容插入另外编辑器相同内容
                await asyncForEach<TextEditor, Promise<void>>(targetEditors, async (editor) => {
                    await this.insertText(editor, insertStartLine, texts)
                })
            } else if (targetEditorUri) {
                await asyncForEach<Uri, Promise<void>>(targetEditorUri, async (uri) => {
                    const editor = await this.openFile(uri);
                    editor && await this.insertText(editor, insertStartLine, texts)
                })
            }
        } catch (error) {
            Log.error(error);
        }
    }

    // 文本插入
    async insertText(editor: TextEditor, insertStartLine: number, texts: string[]) {
        // 如果输入起始行大于最大行数,那么加空行
        const lineCount = editor.document.lineCount;
        const isOverflow = editor.document.lineCount < insertStartLine ? true : false;
        // 溢出，目标结尾， 不溢出输入起始行数
        const position = new Position(isOverflow ? lineCount : insertStartLine - 1, 0);

        let updateText = texts.join('\r\n');
        if (isOverflow) {
            const overflowLine = insertStartLine - lineCount;
            updateText = Array.from({ length: overflowLine }).fill('\r\n').join('') + updateText;
        } else {
            updateText = updateText.endsWith('\r\n') ? updateText : `${updateText}\r\n`;
        }
        await editor.edit((editorContext) => editorContext.insert(position, updateText))
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
                const range = new Range(item.start, item.end)
                ranges.push(range);
                texts.push(editor.document.getText(range))
            })
            return { ranges, texts }
        } catch (error) {
            Log.error(error);
            return {};
        }
    }

    // todo 执行替换操作 
    async executeReplace(): Promise<void> {
        try {
            /**
             * 1. 判断选中的是否已经到行末尾了，整行替换
             * 2. 如果target窗口目标文本也有选中的文本，那么应该替换target选中的文本 (解决key:value场景下，我只需要替换key或者value的需求)
             * 3. 允许选择多个key或者value，或者其他替换
             */

            const { originEditor, targetEditors, targetEditorUri } = await this.getEditors();
            if (!originEditor || ((!targetEditors || targetEditors.length == 0) && (!targetEditorUri || targetEditorUri.length === 0))) return;

            const { ranges, texts } = this.getSelectedInfo(originEditor);
            if (!ranges || !texts) return;

            if (targetEditors && targetEditors.length > 0) {
                // 具有多窗口
                await asyncForEach<TextEditor, Promise<void>>(targetEditors, async (editor) => {
                    const { ranges: targetRanges, texts: targetTexts } = this.getSelectedInfo(editor);
                    await asyncForEach<string, Promise<void>>(texts, async (item, index) => {
                        console.log('asda');
                        console.log(targetTexts);
                        if (!targetTexts || !targetTexts[index]) {
                            // 不存在对应的选择区域
                            await this.getAreaValue();

                        } else {

                        }
                    })
                })

            } else if (targetEditorUri) {
                // 没打开,使用这个


            }


            // const { activeEditor, otherEditor } = this.getRelatedEditor();
            // const { ranges, texts } = this.getRelatedData(activeEditor);
            // // 将内容插入另外编辑器相同内容
            // for (const editor of otherEditor) {
            //     // 目标窗口的ranges     (这个可能没有选中)
            //     const { ranges: targetRanges } = this.getRelatedData(editor);

            //     if (targetRanges.length === 0) {
            //         // 这里必须await，不然只会保留第一次
            //         asyncForEach<Range, Promise<void>>(ranges, async (range: Range, index: number) => {
            //             // 需要判断range是否已经是末尾了,是需要将替换的整行都替换，而不是部分
            //             let isTextEnd = this.isTextEnd(activeEditor, range);
            //             let replaceRange = range;
            //             if (isTextEnd) {
            //                 const endPosition = new Position(range.end.line, editor.document.lineAt(range.end.line).text.length);
            //                 replaceRange = replaceRange.with(replaceRange.start, endPosition)
            //             }
            //             await editor.edit(editorContext => editorContext.replace(replaceRange, texts[index]))
            //         })
            //     } else {
            //         // 替换掉选中的文本
            //         asyncForEach<Range, Promise<void>>(targetRanges, async (range: Range, index: number) => {
            //             await editor.edit(editorContext => editorContext.replace(range, texts[index]))
            //         })
            //     }
            // }
        } catch (error) {
            console.log(error);

            // Log.error(error);
        }
    }

    replaceText() {

    }

    async getAreaValue(): Promise<{ start: number, end: number }> {
        const result = await window.showInputBox({ placeHolder: '起始行/结束行 (选择匹配区域)' });
        if (result === undefined) {
            throw new Error('主动取消')
        } else {
            const splits = result.split('/');
            if (typeof +splits[0] !== 'number' || typeof +splits[1] !== 'number'
                || +splits[0] < 1 || +splits[1] < 1
            ) {
                Log.warning('匹配区域数值不合法');
                return this.getAreaValue()
            } else {
                const start = Math.round(Math.min(+splits[0], +splits[1])) || 1;
                const end = Math.round(Math.max(+splits[0], +splits[1])) || 1;
                return { start, end }
            }
        }
    }



    // 执行更新操作  (todo: 两者行数不一致，多选择区域)
    async executeUpdate(): Promise<void> {
        try {
            /**
             * 1. 选择区域 -> 更新区域. 条件区域可以是left/right/all 更新区域只能all
             * !!! 2. 如果没有选择怎么办？ 只有一行删除或者添加 。 有选择选择倒是还ok. 这个一定要解决的。 如果选择输入行，多选择怎么办
             */

            await this.getCondition();

            // 进行数据组装
            const { originEditor, targetEditors, targetEditorUri } = await this.getEditors();
            if (!originEditor || ((!targetEditors || targetEditors.length == 0) && (!targetEditorUri || targetEditorUri.length === 0))) return;

            const { ranges, texts } = this.getSelectedInfo(originEditor);
            if (!ranges || !texts) return;


            const { activeEditor, otherEditor } = this.getRelatedEditor();
            if (!activeEditor) return;
            // const { ranges, texts } = this.getRelatedData(activeEditor);
            // if (!texts) return;

            // todo 生成files
            let originText = texts[0].split('\n');
            let originFiles = this.generalFields(originText);
            let originCompareText = this.assembleCompareData(originFiles)

            // 将内容插入另外编辑器相同内容
            for (const editor of otherEditor) {
                // 目标窗口的ranges     (这个可能没有选中)
                const { ranges: targetRanges, texts: targetTexts } = this.getRelatedData(editor);
                // 对比的行数记录
                let originLine = 0;
                let addLine = 0;
                let deleteLine = 0;

                // 生成files
                let targetText = targetTexts[0].split('\n');
                let targetFiles = this.generalFields(targetText);

                // 组装数据
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
                await editor.edit(editorContext => editorContext.replace(targetRanges[0], targetText.join('\n')))
            }
        } catch (error) {
            Log.error(error);
        }
    }

    // 更新文本
    updateText() {

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
            Log.error(error);
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
            Log.error(error);
            return [];
        }
    }

    async getCondition(): Promise<void> {
        try {
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
                ], { placeHolder: '选择对比区域 -> 更新区域（行为单位）' });

            if (this.operate?.value !== OPERATE['All   ->  All']) {
                // 匹配模式， 分割符， 以分隔符为中线， 条件 左/右/全部 ;  更新 左/右/全部
                this.delimiter = await window.showInputBox({ placeHolder: '分隔符' }) || '';
            }
        } catch (error) {
            Log.error(error);
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
            Log.error(error);
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
            Log.error(error);
            return '';
        }
    }

    // *********************
    // Service function 
    // *********************

    // 获取到相关编辑器
    getRelatedEditor(): ReturnRelatedEditor {
        // try {
        const activeEditor = window.activeTextEditor!;
        const visibleEditor = window.visibleTextEditors;
        // 将活动的编辑器过滤掉
        const otherEditor = visibleEditor.filter(editor => editor.document.fileName !== activeEditor?.document.fileName);
        return { activeEditor, otherEditor }
        // } catch (error) {
        //     Log.error(error);
        //     return {};
        // }

    }

    // 获取到相关的数据
    getRelatedData(activeEditor: TextEditor): ReturnRelatedData {
        // try {
        let selections = activeEditor.selections;
        let filterSelections = selections.filter(selection => selection.start.line !== selection.end.line ||
            selection.start.character !== selection.end.character)
        filterSelections.sort((pre, next) => pre.start.line - next.start.line);
        let ranges: Array<Range> = [];
        let texts: Array<string> = []
        filterSelections.forEach(selection => {
            const range = new Range(selection.start, selection.end)
            ranges.push(range);
            texts.push(activeEditor.document.getText(range))
        })
        return { ranges, texts }
        // } catch (error) {
        //     Log.error(error);
        //     return {};
        // }
    }

    // 判断是否为文本默认处
    isTextEnd(activeEditor: TextEditor, range: Range): boolean {
        try {
            const textDocument = activeEditor.document;
            const textEndPosition = new Position(range.end.line, textDocument.lineAt(range.end.line).text.length);
            const selectEndPosition = textDocument.offsetAt(range.end);
            const endPosition = textDocument.offsetAt(textEndPosition);
            // 选择的位置大于当前行默认位置，即已经到了文本末尾
            return selectEndPosition >= endPosition ? true : false;
        } catch (error) {
            Log.error(error);
            return false;
        }
    }
}