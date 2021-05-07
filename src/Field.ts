export class Field {
    private _left: string;
    private _right: string;
    private _all: string;

    private _status: 'ADD' | 'DEL' | 'NO' = 'NO';

    constructor(left: string, right: string, all: string) {
        this._left = left;
        this._right = right;
        this._all = all;
    }

    get left(): string {
        return this._left;
    }

    get right(): string {
        return this._right;
    }

    get all(): string {
        return this._all;
    }
}