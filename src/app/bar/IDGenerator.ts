let counter: number = 1;

export const IDGenerator = {
    getId(): string {
        const id = 'bar_' + counter;
        counter += 1;
        return id;
    }
};