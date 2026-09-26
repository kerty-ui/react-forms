import { bench, describe } from "vitest";
import { KertyForm } from "../../src/lib";

type Row = Record<string, string>;
type Grid = { title: string; rows: Row[] };

const CELLS_PER_ROW = 10;
const SIZES = [10, 100, 1_000, 10_000] as const;

const createRow = (value: string): Row =>
    Object.fromEntries(Array.from({ length: CELLS_PER_ROW }, (_, cell) => [`cell${cell}`, value]));

const createRows = (rows: number, value = "value"): Row[] =>
    Array.from({ length: rows }, () => createRow(value));

const noop = () => {};

// "bare" measures the data write + state bookkeeping alone; "subscribed" adds a
// listener on the collection, every row and every cell — what a fully rendered
// grid of FormFields registers.
type Mode = "bare" | "subscribed";

const createForm = (rows: number, mode: Mode) => {
    const form = new KertyForm<Grid>({ data: { title: "Grid", rows: createRows(rows) } });

    if(mode === "subscribed") {
        form.addFieldListener("title", noop);
        form.addFieldListener("rows", noop);
        for(let row = 0; row < rows; row++) {
            form.addFieldListener(`rows[${row}]` as any, noop);
            for(let cell = 0; cell < CELLS_PER_ROW; cell++) {
                form.addFieldListener(`rows[${row}].cell${cell}` as any, noop);
            }
        }
    }

    return form;
};

const listenerCount = (rows: number) => rows * (CELLS_PER_ROW + 1) + 2;

// Vitest does not expose tinybench's per-iteration hooks, so benches that grow
// the array first put the original rows back with a silent setFieldValue. That
// keeps every iteration measuring an array of the same length; the cost of the
// restore alone is reported as its own row where it matters.
const createGrowingForm = (rows: number, mode: Mode) => {
    const form = createForm(rows, mode);
    const baseRows = form.getData().rows;
    const restore = () => form.setFieldValue("rows", baseRows, true);
    return { form, restore };
};

const NEW_ITEM = createRow("new");
const NEW_ITEMS_10 = createRows(10, "new");

// ── setFieldValue ──────────────────────────────────────────────────────────

for(const mode of ["bare", "subscribed"] as const) {
    describe(`setFieldValue – leaf cell by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const form = createForm(rows, mode);
            const target = `rows[${Math.floor(rows / 2)}].cell3` as any;
            let counter = 0;

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.setFieldValue(target, (counter++ & 1) === 0 ? "a" : "b");
            });
        }
    });
}

for(const mode of ["bare", "subscribed"] as const) {
    describe(`setFieldValue – row item by form size (${mode})`, () => {
        const rowA = createRow("a");
        const rowB = createRow("b");

        for(const rows of SIZES) {
            const form = createForm(rows, mode);
            const target = `rows[${Math.floor(rows / 2)}]` as any;
            let counter = 0;

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.setFieldValue(target, (counter++ & 1) === 0 ? rowA : rowB);
            });
        }
    });
}

// Both replacements are deep-equal to the initial rows, so the dirty check has
// to walk the whole collection before it can call the field clean.
for(const mode of ["bare", "subscribed"] as const) {
    describe(`setFieldValue – whole collection, same length (${mode})`, () => {
        for(const rows of SIZES) {
            const form = createForm(rows, mode);
            const rowsA = createRows(rows);
            const rowsB = createRows(rows);
            let counter = 0;

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.setFieldValue("rows", (counter++ & 1) === 0 ? rowsA : rowsB);
            });
        }
    });
}

describe("setFieldValue – variants at 1000 rows (subscribed)", () => {
    const leafForm = createForm(1_000, "subscribed");
    const sameValueForm = createForm(1_000, "subscribed");
    const silentForm = createForm(1_000, "subscribed");
    const titleForm = createForm(1_000, "subscribed");
    let counter = 0;

    bench("leaf cell – changing value", () => {
        leafForm.setFieldValue("rows[500].cell3" as any, (counter++ & 1) === 0 ? "a" : "b");
    });

    bench("leaf cell – same value", () => {
        sameValueForm.setFieldValue("rows[500].cell3" as any, "value");
    });

    bench("leaf cell – silent", () => {
        silentForm.setFieldValue("rows[500].cell3" as any, (counter++ & 1) === 0 ? "a" : "b", true);
    });

    bench("top-level scalar (title)", () => {
        titleForm.setFieldValue("title", (counter++ & 1) === 0 ? "a" : "b");
    });
});

// ── prependItems ───────────────────────────────────────────────────────────

for(const mode of ["bare", "subscribed"] as const) {
    describe(`prependItems – single item by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const { form, restore } = createGrowingForm(rows, mode);

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                restore();
                form.prependItems("rows", NEW_ITEM);
            });
        }
    });
}

