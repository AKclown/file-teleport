import { ExtensionContext, commands, workspace, window } from 'vscode';
import { COMMANDS } from './constant';
import { Main } from './Main';
import { Log } from './Log';

export function activate(context: ExtensionContext) {
	try {

		// *********************
		// Command Register
		// *********************
		const mainInstant = new Main();
		const defaultDisposable = commands.registerCommand(
			COMMANDS.FILE_TELEPORT_UPDATE,
			mainInstant.executeUpdate,
			mainInstant
		);

		const insertDisposable = commands.registerCommand(
			COMMANDS.FILE_TELEPORT_INSERT,
			mainInstant.executeInsert,
			mainInstant
		);

		const replaceDisposable = commands.registerCommand(
			COMMANDS.FILE_TELEPORT_REPLACE,
			mainInstant.executeReplace,
			mainInstant
		);

		const openFileDisposable = commands.registerCommand(
			COMMANDS.OPEN_FILE,
			mainInstant.executeOpenFile,
			mainInstant
		);

		// *********************
		// listen
		// *********************

		// // todo这个不需要
		// const configDisposable = workspace.onDidChangeConfiguration(() =>mainInstant.getConfig());
		// const visibleEditorDisposable = window.onDidChangeVisibleTextEditors(() => mainInstant.getEditors())

		// *********************
		// Destroy
		// *********************

		context.subscriptions.push(
			defaultDisposable,
			insertDisposable,
			replaceDisposable,
			openFileDisposable,
			// configDisposable,
			// visibleEditorDisposable
		);
	} catch (error) {
		Log.error(error);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
}
