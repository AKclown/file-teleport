export class Filed {
    private _left: string;
    private _right: string;
    private _all: string;
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
	
	get verb(): string {
		return this._all;
	}

}