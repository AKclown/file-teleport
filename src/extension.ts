import { ExtensionContext, commands } from 'vscode';
import { ContentTransfer } from './content-transfer';
import { FileRelated } from './open-file';
import { COMMANDS } from './type';

export function activate(context: ExtensionContext) {

	const transferInstant = new ContentTransfer();
	const defaultDisposable = commands.registerCommand(
		COMMANDS.FILE_TELEPORT_DEFAULT,
		transferInstant.executeDefault,
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

	context.subscriptions.push(
		defaultDisposable,
		insertDisposable,
		replaceDisposable,
		openFileDisposable
	);
}

// this method is called when your extension is deactivated
export function deactivate() { }
