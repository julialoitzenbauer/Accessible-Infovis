export type CleanDataItem = {
    label: string,
    xValue: number,
    yValue: number,
    ID: string;
};

export type CleanData = Record<number, Array<CleanDataItem>>;

export type DataPoint = {
    key: number;
    idx: number;
};