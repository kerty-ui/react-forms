import { bench, describe } from "vitest";
import {
    FieldValidations,
    KertyForm,
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

const createForm = (
    rows: number, mode: Mode, value = "value", validator?: IValidator<Grid>, dirtyCheckEnabled = true) => {
    const form = new KertyForm<Grid>({
        data: { title: "Grid", rows: createRows(rows, value) },
        validator,
        dirtyCheckEnabled,
    });

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

// Vitest does not expose tinybench's per-iteration hooks, so benches that change
// the array length undo the change before the next iteration. Benches that shift
// items undo with the opposite silent array operation, because field state
// follows the item position and a silent setFieldValue would leave the state
// shifted. Appending shifts nothing, so it restores the original rows with a
// silent setFieldValue; the cost of that restore alone is reported as its own row.
const createGrowingForm = (rows: number, mode: Mode, dirtyCheckEnabled = true) => {
    const form = createForm(rows, mode, "value", undefined, dirtyCheckEnabled);
    const baseRows = form.getData().rows;
    const restore = () => form.setFieldValue("rows", baseRows, true);
    const undoInsert = (index: number, count = 1) => {
        form.removeItems("rows", Array.from({ length: count }, (_, i) => index + i), true);
    };
    const undoRemove = (indexes: number[]) => {
        for(const index of [...indexes].sort((a, b) => a - b)) {
            form.insertItems("rows", index, baseRows[index], true);
        }
    };
    return { form, restore, undoInsert, undoRemove };
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

// ── dirty check enabled vs disabled ────────────────────────────────────────

// Every value change compares the new value with the initial one. Disabling the
// dirty check skips that comparison and the dirty bookkeeping of the field and of
// its registered ancestors, so each pair below shows what the feature costs. The
// forms are "subscribed" so the row and the collection are registered ancestors.
const DIRTY_CHECK_VARIANTS = [
    { name: "dirty check enabled", enabled: true },
    { name: "dirty check disabled", enabled: false },
] as const;

const describeDirtyCheckPair = (title: string, createBench: (dirtyCheckEnabled: boolean) => () => void) => {
    describe(`dirty check – ${title}`, () => {
        for(const variant of DIRTY_CHECK_VARIANTS) {
            bench(variant.name, createBench(variant.enabled));
        }
    });
};

// The cell alternates between its initial and a changed value, so it flips
// between dirty and clean on every call. Going clean makes the row and the whole
// collection compare themselves with the initial data to see whether anything
// else still differs, which is the most expensive path of the dirty check.
for(const rows of SIZES) {
    describeDirtyCheckPair(`leaf cell flipping dirty and clean, ${rows} rows / ${listenerCount(rows)} listeners`, (enabled) => {
        const form = createForm(rows, "subscribed", "value", undefined, enabled);
        const target = `rows[${Math.floor(rows / 2)}].cell3` as any;
        let counter = 0;

        return () => {
            form.setFieldValue(target, (counter++ & 1) === 0 ? "changed" : "value");
        };
    });
}

// The cell never returns to its initial value, so after the first call it stays
// dirty and only the cell itself is compared.
describeDirtyCheckPair("leaf cell staying dirty, 1000 rows", (enabled) => {
    const form = createForm(1_000, "subscribed", "value", undefined, enabled);
    let counter = 0;

    return () => {
        form.setFieldValue("rows[500].cell3" as any, (counter++ & 1) === 0 ? "a" : "b");
    };
});

describeDirtyCheckPair("row item staying dirty, 1000 rows", (enabled) => {
    const form = createForm(1_000, "subscribed", "value", undefined, enabled);
    const rowA = createRow("a");
    const rowB = createRow("b");
    let counter = 0;

    return () => {
        form.setFieldValue("rows[500]" as any, (counter++ & 1) === 0 ? rowA : rowB);
    };
});

// Both collections are deep-equal to the initial rows, so with the dirty check
// enabled every call walks all 10 000 cells to conclude the field is clean.
describeDirtyCheckPair("whole collection deep-equal to the initial value, 1000 rows", (enabled) => {
    const form = createForm(1_000, "subscribed", "value", undefined, enabled);
    const collectionA = createRows(1_000);
    const collectionB = createRows(1_000);
    let counter = 0;

    return () => {
        form.setFieldValue("rows", (counter++ & 1) === 0 ? collectionA : collectionB);
    };
});

describeDirtyCheckPair("appendItems, 1000 rows", (enabled) => {
    const { form, restore } = createGrowingForm(1_000, "subscribed", enabled);

    return () => {
        restore();
        form.appendItems("rows", NEW_ITEM);
    };
});

// Changing the collection re-checks every registered field below it: 11 000
// fields at 1000 rows. Prepending shifts every row, so each item and cell field
// is compared with the initial value at its index.
describeDirtyCheckPair("prependItems, 1000 rows", (enabled) => {
    const { form, undoInsert } = createGrowingForm(1_000, "subscribed", enabled);

    return () => {
        form.prependItems("rows", NEW_ITEM);
        undoInsert(0);
    };
});

describeDirtyCheckPair("removeItems in the middle, 1000 rows", (enabled) => {
    const { form, undoRemove } = createGrowingForm(1_000, "subscribed", enabled);

    return () => {
        form.removeItems("rows", 500);
        undoRemove([500]);
    };
});

// Every cell differs from its initial value, so the collection stays dirty and
// each of the 11 000 registered fields below it is compared one by one.
describeDirtyCheckPair("whole collection replaced with different values, 1000 rows", (enabled) => {
    const form = createForm(1_000, "subscribed", "value", undefined, enabled);
    const collectionA = createRows(1_000, "a");
    const collectionB = createRows(1_000, "b");
    let counter = 0;

    return () => {
        form.setFieldValue("rows", (counter++ & 1) === 0 ? collectionA : collectionB);
    };
});

// ── updateConfiguration ────────────────────────────────────────────────────

// Changing a dirty-check option walks every registered field once and
// recomputes its dirty flag; any other option returns right away. Field counts
// are cells: 50 fields are 5 rows of 10 cells, plus the rows, the collection and
// the title, all subscribed. Half of the rows differ from the initial data.
const UPDATE_CONFIGURATION_FIELDS = [50, 100, 1_000, 10_000] as const;

const createHalfChangedForm = (fields: number, dirtyCheckEnabled: boolean) => {
    const rows = fields / CELLS_PER_ROW;
    const form = createForm(rows, "subscribed", "value", undefined, dirtyCheckEnabled);
    form.setFieldValue("rows", createRows(rows).map((row, index) => index < rows / 2 ? createRow("changed") : row));
    return form;
};

const fieldsLabel = (fields: number) => `${fields} fields (${fields / CELLS_PER_ROW} rows)`;

// Two full walks per iteration: turning the check on marks the changed cells,
// their rows and the collection dirty and notifies the field listeners, and
// turning it off clears them again.
describe("updateConfiguration – enable + disable dirty check by field count (subscribed)", () => {
    for(const fields of UPDATE_CONFIGURATION_FIELDS) {
        const form = createHalfChangedForm(fields, false);

        bench(fieldsLabel(fields), () => {
            form.updateConfiguration({ dirtyCheckEnabled: true });
            form.updateConfiguration({ dirtyCheckEnabled: false });
        });
    }
});

// One full walk per iteration that compares every registered field with its
// initial value. No value is empty, so no dirty flag flips and nothing is notified.
describe("updateConfiguration – toggle dirtyCheckNullAsDefault by field count (subscribed)", () => {
    for(const fields of UPDATE_CONFIGURATION_FIELDS) {
        const form = createHalfChangedForm(fields, true);
        let dirtyCheckNullAsDefault = true;

        bench(fieldsLabel(fields), () => {
            dirtyCheckNullAsDefault = !dirtyCheckNullAsDefault;
            form.updateConfiguration({ dirtyCheckNullAsDefault });
        });
    }
});

describe("updateConfiguration – option without dirty recompute, 10000 fields (subscribed)", () => {
    const form = createHalfChangedForm(10_000, true);
    let trackTouchOnValueChange = true;

    bench("toggle trackTouchOnValueChange", () => {
        trackTouchOnValueChange = !trackTouchOnValueChange;
        form.updateConfiguration({ trackTouchOnValueChange });
    });
});

// ── prependItems ───────────────────────────────────────────────────────────

for(const mode of ["bare", "subscribed"] as const) {
    describe(`prependItems – single item by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const { form, undoInsert } = createGrowingForm(rows, mode);

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.prependItems("rows", NEW_ITEM);
                undoInsert(0);
            });
        }
    });
}

describe("prependItems – batch size at 1000 rows (subscribed)", () => {
    const single = createGrowingForm(1_000, "subscribed");
    const batch = createGrowingForm(1_000, "subscribed");
    const loop = createGrowingForm(1_000, "subscribed");

    bench("1 item", () => {
        single.form.prependItems("rows", NEW_ITEM);
        single.undoInsert(0);
    });

    bench("10 items – one call", () => {
        batch.form.prependItems("rows", NEW_ITEMS_10);
        batch.undoInsert(0, NEW_ITEMS_10.length);
    });

    bench("10 items – ten calls", () => {
        for(let i = 0; i < NEW_ITEMS_10.length; i++) {
            loop.form.prependItems("rows", NEW_ITEMS_10[i]);
        }
        loop.undoInsert(0, NEW_ITEMS_10.length);
    });
});

// ── insertItems ────────────────────────────────────────────────────────────

for(const mode of ["bare", "subscribed"] as const) {
    describe(`insertItems – single item in the middle by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const { form, undoInsert } = createGrowingForm(rows, mode);
            const index = Math.floor(rows / 2);

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.insertItems("rows", index, NEW_ITEM);
                undoInsert(index);
            });
        }
    });
}

