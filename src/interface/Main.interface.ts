import { Range, TextEditor } from "vscode";

// *********************
// class interface
// *********************

export interface IMain {

    executeUpdate(...args: unknown[]): Promise<void>;

    executeInsert(...args: unknown[]): void;

    executeReplace(...args: unknown[]): void;

    getRelatedEditor(): ReturnRelatedEditor;

    getRelatedData(activeEditor: TextEditor): ReturnRelatedData;

    isTextEnd(activeEditor: TextEditor, range: Range): boolean;
}

// *********************
// type 
// *********************

export type ReturnRelatedEditor = {
    activeEditor: TextEditor;
    otherEditor: Array<TextEditor>;
}

export type ReturnRelatedData = {
    ranges: Array<Range>;
    texts: Array<string>;
}

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

export type Field = {
    left?: string;
    right?: string;
    all?: string;
}

// todo
export type ReturnSelectedInfo = {
    ranges: Array<Range>;
    texts: Array<string>;
} 

// *********************
// operate enum 
// *********************

// 更新:功能砍掉。 这个目前能力还有限
// export enum OPERATE {
//     'Left  ->  Left' = 0,
//     'Left  ->  Right' = 1,
//     'Left  ->  All' = 2,
//     'Right ->  Left' = 3,
//     'Right ->  Right' = 4,
//     'Right ->  All' = 5,
//     'All   ->  Left' = 6,
//     'All   ->  Right' = 7,
//     'All   ->  All' = 8,
// }

export enum OPERATE {
    'Left  ->  All' = 0,
    'Right ->  All' = 1,
    'All   ->  All' = 2,
}






