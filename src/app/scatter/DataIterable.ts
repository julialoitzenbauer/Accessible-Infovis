import { CleanData } from "./scatterTypes";

export class DataIterable implements Iterable<CleanData> {
    private data: Record<number, Array<CleanData>>;
    private currRecordIdx: number = 0;
    private keys: Array<number>;
    private currDataIdx: number = 0;

    constructor(d: Record<number, Array<CleanData>>) {
        this.data  = d;
        this.keys = Object.keys(this.data).map(Number);
        this.currRecordIdx = 0;
    }

    private getNextValue(): CleanData {
        const d = this.data[this.keys[this.currRecordIdx]][this.currDataIdx];;
        if (this.currDataIdx === this.data[this.keys[this.currRecordIdx]].length - 1) {
            this.currRecordIdx += 1;
            this.currDataIdx = 0;
        } else {
            this.currDataIdx += 1;
        }
        return d;
    }

    public [Symbol.iterator]() {
        return {
            next: function(this: DataIterable) {
                return {
                    done: this.currRecordIdx === this.keys.length - 1,
                    value: this.getNextValue()
                }
            }.bind(this)
        }
    }

}