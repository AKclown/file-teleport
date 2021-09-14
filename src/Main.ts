import { window, Range, TextEditor, Position, QuickPickItem, Uri, OverviewRulerLane, ExtensionContext } from 'vscode';
import { AddTextParams, DeleteTextParams, EffectOperate, Field, IMain, InsertTextParams, OPERATE, ReplaceTextParams, ReturnSelectedInfo, UpdateTextParams } from './interface/Main.interface';
import { asyncForEach } from './constant';
import { BaseClass } from './BaseClass';
import { createTwoFilesPatch, diffLines } from 'diff';
import { Logger } from './Logger';
import { ErrorEnum, OtherEnum } from './interface/Logger.interface';
import { parse } from 'diff2html';
export class Main extends BaseClass implements IMain {

    // 区域 对比区域->更新区域
    operate: ({ value: number } & QuickPickItem) | undefined = undefined;
    // 分割符
    delimiter: string = '';

    // 持久化输入数组
    persistentInputArray: Array<{ start?: number, end?: number }> = [];

    // *********************
    // Insert Function 
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
            if (!originEditor || ((!targetEditors || targetEditors.length === 0) && (!targetEditorUri || targetEditorUri.length === 0))) { return; }

            const { ranges, texts } = this.getSelectedInfo(originEditor);
            if (!ranges || !texts) { return; }

            // 持久化开关
            const persistentFlag = this.getConfig('persistentInput') as boolean;
            this.persistentInputArray = [];

