
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
// Default Function
// *********************

export async function asyncForEach<T, K>(
    array: Array<T>,
    callback: (arg: T, index: number, array: Array<T>) => K) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}


// *********************
//  Utility Types
// *********************

export type PropType<T, P extends keyof T> = T[P];

export type RequiredSome<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type Unpacked<T> = T extends (infer U)[] ? U : T;