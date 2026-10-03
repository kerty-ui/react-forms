import { memo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { bench, describe } from "vitest";
import { KertyForm, useDataWatch, useFieldWatch, type FieldListenerScope, type IKertyForm } from "../../src/lib";

type Person = { name: string; email: string };
type Persons = { persons: Person[] };

const ROWS = 1_000;
const EDITED_PATH = `persons[${ROWS / 2}].name`;

const createPersons = (rows: number): Persons => ({
    persons: Array.from({ length: rows }, (_, row) => ({ name: `name${row}`, email: `email${row}` })),
});

const PersonRow = ({ form, index }: { form: IKertyForm<Persons>; index: number }) => {
    const name = useFieldWatch<string>(form, `persons[${index}].name`);
    const email = useFieldWatch<string>(form, `persons[${index}].email`);
    return (
        <div>
            <input value={name.value ?? ""} onChange={e => form.setFieldValue(`persons[${index}].name`, e.target.value)} />
            <input value={email.value ?? ""} onChange={e => form.setFieldValue(`persons[${index}].email`, e.target.value)} />
        </div>
    );
};

const MemoPersonRow = memo(PersonRow);

type ListProps = { form: IKertyForm<Persons>; scope?: FieldListenerScope };

const FieldList = ({ form, scope }: ListProps) => {
    const persons = useFieldWatch<Person[]>(form, "persons", scope);
    return <>{persons.value?.map((_, index) => <PersonRow key={index} form={form} index={index} />)}</>;
};

const FieldMemoList = ({ form, scope }: ListProps) => {
    const persons = useFieldWatch<Person[]>(form, "persons", scope);
    return <>{persons.value?.map((_, index) => <MemoPersonRow key={index} form={form} index={index} />)}</>;
};

const LengthMemoList = ({ form }: ListProps) => {
    const length = useDataWatch(form, data => data.persons.length);
    return <>{Array.from({ length }, (_, index) => <MemoPersonRow key={index} form={form} index={index} />)}</>;
};

const mount = (List: (props: ListProps) => ReactNode, scope?: FieldListenerScope) => {
    const form = new KertyForm<Persons>({ data: createPersons(ROWS) });
    const root = createRoot(document.createElement("div"));
    flushSync(() => root.render(<List form={form} scope={scope} />));
    let edit = 0;
    return () => {
        edit++;
        flushSync(() => form.setFieldValue(EDITED_PATH as any, `edited${edit}`));
    };
};

const SCOPES: FieldListenerScope[] = ["self", "child", "descendants"];

const LISTS = [
    { name: "plain rows", List: FieldList },
    { name: "memo rows", List: FieldMemoList },
];

for(const { name, List } of LISTS) {
    const edits = SCOPES.map(scope => [`useFieldWatch(persons, ${scope})`, mount(List, scope)] as const);
    const editInLengthMemoList = mount(LengthMemoList);

    describe(`one name edit, ${ROWS} rows, ${name} – render cost by list scope`, () => {
        for(const [benchName, edit] of edits) {
            bench(benchName, edit);
        }

        bench("useDataWatch(length) + memo rows", editInLengthMemoList);
    });
}
