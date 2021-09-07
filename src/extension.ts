import { ExtensionContext, commands } from 'vscode';
import { COMMANDS } from './constant';
import { Main } from './Main';
import { Logger } from './Logger';
import { ErrorEnum } from './interface/Logger.interface';

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

		const comparedDisposable = commands.registerCommand(
			COMMANDS.FILE_TELEPORT_COMPARED,
			mainInstant.executeCompared,
			mainInstant
		);

		const openFileDisposable = commands.registerCommand(
			COMMANDS.OPEN_FILE,
			mainInstant.executeOpenFile,
			mainInstant
		);

		// *********************
		// Destroy
		// *********************

		context.subscriptions.push(
			defaultDisposable,
			insertDisposable,
			replaceDisposable,
			openFileDisposable,
			comparedDisposable
		);
	} catch (error) {
		Logger.error({
			type: ErrorEnum.UNKNOWN_MISTAKE,
			data: error,
			items: ['OpenIssue']
		});
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
}