            if (targetEditors && targetEditors.length > 0) {
                // 将内容插入另外编辑器相同内容
                await asyncForEach<TextEditor, Promise<void>>(targetEditors, async (editor, index) => {
                    await this.traverseInsertTexts(editor, texts, persistentFlag, index);
                });
            } else if (targetEditorUri) {
                await asyncForEach<Uri, Promise<void>>(targetEditorUri, async (uri, index) => {
                    const editor = await this.openFile(uri);
                    if (editor) {
                        await this.traverseInsertTexts(editor, texts, persistentFlag, index);
                    }
                });
            }
        } catch (error) {
            this.executeError(error);
        }
    }

    // 遍历插入文本
    async traverseInsertTexts(editor: TextEditor, texts: Array<string>, persistentFlag: boolean, index: number) {
        await asyncForEach<string, Promise<void>>(texts, async (item, num) => {
            // 数据持久化  (只在第一个窗口提示输入)
            let startLine = 1;
            if (index === 0 && persistentFlag) {
                startLine = await this.getInsertLine();
                this.persistentInputArray.push({ start: startLine });
            } else if (!persistentFlag) {
                startLine = await this.getInsertLine();
            }
            startLine = persistentFlag ? this.persistentInputArray[num].start! : startLine;
            await this.insertText({ editor, text: item, line: startLine });
        });
    }

    // 文本插入  line可选兼容replace调用
    async insertText(params: InsertTextParams): Promise<void> {
        try {
            let { editor, text, line } = params;
            let startLine = await this.getInsertLine(line);
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

    // *********************
    // Replace Function 
    // *********************

    // 执行替换操作 
    async executeReplace(): Promise<void> {
        try {
            /**
             * 1. 判断选中的是否已经到行末尾了，整行替换
             * 2. 如果target窗口目标文本也有选中的文本，那么应该替换target选中的文本 (解决key:value场景下，我只需要替换key或者value的需求)
             * 3. 允许选择多个key或者value，或者其他替换
             */

            const { originEditor, targetEditors, targetEditorUri } = await this.getEditors();
            if (!originEditor || ((!targetEditors || targetEditors.length === 0)
                && (!targetEditorUri || targetEditorUri.length === 0))) { return; }

            const { ranges, texts } = this.getSelectedInfo(originEditor);
            if (!ranges || !texts) { return; }

            // 持久化开关
            const persistentFlag = this.getConfig('persistentInput') as boolean;
            this.persistentInputArray = [];

            if (targetEditors && targetEditors.length > 0) {
                // 具有多窗口
                await asyncForEach<TextEditor, Promise<void>>(targetEditors, async (editor, index) => {
                    const { ranges: targetRanges } = this.getSelectedInfo(editor);
                    await this.traverseReplaceTexts(editor, texts, index, persistentFlag, targetRanges);
                });
            } else if (targetEditorUri) {
                // 没打开,使用这个
                await asyncForEach<Uri, Promise<void>>(targetEditorUri, async (uri, index) => {
                    const editor = await this.openFile(uri);
                    if (editor) {
                        await this.traverseReplaceTexts(editor, texts, index, persistentFlag);
                    }
                });
            }
        } catch (error) {
            this.executeError(error);
        }
    }

    // 遍历替换文本
    async traverseReplaceTexts(editor: TextEditor, texts: Array<string>, index: number, persistentFlag: boolean, targetRanges?: Range[]): Promise<void> {
        await asyncForEach<string, Promise<void>>(texts, async (item, num) => {
            if (targetRanges && targetRanges[num]) {
                // 存在对应的选择区域
                await editor.edit(editorContext => editorContext.replace(targetRanges[num], texts[num]));
            } else {
                // 数据持久化  (只在第一个窗口提示输入)
                let start = 1;
                let end = 1;
                if (index === 0 && persistentFlag) {
                    const { start, end } = await this.getAreaValue();
                    this.persistentInputArray.push({ start, end });
                } else if (!persistentFlag) {
                    const returnValue = await this.getAreaValue();
                    start = returnValue.start;
                    end = returnValue.end;
                }

                // 判断是否大于文档最大行数，如果是
                const maxLine = editor.document.lineCount;
                start = persistentFlag ? this.persistentInputArray[num].start! : start;
                end = persistentFlag ? this.persistentInputArray[num].end! : end;

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
            }
        });
    }

    // 文本替换
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

    // *********************
    // Update Function 
    // *********************

    // 执行更新操作  
    async executeUpdate(): Promise<void> {
        try {
            // 选择区域 -> 更新区域. 条件区域可以是left/right/all 更新区域只能all
            await this.getCondition();

            // 进行数据组装
            const { originEditor, targetEditors, targetEditorUri } = await this.getEditors();
            if (!originEditor || ((!targetEditors || targetEditors.length === 0)
                && (!targetEditorUri || targetEditorUri.length === 0))) { return; }

            const { ranges, texts } = this.getSelectedInfo(originEditor);
            if (!ranges || !texts) { return; }

            // 持久化开关
            const persistentFlag = this.getConfig('persistentInput') as boolean;
            this.persistentInputArray = [];

            if (targetEditors && targetEditors.length > 0) {
                // 具有多窗口
                await asyncForEach<TextEditor, Promise<void>>(targetEditors, async (editor, index) => {
                    const { ranges: targetRanges, texts: targetTexts } = this.getSelectedInfo(editor);
                    await this.traverseUpdateTexts(editor, texts, index, persistentFlag, targetRanges, targetTexts);
                });
            } else if (targetEditorUri) {
                await asyncForEach<Uri, Promise<void>>(targetEditorUri, async (uri, index) => {
                    const editor = await this.openFile(uri);
                    if (editor) {
                        await this.traverseUpdateTexts(editor, texts, index, persistentFlag);
                    }
                });
            }
        } catch (error) {
            this.executeError(error);
        }
    }

    // 遍历更新文本
    async traverseUpdateTexts(editor: TextEditor, texts: Array<string>, index: number, persistentFlag: boolean, targetRanges?: Range[], targetTexts?: string[]): Promise<void> {
        await asyncForEach<string, Promise<void>>(texts, async (item, num) => {
            if (!targetTexts || !targetTexts[num]) {
                // 数据持久化  (只在第一个窗口提示输入)
                let start = 1;
                let end = 1;
                if (index === 0 && persistentFlag) {
                    const { start, end } = await this.getAreaValue();
                    this.persistentInputArray.push({ start, end });
                } else if (!persistentFlag) {
                    const returnValue = await this.getAreaValue();
                    start = returnValue.start;
                    end = returnValue.end;
                }

                // 判断是否大于文档最大行数，如果是
                const maxLine = editor.document.lineCount;
                start = persistentFlag ? this.persistentInputArray[num].start! : start;
                end = persistentFlag ? this.persistentInputArray[num].end! : end;

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
            } else if (targetRanges && targetRanges[num] && targetTexts) {
                // 存在对应的选择区域
                let originTexts = item.split('\n');
                let targetText = targetTexts[num].split('\n');
                await this.updateText({ originText: originTexts, targetText, editor, range: targetRanges[num] });
            }
        });
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
                    };
                    targetText = this.deleteText(params);
                } else if (item.added) {
                    const params = {
                        originText,
                        originLine,
                        targetText,
                        addLine,
                        count: item.count ?? 0
                    };
                    targetText = this.addText(params);
                    addLine += item.count ?? 0;
                    deleteLine += item.count ?? 0;
                    originLine += item.count ?? 0;
                } else {
                    addLine += item.count ?? 0;
                    deleteLine += item.count ?? 0;
                    originLine += item.count ?? 0;
                }
            });
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
            targetText.splice(deleteLine, count);
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
            let Fields: Field[] = [];
            // all -> all不用对数组进行分割
            if (this.operate?.value === OPERATE['All   ->  All']) {
                Fields = rows.map((item) => ({ left: '', right: '', all: item }));
            } else {
                Fields = rows.map((item) => {
                    let mid = item.indexOf(this.delimiter);
                    let left = item.substring(0, mid);
                    let right = item.substring(mid + 1, item.length);
                    return { left, right, all: item };
                });
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
                    result = Fields.map(item => item.all).join('\n');
                    break;
                }
                case OPERATE['Right ->  All']: {
                    result = Fields.map(item => item.right).join('\n');
                    break;
                }
                case OPERATE['Left  ->  All']: {
                    result = Fields.map(item => item.left).join('\n');
                    break;
                }
            }
            return result + '\n';
        } catch (error) {
            this.executeError(error);
            return '';
        }
    }

    // *********************
    // Diff Function 
    // *********************

    // 处理文件对比
    async executeCompared(context: ExtensionContext): Promise<void> {

        // 选择区域 -> 更新区域. 条件区域可以是left/right/all 更新区域只能all
        await this.getCondition();

        // 进行数据组装
        const { originEditor, targetEditors, targetEditorUri } = await this.getEditors();
        if (!originEditor || ((!targetEditors || targetEditors.length === 0)
            && (!targetEditorUri || targetEditorUri.length === 0))) { return; }

        if (targetEditors && targetEditors.length > 0) {
            // 将内容插入另外编辑器相同内容  
            await asyncForEach<TextEditor, Promise<void>>(targetEditors, async (editor, index) => {
                await this.traverseComparedTexts(context, originEditor, editor);
            });
        } else if (targetEditorUri) {
            await asyncForEach<Uri, Promise<void>>(targetEditorUri, async (uri, index) => {
                const editor = await this.openFile(uri);
                if (editor) {
                }
            });
        }


    }

    // 遍历对比文本
    async traverseComparedTexts(context: ExtensionContext, originEditor: TextEditor, targetEditor: TextEditor): Promise<void> {
        // 找到origin窗口的所有数据
        const originFirstLine = originEditor.document.lineAt(0);
        const originLastLine = originEditor.document.lineAt(originEditor.document.lineCount - 1);
        const originRange = new Range(originFirstLine.range.start, originLastLine.range.end);
        const originText = originEditor.document.getText(originRange).split('\n');
        const originFiles = this.generalFields(originText);
        const originComparedText = this.assembleCompareData(originFiles);

        // 获取到target窗口的的文本
        const targetFirstLine = targetEditor.document.lineAt(0);
        const targetLastLine = targetEditor.document.lineAt(targetEditor.document.lineCount - 1);
        const targetRange = new Range(targetFirstLine.range.start, targetLastLine.range.end);
        const targetText = targetEditor.document.getText(targetRange).split('\n');
        const targetFiles = this.generalFields(targetText);
        const targetComparedText = this.assembleCompareData(targetFiles);
        /**
         * 更新: old和new的相同行数，old有delete new有insert (注意 这里需要记录前面的new新增  old删除的行数，否则不对应)
         * 删除: 该行只有old delete相关操作
         * 插入: 改行只有new insert相关操作
         * 
         * - 如何记录每个改动行的对应操作 [ ,'update']  [ ,'insert']  [ ,'delete']
         * 
         * $ 问题: 目前没有办法多个窗口一起进行对比，只能origin 和 一个target窗口进行对比，因此对比结果会对彼此都进行影响
         */

        // 获取到diff2html所需要的 diff string
        let diffString = createTwoFilesPatch("target", "origin", targetComparedText, originComparedText);

        const diffInfo = parse(diffString, {
            drawFileList: true,
            matching: 'lines',
            outputFormat: 'side-by-side'
        });

        let diffLines = diffInfo[0].blocks[0].lines;

        let diff = diffLines.filter(i => i.type !== 'context');

        //  记录新增和删除，相差的数值，0、1
        let moreInsert = 0;
        let moreDelete = 0;

        // 记录差异行数  -  数据结构: [[行数， update | insert | delete]]  操作
        let diffEffect = new Map<number, EffectOperate>([]);

        while (diff.length > 0) {
            // 找到与之对应的line，如果存在则为update，不存在则对应操作
            let origin = diff[0];
            // 记录是否存在对应的操作
            let isSame = false;
            for (let i = 1; i < diff.length; i++) {
                // 找到与之对应的数据，判断操作类型，记录对应行数。 这个数据好像只有先删除后新增，没有先新增后删除的
                if (origin.type === 'delete' && diff[i].type === 'insert' && (origin.oldNumber + moreInsert) === ((diff[i].newNumber ?? 0) + moreDelete)) {
                    diffEffect.set(origin.oldNumber + moreInsert, 'update');
                    isSame = true;
                    diff.splice(i, 1);
                    break;
                }
            }

            // 没有对应的操作
            if (!isSame) {
                if (origin.type === 'delete') {
                    diffEffect.set(origin.oldNumber + moreInsert, 'delete');
                    moreDelete++;
                } else if (origin.type === 'insert') {
                    diffEffect.set(origin.newNumber + moreDelete, 'insert');
                    moreInsert++;
                }
            }
            diff.splice(0, 1);
        }

        // 给对应行，添加对应操作的图标
        diffEffect.forEach((value: EffectOperate, key: number) => {
            console.log(key, 'key');
            const range = new Range(key - 1, 0, key - 1, 0);
            switch (value) {
                case 'insert': {
                    const addDecorationType = window.createTextEditorDecorationType({
                        gutterIconPath: context.asAbsolutePath("images\\add.svg"),
                        overviewRulerLane: OverviewRulerLane.Full,
                        overviewRulerColor: 'rgba(21, 126, 251, 0.7)',
                        gutterIconSize: '80%',
                    });
                    targetEditor.setDecorations(addDecorationType, [range]);

                    break;
                }

                case 'update': {
                    const updateDecorationType = window.createTextEditorDecorationType({
                        gutterIconPath: context.asAbsolutePath("images\\update.svg"),
                        overviewRulerLane: OverviewRulerLane.Full,
                        overviewRulerColor: 'rgba(21, 126, 251, 0.7)',
                        gutterIconSize: '65%',
                    });
                    targetEditor.setDecorations(updateDecorationType, [range]);
                    break;
                }
                case 'delete': {
                    const minusDecorationType = window.createTextEditorDecorationType({
                        gutterIconPath: context.asAbsolutePath("images\\minus.svg"),
                        overviewRulerLane: OverviewRulerLane.Full,
                        overviewRulerColor: 'rgba(21, 126, 251, 0.7)',
                        gutterIconSize: '80%',
                    });
                    targetEditor.setDecorations(minusDecorationType, [range]);
                    break;
                }
            }
        });
    }

    // *********************
    // Error Function 
    // *********************

    // 处理错误
    executeError(error: unknown) {
        if ((error as Error).message !== OtherEnum.VOLUNTARILY_CANCEL) {
            Logger.error({
                type: ErrorEnum.UNKNOWN_MISTAKE,
                data: error,
                items: ['OpenIssue']
            });
        }
    }
}