import { window, Range, TextEditor, Position, QuickPickItem } from 'vscode';
import { AddTextParams, DeleteTextParams, IContentTransfer, OPERATE, ReturnRelatedData, ReturnRelatedEditor } from './interface/ContentTransfer.interface';
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

    // 执行更新操作  (todo: 两者行数不一致，多选择区域)
    async executeUpdate(...args: unknown[]): Promise<void> {
        try {

            /**
             * 1. 选择区域 -> 更新区域
             * 2. 当选择区域为分割区域即不是all的时候，加上对比行数又不一致时，进行整行更新，而不是更新区域
             */

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

            const originStartLine = ranges[0].start.line;
            const originEndLine = ranges[0].end.line;

            // todo 生成files
            let originFiles = this.generalFields(texts);
            let originTexts = texts[0].split('\n');

            // 组装数据
            let originCompareText = this.assembleCompareData(originFiles)

            // 将内容插入另外编辑器相同内容
            for (const editor of otherEditor) {
                // 目标窗口的ranges     (这个可能没有选中)
                const { ranges: targetRanges, texts: targetTexts } = this.getRelatedData(editor);

                const targetStartLine = targetRanges[0].start.line;
                const targetEndLine = targetRanges[0].end.line;

                let targetText = targetTexts[0].split('\n');


                // 对比的行数记录
                let originLine = 0;
                let addLine = 0;
                let deleteLine = 0;

                // 生成files
                let targetFiles = this.generalFields(targetTexts);
                // 组装数据
                let targetCompareText = this.assembleCompareData(targetFiles);
                // 对比不同
                let diffText = diffLines(targetCompareText, originCompareText);

                console.log(diffText, 'diffText----=-=-=');

                // 造出数据来，一次性replace掉
                diffText.forEach(item => {
                    // 判断数据是否更改了 (行数需要移动)
                    if (item.removed) {
                        Array.from({ length: item.count ?? 0 }).forEach(() => {

                            const params = {
                                texts: targetText,
                                line: deleteLine,
                                originStartLine,
                                originEndLine,
                                targetStartLine,
                                targetEndLine
                            }
                            const result = this.removeText(params);
                            targetText = result.texts;
                            deleteLine = result.line;
                        })
                    } else if (item.added) {
                        Array.from({ length: item.count ?? 0 }).forEach(() => {
                            const params = {
                                originTexts,
                                originLine,
                                targetTexts: targetText,
                                targetLine: addLine,
                                originStartLine,
                                originEndLine,
                                targetStartLine,
                                targetEndLine
                            }
                            targetText = this.addText(params);
                            originLine++;
                            addLine++;
                        })
                    } else {
                        addLine += item.count ?? 0;
                        deleteLine += item.count ?? 0;
                        originLine += item.count ?? 0;
                    }
                })
                await editor.edit(editorContext => editorContext.replace(targetRanges[0], targetText.join('\n')))
            }
        } catch (error) {
            // todo,错误日志系统 (弹窗映射到github)
        }
    }

    // 添加
    addText(params: AddTextParams): Array<string> {
        // $ 当更新区域时left\right的时候，需要整行更新，直接插入
        let { originTexts, originLine, targetTexts, targetLine, originStartLine, originEndLine, targetStartLine, targetEndLine } = params;
        switch (this.operate?.value) {
            case OPERATE['Left  ->  Left']:
            case OPERATE['Right ->  Left']:
            case OPERATE['All   ->  Left']: {
                const originText = originTexts[originLine];

                if (originStartLine + targetLine < targetStartLine) {
                    // 整行(头部插入，这里需要注意顺序) 0->1...
                    targetTexts.splice(targetLine, 0, originText);
                } else if (originStartLine + targetLine > targetEndLine) {
                    // 整行
                    targetTexts.splice(targetLine, 0, originText);
                } else {
                    // 区域
                    const separateIndex = originText.indexOf(this.delimiter);
                    const updatedText = originText.substring(0, separateIndex);
                    targetTexts[targetLine] = updatedText + targetTexts[targetLine];
                }
                break;
            }
            case OPERATE['Left  ->  Right']:
            case OPERATE['Right ->  Right']:
            case OPERATE['All   ->  Right']: {
                const originText = originTexts[originLine];

                if (originStartLine + targetLine < targetStartLine) {
                    // 整行(头部插入，这里需要注意顺序) 0->1...
                    targetTexts.splice(targetLine, 0, originText);
                } else if (originStartLine + targetLine > targetEndLine) {
                    // 整行
                    targetTexts.splice(targetLine, 0, originText);
                } else {
                    // 区域
                    const separateIndex = originText.indexOf(this.delimiter);
                    const updatedText = originText.substring(separateIndex + 1);
                    targetTexts[targetLine] = targetTexts[targetLine] + updatedText;
                }
                break;
            }
            case OPERATE['Left  ->  All']:
            case OPERATE['Right ->  All']:
            case OPERATE['All   ->  All']: {
                targetTexts.splice(targetLine, 0, originTexts[originLine])
                break;
            }
        }
        return targetTexts;
    }

    // 删除
    removeText(params: DeleteTextParams): { texts: Array<string>, line: number } {

        let { texts, line, originStartLine, originEndLine, targetStartLine, targetEndLine } = params;

        switch (this.operate?.value) {
            case OPERATE['Left  ->  Left']:
            case OPERATE['Right ->  Left']:
            case OPERATE['All   ->  Left']: {
                // 获取到更新的行数据
                if (originStartLine > targetStartLine + line) {
                    // 整行(头部插入，这里需要注意顺序) 0->1...
                    texts.splice(0, 1);
                } else if (originStartLine + line > originEndLine) {
                    // 整行
                    texts.splice(0, 1);
                } else {
                    const text = texts[line];
                    const separateIndex = text.indexOf(this.delimiter);
                    let updatedText = text.substring(separateIndex);
                    texts[line] = updatedText;
                }
                line++;
                break;
            }
            case OPERATE['Left  ->  Right']:
            case OPERATE['Right ->  Right']:
            case OPERATE['All   ->  Right']: {
                // 获取到更新的行数据
                const text = texts[line];
                const separateIndex = text.indexOf(this.delimiter);
                let updatedText = text.substring(0, separateIndex + 1);
                texts[line] = updatedText;
                line++;
                break;
            }
            case OPERATE['Left  ->  All']:
            case OPERATE['Right ->  All']:
            case OPERATE['All   ->  All']: {
                texts.splice(line, 1)
                break;
            }
        }
        return { texts, line };
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







