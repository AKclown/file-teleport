import { window, Range, TextEditor, Position, QuickPickItem } from 'vscode';
import { IContentTransfer, OPERATE, ReturnRelatedData, ReturnRelatedEditor } from './interface/ContentTransfer.interface';
import { asyncForEach } from './constant';
import { BaseClass } from './BaseClass';
import { diffLines } from 'diff'

export class ContentTransfer extends BaseClass implements IContentTransfer {

    // 区域 对比区域->更新区域
    operate: ({ value: number } & QuickPickItem) | undefined = undefined;
    // 分割符
    delimiter: string = '';

    // *********************
    // Execute function 
    // *********************

    // 组装数据
    assembleData(texts: string[]) {
        
        // switch(this.operate?.value){
        //     case 
        // }
    }

    // 执行更新操作
    async executeUpdate(...args: unknown[]): Promise<void> {
        try {

            // let originTexts = [];

            // this.assembleData(originTexts);


            // 分割符
            let delimiter = '';

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
                delimiter = await window.showInputBox({ placeHolder: '分隔符' }) || '';
            }

            // 进行数据组装
            const { activeEditor, otherEditor } = this.getRelatedEditor();
            const { ranges, texts } = this.getRelatedData(activeEditor);

            this.assembleData(texts);

            console.log(ranges, 'ranges');
            console.log(texts,'texts');
            
            // // 将内容插入另外编辑器相同内容
            // for (const editor of otherEditor) {
            //     editor.edit(editorContext => { })
            // }
        } catch (error) {
            // todo,错误日志系统 (弹窗映射到github)
        }
    }


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

    }
}







