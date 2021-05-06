import { Range, TextEditor } from "vscode";

export interface IContentTransfer {

    compareTextDocument(): void;

    executeUpdate(...args: unknown[]): Promise<void>;

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


// *********************
// operate enum 
// *********************

export enum OPERATE {
    'Left  ->  Left' = 0,
    'Left  ->  Right' = 1,
    'Left  ->  All' = 2,
    'Right ->  Left' = 3,
    'Right ->  Right' = 4,
    'Right ->  All' = 5,
    'All   ->  Left' = 6,
    'All   ->  Right' = 7,
    'All   ->  All' = 8,
}







