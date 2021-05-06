import { ExtensionContext, commands, window, TextEditorSelectionChangeEvent, Disposable } from 'vscode';
import { COMMANDS } from './constant';
import { ContentTransfer } from './ContentTransfer';
import { FileRelated } from './OpenFile';

export function activate(context: ExtensionContext) {
	try {
		// *********************
		// Command Register
		// *********************

		const transferInstant = new ContentTransfer();
		const defaultDisposable = commands.registerCommand(
			COMMANDS.FILE_TELEPORT_UPDATE,
			transferInstant.executeUpdate,
			transferInstant
		);

		const insertDisposable = commands.registerCommand(
			COMMANDS.FILE_TELEPORT_INSERT,
			transferInstant.executeInsert,
			transferInstant
		);

		const replaceDisposable = commands.registerCommand(
			COMMANDS.FILE_TELEPORT_REPLACE,
			transferInstant.executeReplace,
			transferInstant
		);

		const fileInstant = new FileRelated();
		const openFileDisposable = commands.registerCommand(
			COMMANDS.OPEN_FILE,
			fileInstant.executeOpenFile,
			fileInstant
		);


		// *********************
		// Listener
		// *********************
		// 记录origin editor，提供给快捷键操作的时候
		const selectDisposable = window.onDidChangeTextEditorSelection((evt: TextEditorSelectionChangeEvent) => {
			// console.log(evt);
		})

		// *********************
		// Destroy
		// *********************

		context.subscriptions.push(
			defaultDisposable,
			insertDisposable,
			replaceDisposable,
			openFileDisposable,
			selectDisposable
		);
	} catch (error) {
		console.log(error, 'error---');
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
}
