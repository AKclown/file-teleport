import { type } from "node:os";
import { Range, TextEditor } from "vscode";

// *********************
// class interface
// *********************

export interface IMain {
    executeInsert(...args: unknown[]): void;

    insertText(editor: TextEditor, text: string, line?: number): Promise<void>;

    executeReplace(...args: unknown[]): void;

    replaceText(editor: TextEditor, startLine: number, endLine: number, text: string): Promise<void>;

    executeUpdate(...args: unknown[]): Promise<void>;

    getSelectedInfo(editor: TextEditor): Partial<ReturnSelectedInfo>;

    getAreaValue(): Promise<{ start: number, end: number }>;
}

// *********************
// type 
// *********************
export type AddTextParams = {
    originText: Array<string>;
    originLine: number;
    targetText: Array<string>;
    addLine: number;
    count: number;
}

export type DeleteTextParams = {
    targetText: Array<string>;
    deleteLine: number;
    count: number;
}

export type UpdateTextParams = {
    originText: string[];
    targetText: string[];
    editor: TextEditor;
    range: Range;
}

export type Field = {
    left?: string;
    right?: string;
    all?: string;
}

export type ReturnSelectedInfo = {
    ranges: Array<Range>;
    texts: Array<string>;
}

// *********************
// operate enum 
// *********************

export enum OPERATE {
    'Left  ->  All' = 0,
    'Right ->  All' = 1,
    'All   ->  All' = 2,
}







