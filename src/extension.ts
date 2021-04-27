import { ExtensionContext, commands } from 'vscode';
import { ContentTransfer } from './content-transfer';
import { FileRelated } from './open-file';
import { COMMANDS } from './type';

export function activate(context: ExtensionContext) {

	const transferInstant = new ContentTransfer();
	const transferDisposable = commands.registerCommand(COMMANDS.CONTENT_TRANSFER, transferInstant.executeContentTransfer);

	const fileInstant = new FileRelated();
	const openFileDisposable = commands.registerCommand(COMMANDS.OPEN_FILE, fileInstant.executeOpenFile);

	context.subscriptions.push(
		transferDisposable,
		openFileDisposable
	);
}

// this method is called when your extension is deactivated
export function deactivate() { }
