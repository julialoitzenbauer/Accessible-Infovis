import { CleanData } from "./scatterTypes";

type NextType = {
    done: boolean;
    value: CleanData;
};

export class DataIterable implements Iterable<CleanData> {
    private data: Record<number, Array<CleanData>>;
    private currRecordIdx: number = 0;
    private keys: Array<number>;
    private currDataIdx: number = -1;
    private done: boolean = false;

    constructor(d: Record<number, Array<CleanData>>) {
        this.data  = d;
        this.keys = Object.keys(this.data).map(Number);
    }

    private getNextValue(): NextType {
        if (this.done) {
            return {
                done: true,
                value: {
                    xValue: -1,
                    yValue: -1,
                    label: '',
                    ID: '',
                },
            };
        }
        this.currDataIdx += 1;
        const d = this.data[this.keys[this.currRecordIdx]][this.currDataIdx];
        if (this.currDataIdx === this.data[this.keys[this.currRecordIdx]].length - 1) {
            this.currRecordIdx += 1;
            this.currDataIdx = -1;
        }
        const val = {
            done: this.done,
            value: d,
        };
        if (this.currRecordIdx >= this.keys.length) {
            this.done = true;
        }
        return val;
    }

    public [Symbol.iterator]() {
        return {
            next: function(this: DataIterable) {
                return this.getNextValue();
            }.bind(this)
        }
    }

}