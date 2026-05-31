import type { GridFormRow } from "../../../types";

export const parseValue = (inputValue: string) => {
    if (inputValue.length === 0) {
        return null;
    }

    const parsedValue = Number.parseFloat(inputValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

export const getDefaultRowData = (): GridFormRow => ({
    id: getNewId(),
    cell1: 1,
    cell2: 2,
    cell3: 3,
    cell4: 4,
    cell5: 5,
    cell6: 6,
    cell7: 7,
    cell8: 8,
    cell9: 9,
    cell10: 10,
});

let counter = 0;
export const getNewId = () => {
    counter += 1;
    return counter;
}
