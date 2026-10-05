import { memo } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { bench, describe } from "vitest";
import { KertyForm, useField, useFieldWatch, useFormContext, type IKertyForm } from "../../src/lib";

type Person = { name: string; email: string };
type Persons = { persons: Person[] };

const ROWS = 1_000;
const BENCH_OPTIONS = { time: 2_000 };
const MOUNT_OPTIONS = { time: 6_000 };
const EDITED_PATH = `persons[${ROWS / 2}].name`;

const createPersons = (): Persons => ({
    persons: Array.from({ length: ROWS }, (_, row) => ({ name: `name${row}`, email: `email${row}` })),
});

// useField before memoization: a new field object and new helpers on every render.
const useFieldUnmemoized = (form: IKertyForm<any>, name: string) => {
    const contextForm = useFormContext(form);
    const field = useFieldWatch<string>(contextForm, name);
    return [
        {
            ...field,
            setValue: (value: string | null | undefined, silent?: boolean) => {
                contextForm.setFieldValue(name, value, silent);
            },
            touch: () => {
                contextForm.touch(name);
            },
        },
        contextForm,
    ] as const;
};

const useFieldMemoized = (form: IKertyForm<any>, name: string) => useField<any, string>({ form, name });

const VERSIONS = [
    { version: "unmemoized (before)", useRowField: (form: IKertyForm<any>, name: string) => useFieldUnmemoized(form, name)[0] },
    { version: "memoized (useField)", useRowField: (form: IKertyForm<any>, name: string) => useFieldMemoized(form, name)[0] },
];

if(process.env.BENCH_REVERSE === "1") {
    VERSIONS.reverse();
}

type RowProps = { form: IKertyForm<Persons>; index: number };
type UseRowField = (form: IKertyForm<any>, name: string) => ReturnType<typeof useFieldUnmemoized>[0];

const Input = memo(({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <input value={value} onChange={e => onChange(e.target.value)} />);

const createRow = (useRowField: UseRowField) => ({ form, index }: RowProps) => {
    const name = useRowField(form, `persons[${index}].name`);
    const email = useRowField(form, `persons[${index}].email`);
    return (
        <div>
            <input value={name.value ?? ""} onChange={e => name.setValue(e.target.value)} />
            <input value={email.value ?? ""} onChange={e => email.setValue(e.target.value)} />
        </div>
    );
};

const createMemoInputRow = (useRowField: UseRowField) => ({ form, index }: RowProps) => {
    const name = useRowField(form, `persons[${index}].name`);
    const email = useRowField(form, `persons[${index}].email`);
    return (
        <div>
            <Input value={name.value ?? ""} onChange={name.setValue} />
            <Input value={email.value ?? ""} onChange={email.setValue} />
        </div>
    );
};

const createList = (Row: (props: RowProps) => any) =>
    ({ form }: { form: IKertyForm<Persons>; tick: number }) =>
        <>{Array.from({ length: ROWS }, (_, index) => <Row key={index} form={form} index={index} />)}</>;

const mountList = (List: ReturnType<typeof createList>) => {
    const form = new KertyForm<Persons>({ data: createPersons() });
    const root = createRoot(document.createElement("div"));
    flushSync(() => root.render(<List form={form} tick={0} />));
    return { form, root };
};

describe(`useField – mount and unmount ${ROWS} rows of 2 fields`, () => {
    for(const { version, useRowField } of VERSIONS) {
        const List = createList(createRow(useRowField));
        const form = new KertyForm<Persons>({ data: createPersons() });

        bench(version, () => {
            const root = createRoot(document.createElement("div"));
            flushSync(() => root.render(<List form={form} tick={0} />));
            root.unmount();
        }, MOUNT_OPTIONS);
    }
});

describe(`useField – one keystroke, ${ROWS} memo rows (only the edited row re-renders)`, () => {
    for(const { version, useRowField } of VERSIONS) {
        const List = createList(memo(createRow(useRowField)));
        const { form } = mountList(List);
        let edit = 0;

        bench(version, () => {
            edit++;
            flushSync(() => form.setFieldValue(EDITED_PATH as any, `edited${edit}`));
        }, BENCH_OPTIONS);
    }
});

describe(`useField – parent re-renders ${ROWS} rows with unchanged fields`, () => {
    for(const { version, useRowField } of VERSIONS) {
        const List = createList(createRow(useRowField));
        const { form, root } = mountList(List);
        let tick = 0;

        bench(version, () => {
            tick++;
            flushSync(() => root.render(<List form={form} tick={tick} />));
        }, BENCH_OPTIONS);
    }
});

describe(`useField – parent re-renders ${ROWS} rows that pass setValue to memo inputs`, () => {
    for(const { version, useRowField } of VERSIONS) {
        const List = createList(createMemoInputRow(useRowField));
        const { form, root } = mountList(List);
        let tick = 0;

        bench(version, () => {
            tick++;
            flushSync(() => root.render(<List form={form} tick={tick} />));
        }, BENCH_OPTIONS);
    }
});
