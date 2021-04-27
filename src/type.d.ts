// *********************
// commands
// *********************
export enum COMMANDS {
    CONTENT_TRANSFER = 'file.teleport.contentTransfer',
    OPEN_FILE = 'file.teleport.openFile'
}

// *********************
// ContentTransfer 
// *********************

export class IContentTransfer {
    
    executeContentTransfer(...args: unknown[]): void;

    compareTextDocument(): void;
}


// *********************
// ContentTransfer 
// *********************

export class IFile {
    executeOpenFile(...args: unknown[]): Promise<void>;

}


// *********************
// Utilities
// *********************

export type PropType<T, P extends keyof T> = T[P];

export type RequiredSome<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type Unpacked<T> = T extends (infer U)[] ? U : T;










