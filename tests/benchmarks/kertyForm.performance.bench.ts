import { bench, describe } from "vitest";
import { KertyForm } from "../../src/lib";
import {
    FieldValidations,
    Validator,
    ValidationResult,
    Severity,
    type IValidationResult,
    type IValidator
} from "../../src/lib";

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

const createForm = (rows: number, mode: Mode, value = "value", validator?: IValidator<Grid>) => {
    const form = new KertyForm<Grid>({ data: { title: "Grid", rows: createRows(rows, value) }, validator });

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

// ── validation fixtures ────────────────────────────────────────────────────

const ERROR = new ValidationResult().add({ text: "Required", severity: Severity.Error });
const CLEARED = new ValidationResult();

const requiredCell = new FieldValidations({ check: (ctx) => ctx.value === "", message: "Required" });

const createGridValidator = () => new Validator<any>({
    rows: [Object.fromEntries(Array.from({ length: CELLS_PER_ROW }, (_, cell) => [`_cell${cell}`, requiredCell]))],
});

const cellResults = (rows: number, result: IValidationResult) => {
    const results = new Map<string, IValidationResult>();
    for(let row = 0; row < rows; row++) {
        for(let cell = 0; cell < CELLS_PER_ROW; cell++) {
            results.set(`rows[${row}].cell${cell}`, result);
        }
    }
    return results;
};

// Returns a prebuilt map, so validate() measures only the form's bookkeeping.
const precomputedValidator = (results: Map<string, IValidationResult>): IValidator<Grid> => ({
    mode: "fieldDriven",
    validate: () => results,
});

// ── validate ───────────────────────────────────────────────────────────────

// Every iteration clears the previous results and applies the same ones again,
// so the form reaches a steady state after the first call.
for(const mode of ["bare", "subscribed"] as const) {
    describe(`validate – Validator, all cells valid by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const form = createForm(rows, mode, "value", createGridValidator());

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.validate();
            });
        }
    });
}

for(const mode of ["bare", "subscribed"] as const) {
    describe(`validate – Validator, all cells invalid by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const form = createForm(rows, mode, "", createGridValidator());

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.validate();
            });
        }
    });
}

describe("validate – variants at 1000 rows (subscribed)", () => {
    const noValidator = createForm(1_000, "subscribed");
    const valid = createForm(1_000, "subscribed", "value", createGridValidator());
    const invalid = createForm(1_000, "subscribed", "", createGridValidator());
    const precomputed = createForm(1_000, "subscribed", "", precomputedValidator(cellResults(1_000, ERROR)));
    const formLevel = createForm(1_000, "subscribed", "value", precomputedValidator(new Map([["", ERROR]])));

    bench("no validator", () => {
        noValidator.validate();
    });

    bench("Validator – all cells valid", () => {
        valid.validate();
    });

    bench("Validator – all cells invalid", () => {
        invalid.validate();
    });

    bench("precomputed results – all cells invalid (form bookkeeping only)", () => {
        precomputed.validate();
    });

    bench("precomputed results – form-level error only", () => {
        formLevel.validate();
    });
});

// ── applyValidationResults ─────────────────────────────────────────────────

for(const mode of ["bare", "subscribed"] as const) {
    describe(`applyValidationResults – error on every cell, patch, by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const form = createForm(rows, mode);
            const results = cellResults(rows, ERROR);

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.applyValidationResults(results);
            });
        }
    });
}

for(const mode of ["bare", "subscribed"] as const) {
    describe(`applyValidationResults – single cell, patch, by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const form = createForm(rows, mode);
            const results = new Map([[`rows[${Math.floor(rows / 2)}].cell3`, ERROR]]);

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.applyValidationResults(results);
            });
        }
    });
}

// Merge appends to the field's existing messages, so applying the same map
// repeatedly would grow them without bound. Every mode therefore alternates
// between an error on every cell and a cleared result on every cell.
describe("applyValidationResults – mode at 1000 rows (subscribed)", () => {
    const errors = cellResults(1_000, ERROR);
    const cleared = cellResults(1_000, CLEARED);

    for(const applyMode of ["patch", "merge", "replace"] as const) {
        const form = createForm(1_000, "subscribed");
        const options = { mode: applyMode };
        let counter = 0;

        bench(applyMode, () => {
            form.applyValidationResults((counter++ & 1) === 0 ? errors : cleared, options);
        });
    }
});

describe("applyValidationResults – variants at 1000 rows (subscribed)", () => {
    const formLevelForm = createForm(1_000, "subscribed");
    const singleForm = createForm(1_000, "subscribed");
    const everyCellForm = createForm(1_000, "subscribed");
    const replaceEmptyForm = createForm(1_000, "subscribed");
    const unknownForm = createForm(1_000, "bare");

    const formLevel = new Map([["", ERROR]]);
    const single = new Map([["rows[500].cell3", ERROR]]);
    const everyCell = cellResults(1_000, ERROR);
    const empty = new Map<string, IValidationResult>();
    const ignoreOptions = { unknownFieldBehavior: "ignore" } as const;
    const replaceOptions = { mode: "replace" } as const;

    bench("form-level result only", () => {
        formLevelForm.applyValidationResults(formLevel);
    });

    bench("single cell", () => {
        singleForm.applyValidationResults(single);
    });

    bench("error on every cell", () => {
        everyCellForm.applyValidationResults(everyCell);
    });

    bench("replace with an empty map (clears every field)", () => {
        replaceEmptyForm.applyValidationResults(empty, replaceOptions);
    });

    bench("every cell unknown, ignored (no registered fields)", () => {
        unknownForm.applyValidationResults(everyCell, ignoreOptions);
    });
});

// ── reset ──────────────────────────────────────────────────────────────────

// reset() leaves the form clean, so repeated calls measure a clean form: the
// data clone, the per-field state reset and the unconditional notification of
// every listener.
for(const mode of ["bare", "subscribed"] as const) {
    describe(`reset – clean form by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const form = createForm(rows, mode);

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.reset();
            });
        }
    });
}

// The dirty/validated rows have to put that state back inside the bench, so
// they include the cost of the preceding call; compare them with the matching
// setFieldValue / applyValidationResults / validate groups.
describe("reset – variants at 1000 rows (subscribed)", () => {
    const cloneSource = createForm(1_000, "bare").getData();
    const cleanForm = createForm(1_000, "subscribed");
    const newDataForm = createForm(1_000, "subscribed");
    const dirtyForm = createForm(1_000, "subscribed");
    const appliedForm = createForm(1_000, "subscribed");
    const validatedForm = createForm(1_000, "subscribed", "", createGridValidator());

    const dataA: Grid = { title: "A", rows: createRows(1_000, "a") };
    const dataB: Grid = { title: "B", rows: createRows(1_000, "b") };
    const everyCell = cellResults(1_000, ERROR);
    let counter = 0;

    bench("structuredClone of the data alone (baseline)", () => {
        structuredClone(cloneSource);
    });

    bench("reset() – clean form", () => {
        cleanForm.reset();
    });

    bench("reset(data) – new initial data", () => {
        newDataForm.reset((counter++ & 1) === 0 ? dataA : dataB);
    });

    bench("setFieldValue (leaf) + reset() – one dirty field", () => {
        dirtyForm.setFieldValue("rows[500].cell3" as any, "changed");
        dirtyForm.reset();
    });

    bench("applyValidationResults (every cell) + reset()", () => {
        appliedForm.applyValidationResults(everyCell);
        appliedForm.reset();
    });

    bench("validate (all cells invalid) + reset()", () => {
        validatedForm.validate();
        validatedForm.reset();
    });
});