describe("prependItems – batch size at 1000 rows (subscribed)", () => {
    const single = createGrowingForm(1_000, "subscribed");
    const batch = createGrowingForm(1_000, "subscribed");
    const loop = createGrowingForm(1_000, "subscribed");

    bench("1 item", () => {
        single.restore();
        single.form.prependItems("rows", NEW_ITEM);
    });

    bench("10 items – one call", () => {
        batch.restore();
        batch.form.prependItems("rows", NEW_ITEMS_10);
    });

    bench("10 items – ten calls", () => {
        loop.restore();
        for(let i = 0; i < NEW_ITEMS_10.length; i++) {
            loop.form.prependItems("rows", NEW_ITEMS_10[i]);
        }
    });
});

// ── insertItems ────────────────────────────────────────────────────────────

for(const mode of ["bare", "subscribed"] as const) {
    describe(`insertItems – single item in the middle by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const { form, restore } = createGrowingForm(rows, mode);
            const index = Math.floor(rows / 2);

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                restore();
                form.insertItems("rows", index, NEW_ITEM);
            });
        }
    });
}

describe("insertItems – position at 1000 rows (subscribed)", () => {
    const start = createGrowingForm(1_000, "subscribed");
    const middle = createGrowingForm(1_000, "subscribed");
    const end = createGrowingForm(1_000, "subscribed");

    bench("start (index 0)", () => {
        start.restore();
        start.form.insertItems("rows", 0, NEW_ITEM);
    });

    bench("middle (index 500)", () => {
        middle.restore();
        middle.form.insertItems("rows", 500, NEW_ITEM);
    });

    bench("end (index 1000)", () => {
        end.restore();
        end.form.insertItems("rows", 1_000, NEW_ITEM);
    });
});

describe("insertItems – batch size at 1000 rows (subscribed)", () => {
    const single = createGrowingForm(1_000, "subscribed");
    const batch = createGrowingForm(1_000, "subscribed");
    const loop = createGrowingForm(1_000, "subscribed");

    bench("1 item", () => {
        single.restore();
        single.form.insertItems("rows", 500, NEW_ITEM);
    });

    bench("10 items – one call", () => {
        batch.restore();
        batch.form.insertItems("rows", 500, NEW_ITEMS_10);
    });

    bench("10 items – ten calls", () => {
        loop.restore();
        for(let i = 0; i < NEW_ITEMS_10.length; i++) {
            loop.form.insertItems("rows", 500 + i, NEW_ITEMS_10[i]);
        }
    });
});

// ── comparison ─────────────────────────────────────────────────────────────

describe("add one item at 1000 rows (subscribed)", () => {
    const overhead = createGrowingForm(1_000, "subscribed");
    const prepend = createGrowingForm(1_000, "subscribed");
    const insert = createGrowingForm(1_000, "subscribed");
    const append = createGrowingForm(1_000, "subscribed");
    const replace = createGrowingForm(1_000, "subscribed");
    const replacement = [NEW_ITEM, ...replace.form.getData().rows];

    bench("restore only (overhead of the other rows)", () => {
        overhead.restore();
    });

    bench("prependItems", () => {
        prepend.restore();
        prepend.form.prependItems("rows", NEW_ITEM);
    });

    bench("insertItems(0)", () => {
        insert.restore();
        insert.form.insertItems("rows", 0, NEW_ITEM);
    });

    bench("appendItems", () => {
        append.restore();
        append.form.appendItems("rows", NEW_ITEM);
    });

    bench("setFieldValue with a prebuilt array", () => {
        replace.restore();
        replace.form.setFieldValue("rows", replacement);
    });
});
