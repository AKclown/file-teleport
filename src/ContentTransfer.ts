import { window, Range, TextEditor, Position, QuickPickItem } from 'vscode';
import { IContentTransfer, OPERATE, ReturnRelatedData, ReturnRelatedEditor } from './interface/ContentTransfer.interface';
import { asyncForEach } from './constant';
import { BaseClass } from './BaseClass';
import { diffLines, Change } from 'diff'
import { Field } from './Field';

export class ContentTransfer extends BaseClass implements IContentTransfer {

    // 区域 对比区域->更新区域
    operate: ({ value: number } & QuickPickItem) | undefined = undefined;
    // 分割符
    delimiter: string = '';

    // *********************
    // Execute function 
    // *********************
    // 执行插入操作
    executeInsert(...args: unknown[]): void {
        try {
            /**
             * 1. 判断选中的是否已经到行末尾了，如果是插入时需要换行
             * 2. 多行同时插入
             */
            const { activeEditor, otherEditor } = this.getRelatedEditor();
            const { ranges, texts } = this.getRelatedData(activeEditor);
            console.log(ranges, 'range');

            // 将内容插入另外编辑器相同内容
            for (const editor of otherEditor) {
                editor.edit(editorContext => {
                    ranges.forEach((range, index) => {
                        const position = new Position(range.start.line, range.start.character);
                        const finalText = `${texts[index]}${this.isTextEnd(activeEditor, range) ? '\r\n' : ''}`;
                        editorContext.insert(position, finalText);
                    })
                })
            }
        } catch (error) {
            // todo,错误日志系统 (弹窗映射到github)
        }
    }

    // 执行替换操作 
    executeReplace(...args: unknown[]): void {
        try {
            /**
             * 1. 判断选中的是否已经到行末尾了，整行替换
             * 2. 如果target窗口目标文本也有选中的文本，那么应该替换target选中的文本 (解决key:value场景下，我只需要替换key或者value的需求)
             * 3. 允许选择多个key或者value，或者其他替换
             */
            const { activeEditor, otherEditor } = this.getRelatedEditor();
            const { ranges, texts } = this.getRelatedData(activeEditor);
            // 将内容插入另外编辑器相同内容
            for (const editor of otherEditor) {
                // 目标窗口的ranges     (这个可能没有选中)
                const { ranges: targetRanges } = this.getRelatedData(editor);

                if (targetRanges.length === 0) {
                    // 这里必须await，不然只会保留第一次
                    asyncForEach<Range, Promise<void>>(ranges, async (range: Range, index: number) => {
                        // 需要判断range是否已经是末尾了,是需要将替换的整行都替换，而不是部分
                        let isTextEnd = this.isTextEnd(activeEditor, range);
                        let replaceRange = range;
                        if (isTextEnd) {
                            const endPosition = new Position(range.end.line, editor.document.lineAt(range.end.line).text.length);
                            replaceRange = replaceRange.with(replaceRange.start, endPosition)
                        }
                        await editor.edit(editorContext => editorContext.replace(replaceRange, texts[index]))
                    })
                } else {
                    // 替换掉选中的文本
                    asyncForEach<Range, Promise<void>>(targetRanges, async (range: Range, index: number) => {
                        await editor.edit(editorContext => editorContext.replace(range, texts[index]))
                    })
                }
            }
        } catch (error) {
            // todo,错误日志系统 (弹窗映射到github)
        }
    }

