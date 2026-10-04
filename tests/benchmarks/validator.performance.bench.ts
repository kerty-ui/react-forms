import { bench, describe } from "vitest";
import { FieldValidations, Validator } from "../../src/lib";

type Row = Record<string, string>;
type Grid = { title: string; rows: Row[] };

const CELLS_PER_ROW = 10;
const SIZES = [10, 100, 1_000, 10_000] as const;

const createRow = (value: string): Row =>
    Object.fromEntries(Array.from({ length: CELLS_PER_ROW }, (_, cell) => [`cell${cell}`, value]));

const createGrid = (rows: number): Grid => ({
    title: "Grid",
    rows: Array.from({ length: rows }, () => createRow("value")),
});

const required = new FieldValidations({ check: (ctx) => ctx.value === "", message: "Required" });

const validator = new Validator<any>({
    _title: required,
    rows: [Object.fromEntries(Array.from({ length: CELLS_PER_ROW }, (_, cell) => [`_cell${cell}`, required]))],
});

// ── Validator.validate ─────────────────────────────────────────────────────

describe("Validator.validate – one cell changed by form size", () => {
    for(const rows of SIZES) {
        const data = createGrid(rows);
        const fieldName = `rows[${Math.floor(rows / 2)}].cell5`;

        bench(`${rows} rows`, () => {
            validator.validate({ data, fieldName });
        });
    }
});

describe("Validator.validate – scope variants at 1000 rows", () => {
    const data = createGrid(1_000);

    bench("full form (no field name)", () => {
        validator.validate({ data });
    });

    bench("one cell", () => {
        validator.validate({ data, fieldName: "rows[500].cell5" });
    });

    bench("one row", () => {
        validator.validate({ data, fieldName: "rows[500]" });
    });

    bench("whole collection", () => {
        validator.validate({ data, fieldName: "rows" });
    });

    bench("root field outside the collection", () => {
        validator.validate({ data, fieldName: "title" });
    });

    bench("field without rules", () => {
        validator.validate({ data, fieldName: "unknown" });
    });
});
