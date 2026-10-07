import { bench, describe } from "vitest";
import { KertyForm, SingleMessageDrivenValidator } from "../../src/lib";

type Row = { name: string; code: string };
type Grid = { rows: Row[] };

const SIZES = [10, 100, 1_000] as const;

const createRows = (rows: number): Row[] =>
    Array.from({ length: rows }, () => ({ name: "", code: "" }));

const createValidator = () => new SingleMessageDrivenValidator<Grid>((result, { data }) => {
    const rows = data.rows;
    for(let i = 0; i < rows.length; i++) {
        if(!rows[i].name) {
            result.setFieldMessage(`rows[${i}].name` as any, "Name is required");
        }
    }
});

const createValidatedForm = (rows: number, withSnapshotListeners: boolean) => {
    const form = new KertyForm<Grid>({
        data: { rows: createRows(rows) },
        validator: createValidator(),
    });

    for(let row = 0; row < rows; row++) {
        const name = `rows[${row}].name` as any;
        const getSnapshot = form.getFieldSnapshot(name);
        form.addFieldListener(name, withSnapshotListeners ? getSnapshot : () => { });
        getSnapshot();
    }

    form.validate();
    return form;
};

const createToggle = (form: KertyForm<Grid>, fieldName: string) => {
    let toggle = false;
    return () => {
        toggle = !toggle;
        form.setFieldValue(fieldName as any, toggle ? "x" : "");
    };
};

describe("setFieldValue with messageDriven validator – one message toggles by row count (snapshot listeners)", () => {
    for(const rows of SIZES) {
        const form = createValidatedForm(rows, true);
        bench(`${rows} rows`, createToggle(form, `rows[${Math.floor(rows / 2)}].name`));
    }
});

describe("setFieldValue with messageDriven validator – variants at 1000 rows", () => {
    const toggleMessageWithSnapshotListeners = createToggle(createValidatedForm(1_000, true), "rows[500].name");
    const toggleMessageWithNoopListeners = createToggle(createValidatedForm(1_000, false), "rows[500].name");
    const keepMessagesWithSnapshotListeners = createToggle(createValidatedForm(1_000, true), "rows[500].code");
    const validator = createValidator();
    const data: Grid = { rows: createRows(1_000) };

    bench("one message toggles, snapshot listeners", toggleMessageWithSnapshotListeners);

    bench("one message toggles, no-op listeners", toggleMessageWithNoopListeners);

    bench("all messages stay the same, snapshot listeners", keepMessagesWithSnapshotListeners);

    bench("validator alone", () => {
        validator.validate({ data, fieldName: "rows[500].name" });
    });
});