    // 执行更新操作
    async executeUpdate(...args: unknown[]): Promise<void> {
        try {

            // 匹配操作
            this.operate = await window.showQuickPick<{ value: number } & QuickPickItem>(
                [
                    {
                        label: OPERATE[0],
                        value: OPERATE['Left  ->  Left']
                    }, {
                        label: OPERATE[1],
                        value: OPERATE['Left  ->  Right']
                    }, {
                        label: OPERATE[2],
                        value: OPERATE['Left  ->  All']
                    }, {
                        label: OPERATE[3],
                        value: OPERATE['Right ->  Left']
                    }, {
                        label: OPERATE[4],
                        value: OPERATE['Right ->  Right']
                    }, {
                        label: OPERATE[5],
                        value: OPERATE['Right ->  All']
                    }, {
                        label: OPERATE[6],
                        value: OPERATE['All   ->  Left']
                    }, {
                        label: OPERATE[7],
                        value: OPERATE['All   ->  Right']
                    }, {
                        label: OPERATE[8],
                        value: OPERATE['All   ->  All']
                    },
                ], { placeHolder: '选择对比区域 -> 更新区域（行为单位）' });

            if (this.operate?.value !== OPERATE['All   ->  All']) {
                // 匹配模式， 分割符， 以分隔符为中线， 条件 左/右/全部 ;  更新 左/右/全部
                this.delimiter = await window.showInputBox({ placeHolder: '分隔符' }) || '';
            }

            // 进行数据组装
            const { activeEditor, otherEditor } = this.getRelatedEditor();
            const { ranges, texts } = this.getRelatedData(activeEditor);

            // todo 生成files
            let originFiles = this.generalFields(texts);
            let originStartLine = ranges[0].start.line;
            // 组装数据
            let originCompareText = this.assembleCompareData(originFiles)

            // 将内容插入另外编辑器相同内容
            for (const editor of otherEditor) {
                // 目标窗口的ranges     (这个可能没有选中)
                const { ranges: targetRanges, texts: targetTexts } = this.getRelatedData(editor);

                // 对比相同
                let targetStartLine = targetRanges[0].start.line;

                let addStartLine = targetStartLine;
                let deleteStartLine = targetStartLine;

                // 生成files
                let targetFiles = this.generalFields(targetTexts);
                // 组装数据
                let targetCompareText = this.assembleCompareData(targetFiles);
                // 对比不同
                let diffText = diffLines(targetCompareText, originCompareText);

                asyncForEach<Change, Promise<void>>(diffText, async (item: Change, index: number) => {
                    // 判断数据是否更改了 (行数需要移动)
                    if (item.removed) {
                        await asyncForEach<number, Promise<void>>(new Array(item.count).fill(0), async () => {
                            deleteStartLine = await this.removeText(editor, deleteStartLine);
                        })
                    } else if (item.added) {
                        await asyncForEach<number, Promise<void>>(new Array(item.count).fill(0), async () => {
                            const result = await this.addText(activeEditor, editor, originStartLine, addStartLine);
                            originStartLine = result.originStartLine;
                            addStartLine = result.addStartLine;
                        })
                    } else {
                        originStartLine += item?.count ?? 0;
                        deleteStartLine += item?.count ?? 0;
                        addStartLine += item?.count ?? 0;
                    }
                })
            }
        } catch (error) {
            // todo,错误日志系统 (弹窗映射到github)
        }
    }

    // 添加
    async addText(originEditor: TextEditor, targetEditor: TextEditor, originStartLine: number, addStartLine: number): Promise<{
        originStartLine: number,
        addStartLine: number
    }> {

        let originTextLine = originEditor.document.lineAt(originStartLine);
        let targetTextLine = targetEditor.document.lineAt(addStartLine);

        switch (this.operate?.value) {
            case OPERATE['Left  ->  Left']:
            case OPERATE['Right ->  Left']:
            case OPERATE['All   ->  Left']: {
                await targetEditor.edit(editorContext => {
                    let originSeparate = originTextLine.text.indexOf(this.delimiter);
                    let point = new Position(addStartLine, 0);
                    console.log(originTextLine.text);
                    editorContext.insert(point, originTextLine.text.substring(0, originSeparate));
                })
                break;
            }
            case OPERATE['Left  ->  Right']:
            case OPERATE['Right ->  Right']:
            case OPERATE['All   ->  Right']: {
                await targetEditor.edit(editorContext => {
                    let originSeparate = originTextLine.text.indexOf(this.delimiter);
                    let targetSeparate = targetTextLine.text.indexOf(this.delimiter);
                    let point = new Position(addStartLine, targetTextLine.text.substring(0, targetSeparate + 1).length);
                    editorContext.insert(point, originTextLine.text.substring(originSeparate + 1,))
                })
                break;
            }
            case OPERATE['Left  ->  All']:
            case OPERATE['Right ->  All']:
            case OPERATE['All   ->  All']: {
                await targetEditor.edit(editorContext => {
                    let point = new Position(addStartLine, 0)
                    editorContext.insert(point, originTextLine.text + '\n');
                })
                break;
            }
        }
        originStartLine++;
        addStartLine++;
        return { originStartLine, addStartLine };
    }