describe("insertItems – position at 1000 rows (subscribed)", () => {
    const start = createGrowingForm(1_000, "subscribed");
    const middle = createGrowingForm(1_000, "subscribed");
    const end = createGrowingForm(1_000, "subscribed");

    bench("start (index 0)", () => {
        start.form.insertItems("rows", 0, NEW_ITEM);
        start.undoInsert(0);
    });

    bench("middle (index 500)", () => {
        middle.form.insertItems("rows", 500, NEW_ITEM);
        middle.undoInsert(500);
    });

    bench("end (index 1000)", () => {
        end.form.insertItems("rows", 1_000, NEW_ITEM);
        end.undoInsert(1_000);
    });
});

describe("insertItems – batch size at 1000 rows (subscribed)", () => {
    const single = createGrowingForm(1_000, "subscribed");
    const batch = createGrowingForm(1_000, "subscribed");
    const loop = createGrowingForm(1_000, "subscribed");

    bench("1 item", () => {
        single.form.insertItems("rows", 500, NEW_ITEM);
        single.undoInsert(500);
    });

    bench("10 items – one call", () => {
        batch.form.insertItems("rows", 500, NEW_ITEMS_10);
        batch.undoInsert(500, NEW_ITEMS_10.length);
    });

    bench("10 items – ten calls", () => {
        for(let i = 0; i < NEW_ITEMS_10.length; i++) {
            loop.form.insertItems("rows", 500 + i, NEW_ITEMS_10[i]);
        }
        loop.undoInsert(500, NEW_ITEMS_10.length);
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
        prepend.form.prependItems("rows", NEW_ITEM);
        prepend.undoInsert(0);
    });

    bench("insertItems(0)", () => {
        insert.form.insertItems("rows", 0, NEW_ITEM);
        insert.undoInsert(0);
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

// ── getInvalidFields ───────────────────────────────────────────────────────

// The results are applied once up front, so every iteration measures only the
// walk that collects the names of the invalid fields.
for(const mode of ["bare", "subscribed"] as const) {
    describe(`getInvalidFields – error on every cell by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const form = createForm(rows, mode);
            form.applyValidationResults(cellResults(rows, ERROR));

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.getInvalidFields();
            });
        }
    });
}

describe("getInvalidFields – variants at 1000 rows (subscribed)", () => {
    const noneForm = createForm(1_000, "subscribed");
    const singleForm = createForm(1_000, "subscribed");
    const everyCellForm = createForm(1_000, "subscribed");

    singleForm.applyValidationResults(new Map([["rows[500].cell3", ERROR]]));
    everyCellForm.applyValidationResults(cellResults(1_000, ERROR));

    bench("no invalid field (skips the walk)", () => {
        noneForm.getInvalidFields();
    });

    bench("single invalid cell", () => {
        singleForm.getInvalidFields();
    });

    bench("error on every cell", () => {
        everyCellForm.getInvalidFields();
    });
});

// ── removeItems ────────────────────────────────────────────────────────────

for(const mode of ["bare", "subscribed"] as const) {
    describe(`removeItems – single item in the middle by form size (${mode})`, () => {
        for(const rows of SIZES) {
            const { form, undoRemove } = createGrowingForm(rows, mode);
            const index = Math.floor(rows / 2);

            bench(`${rows} rows${mode === "subscribed" ? ` / ${listenerCount(rows)} listeners` : ""}`, () => {
                form.removeItems("rows", index);
                undoRemove([index]);
            });
        }
    });
}

describe("removeItems – batch size at 1000 rows (subscribed)", () => {
    const restoreOnly = createGrowingForm(1_000, "subscribed");
    const single = createGrowingForm(1_000, "subscribed");
    const batch = createGrowingForm(1_000, "subscribed");
    const loop = createGrowingForm(1_000, "subscribed");
    const indexes = Array.from({ length: 10 }, (_, i) => i * 100);

    bench("restore only (overhead of the other rows)", () => {
        restoreOnly.restore();
    });

    bench("1 item", () => {
        single.form.removeItems("rows", 500);
        single.undoRemove([500]);
    });

    bench("10 items – one call", () => {
        batch.form.removeItems("rows", [...indexes]);
        batch.undoRemove(indexes);
    });

    bench("10 items – ten calls", () => {
        for(let i = indexes.length - 1; i >= 0; i--) {
            loop.form.removeItems("rows", indexes[i]);
        }
        loop.undoRemove(indexes);
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

// ── field entry creation ───────────────────────────────────────────────────

// A field gets its entry on first use and loses it when its last listener
// unsubscribes while its state is default, so subscribing and unsubscribing
// 1000 fields creates and prunes 1000 entries per iteration. Names are parsed
// on the first iteration only. In "entries kept" every field also holds a
// permanent listener, so the same calls create and prune nothing; the gap
// between the two rows is the cost of creating and pruning the entries.
const ENTRY_PATHS = [
    {
        label: "flat grid cells (rows[i].cellJ)",
        names: Array.from({ length: 1_000 }, (_, i) => `rows[${Math.floor(i / CELLS_PER_ROW)}].cell${i % CELLS_PER_ROW}`),
    },
    {
        label: "nested array cells (orders[i].lines[j].qty)",
        names: Array.from({ length: 1_000 }, (_, i) => `orders[${Math.floor(i / 10)}].lines[${i % 10}].qty`),
    },
    {
        label: "deep object paths (aI.bJ.cK.value)",
        names: Array.from({ length: 1_000 }, (_, i) => `a${i % 10}.b${Math.floor(i / 10) % 10}.c${Math.floor(i / 100)}.value`),
    },
];

const subscribeAndUnsubscribe = (form: KertyForm<any>, names: string[]) => {
    const unsubscribes = names.map(name => form.addFieldListener(name, noop));
    for(const unsubscribe of unsubscribes) {
        unsubscribe();
    }
};

for(const { label, names } of ENTRY_PATHS) {
    describe(`field entry creation – 1000 fields, ${label}`, () => {
        const createdForm = new KertyForm<any>({ data: {} });
        const keptForm = new KertyForm<any>({ data: {} });
        for(const name of names) {
            keptForm.addFieldListener(name, noop);
        }

        bench("entries created and pruned", () => {
            subscribeAndUnsubscribe(createdForm, names);
        });

        bench("entries kept (subscription overhead only)", () => {
            subscribeAndUnsubscribe(keptForm, names);
        });
    });
}
