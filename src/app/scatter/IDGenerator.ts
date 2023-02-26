let counter: number = 1;

export const IDGenerator = {
    getId(): string {
        const id = 'scatter_' + counter;
        counter += 1;
        return id;
    }
};