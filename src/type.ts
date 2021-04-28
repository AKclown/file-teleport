import { Range, TextEditor } from "vscode";

// *********************
// commands
// *********************

export enum COMMANDS {
    FILE_TELEPORT_DEFAULT = 'file.teleport.default',
    FILE_TELEPORT_INSERT = 'file.teleport.insert',
    FILE_TELEPORT_REPLACE = 'file.teleport.replace',
    OPEN_FILE = 'file.teleport.openFile'
}

// *********************
// ContentTransfer 
// *********************

export interface IContentTransfer {

    compareTextDocument(): void;

    executeDefault(...args: unknown[]): void;

    executeInsert(...args: unknown[]): void;

    executeReplace(...args: unknown[]): void;

    getRelatedEditor(): ReturnRelatedEditor;

    getRelatedData(activeEditor: TextEditor): ReturnRelatedData;

    isTextEnd(activeEditor: TextEditor, range: Range): boolean;
}


// *********************
// OpenFile 
// *********************

export interface IFile {
    executeOpenFile(...args: unknown[]): Promise<void>;

}


// *********************
// type
// *********************

export type ReturnRelatedEditor = {
    activeEditor: TextEditor;
    visibleEditor: Array<TextEditor>;
    otherEditor: Array<TextEditor>;
}

export type ReturnRelatedData = {
    ranges: Array<Range>;
    texts: Array<string>;
}

// *********************
// Utilities
// *********************

export type PropType<T, P extends keyof T> = T[P];

export type RequiredSome<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type Unpacked<T> = T extends (infer U)[] ? U : T;










