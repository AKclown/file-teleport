import { window, Range } from 'vscode';
import { IContentTransfer } from './type';

// $ 执行文件转移
export class ContentTransfer implements IContentTransfer {

    // 执行文件文本转移
    executeContentTransfer(...args: unknown[]): void {
        /**
         * 1. 获取到当前活动的编辑器窗口, 以及当前展示的窗口
         * 2. 对选择中的文本及逆行转移，到其他不是活动的文本中, (插入、替换、删除、 全部保留)
         * 3. 对选择中的文本进行对比，展示不匹配的文本(动态递归)
         */
        try {
            const activeEditor = window.activeTextEditor!;
            const visibleEditor = window.visibleTextEditors;
            // 将活动的编辑器过滤掉
            const otherEditor = visibleEditor.filter(editor => editor.document.fileName !== activeEditor?.document.fileName);

            // 获取到选中的文本
            const selection = activeEditor.selection;
            let selectRange = new Range(selection.start, selection.end);
            let selectText = activeEditor.document.getText(selectRange)

            // 将内容插入另外编辑器相同内容
            for (const editor of otherEditor) {
                editor.edit(EditorEdit => { })
            }
            console.log(visibleEditor, '--activeEditor---');
        } catch (error) {

        }
    }

    // todo 匹配文本 (动态规划的方式)
    compareTextDocument(): void {
        
    }
}







