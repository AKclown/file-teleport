import { window, Range, TextEditor, Position } from 'vscode';
import { IContentTransfer, ReturnRelatedData, ReturnRelatedEditor } from './type';

// $ 执行文件转移
export class ContentTransfer implements IContentTransfer {
    /**
     * 1. 获取到当前活动的编辑器窗口, 以及当前展示的窗口
     * 2. 对选择中的文本及逆行转移，到其他不是活动的文本中, (插入、替换、删除、 全部保留)
     * 3. 对选择中的文本进行对比，展示不匹配的文本(动态递归)
     */
    // *********************
    // Execute function 
    // *********************

    // 执行默认操作
    executeDefault(...args: unknown[]): void {
        try {
            const { activeEditor, visibleEditor, otherEditor } = this.getRelatedEditor();
            const { ranges, texts } = this.getRelatedData(activeEditor);

            // 将内容插入另外编辑器相同内容
            for (const editor of otherEditor) {
                editor.edit(editorContext => { })
            }
        } catch (error) {
            // todo,错误日志系统 (弹窗映射到github)
        }
    }

    // 执行插入操作
    executeInsert(...args: unknown[]): void {
        try {
            /**
             * 1.判断选中的是否已经到行末尾了，如果是插入时需要换行
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

    // todo 执行替换操作 
    executeReplace(...args: unknown[]): void {
        try {
            /**
             * 1. 判断选中的是否已经到行末尾了，整行替换
             * 2. 如果target窗口目标文本也有选中的文本，那么应该替换target选中的文本 (解决key:value场景下，我只需要替换key或者value的需求)
             * todo 3. 允许选择多个key或者value，或者其他替换
             */
            const { activeEditor, otherEditor } = this.getRelatedEditor();
            const { ranges, texts } = this.getRelatedData(activeEditor);
            // 将内容插入另外编辑器相同内容
            for (const editor of otherEditor) {
                const { ranges: targetRanges } = this.getRelatedData(editor);
                console.log(targetRanges, 'targetRanges---');

                targetRanges.forEach((targetRange, index) => {
                    const { start, end } = targetRange;

                    const replaceRange = start.line === end.line && start.character === end.character
                        ? ranges[index] : targetRange;

                    editor.edit(editorContext => editorContext.replace(replaceRange, texts[index]))
                })
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
        return { activeEditor, visibleEditor, otherEditor }
    }

    // 获取到相关的数据
    getRelatedData(activeEditor: TextEditor): ReturnRelatedData {
        let selections = activeEditor.selections;
        let filterSelections = selections.filter(selection => selection.start.line !== selection.end.line ||
            selection.start.character !== selection.end.character);
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







