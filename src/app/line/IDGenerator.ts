let counter: number = 1;

export const IDGenerator = {
    getId(): string {
        const id = 'line_' + counter;
        counter += 1;
        return id;
    }
};