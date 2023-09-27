import { CleanData, CleanDataItem } from "./scatterTypes";

export class TreeData {
    private root: Branch;

    constructor(data: CleanData) {
        let treeData: Array<CleanDataItem> = [];
        for (const key of Object.keys(data)) {
            const items = data[parseFloat(key)];
            treeData = [...items, ...treeData];
        }
        this.root = new Branch(treeData);
    }

    public getRoot() {
        return this.root;
    }
}

export abstract class TreeNode {
    description: string;
    parent: TreeNode | null;

    constructor(parent?: TreeNode) {
        this.description = '';
        this.parent = parent || null;
    }

    public getDescription() {
        return this.description;
    }

    public getParent(): TreeNode | null {
        return this.parent;
    }
}


export class Branch extends TreeNode {
    private minRange: number | undefined;
    private maxRange: number | undefined;
    private data: Array<CleanDataItem>;
    private children: Array<TreeNode>;
    private leftTreeNode: Branch | null;
    private rightTreeNode: Branch | null;

    constructor(data: Array<CleanDataItem>, yTree?: boolean, parent?: TreeNode) {
        super(parent);
        this.data = data;
        this.description = this.createDescription(yTree ? 'yValue' : 'xValue');
        this.leftTreeNode = null;
        this.rightTreeNode = null;
        const leftData: Array<CleanDataItem> = [];
        const rightData: Array<CleanDataItem> = [];
        this.children = [];
        let leftDataPoints = 0;
        let rightDataPoints = 0;
        if (this.minRange != null && this.maxRange != null) {
            if (this.minRange == this.maxRange) {
                for (const d of this.data) {
                    this.children.push(new Leaf(d));
                }
            } else {
                const middle = this.minRange + (this.maxRange - this.minRange) / 2;
                for (const d of this.data) {
                    if (d[yTree ? 'yValue' : 'xValue'] < middle) {
                        leftData.push(d);
                    } else {
                        rightData.push(d);
                    }
                }
                if (leftData.length === 1) {
                    this.children.push(new Leaf(leftData[0], this));
                } else if (leftData.length > 1) {
                    this.leftTreeNode = new Branch(leftData, yTree, this);
                }
                if (rightData.length === 1) {
                    this.children.push(new Leaf(rightData[0], this));
                } else if (rightData.length > 1) {
                    this.rightTreeNode = new Branch(rightData, yTree, this);
                }
                leftDataPoints = leftData.length;
                rightDataPoints = rightData.length;
            }
        }
        this.description += ' This branch holds ' + leftDataPoints + ' items in the left child-branch.';
        this.description += ' This branch holds ' + rightDataPoints + ' items in the right child-branch.';
        this.description += ' This branch has ' + this.children.length + ' number of leafes.';
    }

    public numberOfDataPoints(): number {
        return this.data.length;
    }

    public getRightTreeNode () {
        return this.rightTreeNode;
    }

    public getLeftTreeNode () {
        return this.leftTreeNode;
    }

    public getChildren() {
        return this.children;
    }

    private createDescription(compareValue: 'xValue' | 'yValue'): string {
        if (this.data.length) {
            let axis = compareValue === 'xValue' ? 'x' : 'y';
            let maxOtherValue: number | undefined;
            let minOtherValue: number | undefined;
            let otherValues: Array<number> = [];
            const otherAxis = axis === 'x' ? 'y' : 'x';
            const otherValueID = compareValue === 'xValue' ? 'yValue' : 'xValue';
            for (const d of this.data) {
                let value = d[compareValue];
                let otherValue = d[otherValueID];
                otherValues.push(otherValue);
                if (this.minRange == null || value < this.minRange) this.minRange = value;
                if (this.maxRange == null || value > this.maxRange) this.maxRange = value;
                if (maxOtherValue == null || otherValue > maxOtherValue) maxOtherValue = otherValue;
                if (minOtherValue == null || otherValue < minOtherValue) minOtherValue = otherValue;
            }
            otherValues = otherValues.sort((a, b) => a - b);
            let sumOtherValue = 0;
            otherValues.forEach( num => {
                sumOtherValue += num;
            });
            let description = 'The current node is a branch. The ' + axis + '-Axis in this section has a range from ' + this.minRange + ' until ' + this.maxRange + '. ';
            description += 'The maximum value of the ' + otherAxis + '-Axis in this range is ' + maxOtherValue + '. ';
            description += 'The minimum value of the ' + otherAxis + '-Axis in this range is ' + minOtherValue + '. ';
            description += 'The mean value of the ' + otherAxis + '-Axis in this range is ' + (Math.round((sumOtherValue / this.data.length) * 100) / 100) + '. ';
            description += 'The median value of the ' + otherAxis + '-Axis in this range is ' + (Math.round(this.getMedian(otherValues) * 100) / 100) + '.';
            return description;
        }
        return '';
    }

    private getMedian(arr: Array<number>): number {
        const mid = Math.floor(arr.length / 2);
        if (arr.length % 2 === 0) {
            return (arr[mid - 1] + arr[mid]) / 2;
         } else {
            return arr[mid];
        }
    }
}

export class Leaf extends TreeNode {
    private data: CleanDataItem;

    constructor(data: CleanDataItem, parent?: TreeNode) {
        super(parent);
        this.data = data;
        this.description = 'The current node is a leaf. The x-Axis value is ' + this.data['xValue'] + ', the y-Axis value is ' + this.data['yValue'] + '.';
    }

    public getData(): CleanDataItem {
        return this.data;
    }
}