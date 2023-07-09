let counter: number = 1;

export const IDGenerator = {
    getId(prefix: string): string {
        const id = prefix + '_' + counter;
        counter += 1;
        return id;
    }
};