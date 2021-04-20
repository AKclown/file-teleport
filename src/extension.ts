import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	// 
	const transferRegistration = vscode.commands.registerCommand('file.teleport.contentTransfer', () => {

	});


	const openFileRegistration = vscode.commands.registerCommand('file.teleport.openFile', (evt) => {
		console.log('file.teleport.openFile');

	});

	context.subscriptions.push(
		transferRegistration,
		openFileRegistration
	);
}

// this method is called when your extension is deactivated
export function deactivate() { }
