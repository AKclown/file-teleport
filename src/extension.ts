import * as vscode from 'vscode';
import { executeOpenFile } from './open-file';
import { executeContentTransfer } from './content-transfer';

export function activate(context: vscode.ExtensionContext) {

	// 
	const transferDisposable = vscode.commands.registerCommand('file.teleport.contentTransfer', executeContentTransfer);


	const openFileDisposable = vscode.commands.registerCommand('file.teleport.openFile', executeOpenFile);

	context.subscriptions.push(
		transferDisposable,
		openFileDisposable
	);
}

// this method is called when your extension is deactivated
export function deactivate() { }
