import { Range, TextEditor } from "vscode";

// *********************
// class interface
// *********************

export interface IMain {
    executeInsert(...args: unknown[]): void;

    insertText(params: InsertTextParams): Promise<void>;

    executeReplace(...args: unknown[]): void;

    replaceText(params: ReplaceTextParams): Promise<void>;

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
};

export type DeleteTextParams = {
    targetText: Array<string>;
    deleteLine: number;
    count: number;
};

export type UpdateTextParams = {
    originText: string[];
    targetText: string[];
    editor: TextEditor;
    range: Range;
};

export type ReplaceTextParams = {
    editor: TextEditor;
    startLine: number;
    endLine: number;
    text: string;
};

export type InsertTextParams = {
    editor: TextEditor;
    text: string;
    line?: number;
};

export type Field = {
    left?: string;
    right?: string;
    all?: string;
};

export type ReturnSelectedInfo = {
    ranges: Array<Range>;
    texts: Array<string>;
};

// 副作用标记
export type EffectOperate = 'update' | 'insert' | 'delete';

// *********************
// operate enum 
// *********************

export enum OPERATE {
    'Left  ->  All' = 0,
    'Right ->  All' = 1,
    'All   ->  All' = 2,
}







