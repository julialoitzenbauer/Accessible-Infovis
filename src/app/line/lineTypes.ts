export type CleanData = {
    date: string,
    measurment: number,
}

export type CleanDataObj = {
    id: string,
    values: Array<CleanData>,
}

export type CleanDotData = {
    lineId: string,
    date: string,
    measurment: number,
}