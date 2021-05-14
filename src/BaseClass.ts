import { workspace, window, ViewColumn, Uri, TextEditor, TextDocumentShowOptions } from 'vscode';
import { asyncForEach } from './constant';
import { IBaseClass, ReturnEditors } from './interface/BaseClass.interface';
import { Log } from './Log';
import { basename } from 'path';

// 一些基础方法
export class BaseClass implements IBaseClass {

    // *********************
    // Config
    // *********************

    // 获取到配置信息
    getConfig(): Array<string> {
        return workspace.getConfiguration().get('fileTeleport.multipleFilePath') || [];
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

            if (visibleEditor.length === 0) return {};
            let [originEditor, ...rest] = visibleEditor;

            if (rest.length > 0) {
                return { originEditor, targetEditors: rest };
            } else {
                const multipleFilePath = this.getConfig();
                let targetEditorUri: Array<Uri> = [];
                if (multipleFilePath.length === 0) {
                    // Log.info('去设置页面配置多文件路径配置')
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
                    })
                }
                return { originEditor, targetEditors: [], targetEditorUri };
            }
        } catch (error) {
            console.log(error, '获取到相关编辑器');
            return {}
        }
    }

    // 打开文件
    async openFile(uri: Uri, options?: TextDocumentShowOptions): Promise<TextEditor | undefined> {
        try {
            const document = await workspace.openTextDocument(uri);
            return await window.showTextDocument(document, options ?? { preview: false });
        } catch (error) {
            console.log(error, 'openFile');
            // 文件名不存在导致的异常
            if (error.message.search(/cannot open/gm)) {
                // Log.warning(`操作${basename(uri.path)}文件失败,请查看该文件是否正常`)
            } else {
                Log.error(error);
            }
        }
    }

    //  执行命令打开
    async executeOpenFile(...args: any[]): Promise<void> {
        /**
         * 1.任意个 文件，
         * 2.自定义编辑模块，左边origin 
         */
        await asyncForEach<Uri, Promise<void>>(args[1], async (uri: Uri) => {
            await  this.openFile(uri, {viewColumn: ViewColumn.Beside});
        })
    }
}