    // 删除
    async removeText(editor: TextEditor, startLine: number): Promise<number> {

        let textLine = editor.document.lineAt(startLine);
        switch (this.operate?.value) {
            case OPERATE['Left  ->  Left']:
            case OPERATE['Right ->  Left']:
            case OPERATE['All   ->  Left']: {
                await editor.edit(editorContext => {
                    let startPosition = new Position(startLine, 0);
                    let endPosition = new Position(startLine, textLine.text.substring(0, textLine.text.indexOf(this.delimiter)).length);
                    let range = new Range(startPosition, endPosition);
                    editorContext.delete(range);
                })
                startLine++;
                break;
            }
            case OPERATE['Left  ->  Right']:
            case OPERATE['Right ->  Right']:
            case OPERATE['All   ->  Right']: {
                await editor.edit(editorContext => {
                    let startPosition = new Position(startLine, textLine.text.substring(textLine.text.indexOf(this.delimiter) + 1, textLine.text.length - 1).length);
                    let endPosition = new Position(startLine, textLine.text.length);
                    let range = new Range(startPosition, endPosition);
                    editorContext.delete(range);
                })
                startLine++;
                break;
            }
            case OPERATE['Left  ->  All']:
            case OPERATE['Right ->  All']:
            case OPERATE['All   ->  All']: {
                await editor.edit(editorContext => {
                    // $ 要从上一行的默认开始删除，要不然换行不会被删除掉
                    let preTextLine = editor.document.lineAt(startLine - 1);
                    let startPosition = new Position(startLine - 1, preTextLine.text.length);
                    let endPosition = new Position(startLine, textLine.text.length);
                    let range = new Range(startPosition, endPosition);
                    editorContext.delete(range);
                })
                break;
            }
        }
        return startLine;
    }

    // 生成fields
    generalFields(texts: string[]): Field[] {
        /**
         * todo 1.先单个，之后在批量
         */
        let text = texts[0];
        const rows = text.split('\n');
        let Fields: Field[] = []
        // all -> all不用对数组进行分割
        switch (this.operate?.value) {
            case OPERATE['All   ->  All']: {
                Fields = rows.map((item) => {
                    return new Field('', '', item)
                })
                break;
            }
            default: {
                // 切割行 /n
                Fields = rows.map((item) => {
                    let mid = item.indexOf(this.delimiter);
                    let left = item.substring(0, mid);
                    let right = item.substring(mid + 1, item.length);
                    return new Field(left, right, item)
                })
                break;
            }
        }
        return Fields
    }

    // 组装对比数据
    assembleCompareData(Fields: Field[]): string {
        let result = '';
        switch (this.operate?.value) {
            case OPERATE['All   ->  Left']:
            case OPERATE['All   ->  Right']:
            case OPERATE['All   ->  All']: {
                result = Fields.map(item => item.all).join('\n')
                break;
            }
            case OPERATE['Right ->  Left']:
            case OPERATE['Right ->  Right']:
            case OPERATE['Right ->  All']: {
                result = Fields.map(item => item.right).join('\n')
                break;
            }
            case OPERATE['Left  ->  Left']:
            case OPERATE['Left  ->  Right']:
            case OPERATE['Left  ->  All']: {
                result = Fields.map(item => item.left).join('\n')
                break;
            }
        }
        return result;
    }

    // *********************
    // Service function 
    // *********************

    // 获取到相关编辑器
    getRelatedEditor(): ReturnRelatedEditor {
        const activeEditor = window.activeTextEditor!;
        const visibleEditor = window.visibleTextEditors;
        // 将活动的编辑器过滤掉
        const otherEditor = visibleEditor.filter(editor => editor.document.fileName !== activeEditor?.document.fileName);
        return { activeEditor, otherEditor }
    }

    // 获取到相关的数据
    getRelatedData(activeEditor: TextEditor): ReturnRelatedData {
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
    }

    // 判断是否为文本默认处
    isTextEnd(activeEditor: TextEditor, range: Range): boolean {
        const textDocument = activeEditor.document;
        const textEndPosition = new Position(range.end.line, textDocument.lineAt(range.end.line).text.length);
        const selectEndPosition = textDocument.offsetAt(range.end);
        const endPosition = textDocument.offsetAt(textEndPosition);
        // 选择的位置大于当前行默认位置，即已经到了文本末尾
        return selectEndPosition >= endPosition ? true : false;
    }




    // todo 匹配文本 (动态规划的方式  Histogram algorithm)
    // https://link.springer.com/article/10.1007/s10664-019-09772-z
    compareTextDocument(): void {


        // console.log(diffLines(text2, text1));


    }
}







