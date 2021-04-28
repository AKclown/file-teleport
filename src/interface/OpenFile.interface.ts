export interface IFile {
    executeOpenFile(...args: unknown[]): Promise<void>;
}