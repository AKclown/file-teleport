import { Range, TextEditor } from "vscode";

export interface IContentTransfer {

    compareTextDocument(): void;

    executeUpdate(...args: unknown[]): void;

    executeInsert(...args: unknown[]): void;

    executeReplace(...args: unknown[]): void;

    getRelatedEditor(): ReturnRelatedEditor;

    getRelatedData(activeEditor: TextEditor): ReturnRelatedData;

    isTextEnd(activeEditor: TextEditor, range: Range): boolean;
}

export type ReturnRelatedEditor = {
    activeEditor: TextEditor;
    otherEditor: Array<TextEditor>;
}

export type ReturnRelatedData = {
    ranges: Array<Range>;
    texts: Array<string>;
}
