import { bench, describe } from "vitest";
import { KertyForm } from "../../src/lib/kertyForm";

type Grid = { rows: Record<string, string>[] };

const CELLS_PER_ROW = 10;

const createGrid = (rows: number): Grid => ({
    rows: Array.from({ length: rows }, () =>
        Object.fromEntries(
            Array.from({ length: CELLS_PER_ROW }, (_, cell) => [`cell${cell}`, "value"]),
        ),
    ),
});

const noop = () => {};

const createSubscribedForm = (rows: number) => {
    const form = new KertyForm<Grid>({ data: createGrid(rows) });

    form.addFieldListener("rows", noop);
    for (let row = 0; row < rows; row++) {
        form.addFieldListener(`rows[${row}]`, noop);
        for (let cell = 0; cell < CELLS_PER_ROW; cell++) {
            form.addFieldListener(`rows[${row}].cell${cell}`, noop);
        }
    }

    return form;
};

const createRealisticListener = (form: KertyForm<Grid>, fieldPath: string) => {
    let lastValue: unknown;
    let invalidations = 0;

    return () => {
        const value = form.getFieldValue(fieldPath as any);
        if (Object.is(value, lastValue)) {
            return;
        }
        lastValue = value;
        invalidations += 1;
        void { fieldPath, value, invalidations };
    };
};

const createRealisticForm = (rows: number) => {
    const form = new KertyForm<Grid>({ data: createGrid(rows) });

    form.addFieldListener("rows", createRealisticListener(form, "rows"));
    for (let row = 0; row < rows; row++) {
        form.addFieldListener(`rows[${row}]`, createRealisticListener(form, `rows[${row}]`));
        for (let cell = 0; cell < CELLS_PER_ROW; cell++) {
            const fieldPath = `rows[${row}].cell${cell}`;
            form.addFieldListener(fieldPath as any, createRealisticListener(form, fieldPath));
        }
    }

    return form;
};

const SIZES = [10, 100, 1_000, 10_000, 50_000, 100_000] as const;

const forms = new Map(SIZES.map((rows) => [rows, createSubscribedForm(rows)]));
const realisticForms = new Map(SIZES.map((rows) => [rows, createRealisticForm(rows)]));

describe("notify – leaf cell edit by form size", () => {
    for (const rows of SIZES) {
        const form = forms.get(rows)!;
        const target = `rows[${Math.floor(rows / 2)}].cell3` as const;
        let counter = 0;

        bench(`${rows * (CELLS_PER_ROW + 1) + 1} listeners`, () => {
            form.setFieldValue(target as any, `v${counter++}`);
        });
    }
});

describe("notify – leaf cell edit with realistic listener work", () => {
    for (const rows of SIZES) {
        const form = realisticForms.get(rows)!;
        const target = `rows[${Math.floor(rows / 2)}].cell3` as const;
        let counter = 0;

        bench(`${rows * (CELLS_PER_ROW + 1) + 1} listeners`, () => {
            form.setFieldValue(target as any, `v${counter++}`);
        });
    }
});

describe("notify – change depth at 1000 rows", () => {
    const form = forms.get(1000)!;
    let counter = 0;

    bench("leaf cell – notifies the cell and its row", () => {
        form.setFieldValue("rows[500].cell3" as any, `v${counter++}`);
    });

    bench("row item – notifies the row, its cells and the collection", () => {
        form.setFieldValue("rows[500]" as any, { cell0: `v${counter++}` } as any);
    });

    bench("whole collection – notifies every descendant", () => {
        form.setFieldValue("rows", [{ cell0: `v${counter++}` }]);
    });
});
