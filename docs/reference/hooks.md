# Hooks

React hooks for creating a form and subscribing components to it. The form object they work with is described in [KertyForm](kerty-form.md).

## Contents

- [Choosing hooks](#choosing-hooks)
- [Creating a form](#creating-a-form): `useForm`, `useFormWatch`
- [Sharing a form](#sharing-a-form): `FormProvider`, `useFormContext`
- [Field hooks](#field-hooks): `useField`, `useArrayField`
- [Field components](#field-components): `FormField`, `FormArrayField`
- [Lists inside lists](#lists-inside-lists)
- [Low-level field hooks](#low-level-field-hooks): `useFieldWatch`, `useFieldValue`, `useFieldState`
- [Form hooks](#form-hooks): `useWatch`, `useDataWatch`, `useStateWatch`, `useFormValidationResult`

## Choosing hooks

All hooks subscribe through `useSyncExternalStore`, so a component re-renders only when what it reads changes.

| Approach | Hooks | Re-renders |
|---|---|---|
| Form subscriber | `useFormWatch` | The whole form on any change. Simplest; fine for small forms. |
| Field subscriber | `useForm` + `useField` / `useArrayField` | Only the components whose field changed. Use for large forms, grids and lists. |

Both can be mixed: a form created with `useFormWatch` can still be passed to field components.

## Creating a form

### `useForm(options?): IKertyForm`

Creates a form on the first render and returns the same form on every render. The component itself doesn't subscribe to anything, so it never re-renders because of form changes.

```tsx
const PersonEditor = () => {
    const form = useForm<Person>({ data: initialPerson, validator: personValidator });
    return (
        <FormProvider value={form}>
            <NameField />
            <AddressFields />
        </FormProvider>
    );
};
```

`options` is read only on the first render; later changes are ignored. Use `form.updateConfiguration`, `form.setValidator` or `form.reset` to change them. See [Configuration](kerty-form.md#configuration) for the options.

### `useFormWatch(options?): [form, data, state, validationResult]`

Creates a form like `useForm` and subscribes the component to all of it. The component re-renders on every data, state or validation change.

```tsx
const LoginForm = () => {
    const [form, data, state, formValidationResult] = useFormWatch<LoginModel>();
    return (
        <input
            value={data.username ?? ""}
            onChange={e => form.setFieldValue("username", e.target.value)}
        />
    );
};
```

| Item | Contents |
|---|---|
| `form` | The form object. |
| `data` | The current data. |
| `state` | The form state. |
| `validationResult` | The form's own validation result, not field results. Read field results with `form.getValidationResult(name)`. |

## Sharing a form

### `FormProvider`

Makes a form available to the hooks below it, so components don't need a `form` prop.

```tsx
<FormProvider value={form}>
    <NameField />
</FormProvider>
```

### `useFormContext(defaultForm?): IKertyForm`

Returns the form from the nearest `FormProvider`. When there is no provider, it returns `defaultForm`, and throws if that's missing too.

`useField` and `useArrayField` use it to find their form, so their `form` prop is used only outside a `FormProvider`.

## Field hooks

### `useField({ name, form?, listen? }): [field, form]`

Subscribes the component to one field and returns its snapshot together with actions.

```tsx
const NameField = () => {
    const [field] = useField<Person, "name">({ name: "name" });
    return (
        <>
            <input
                value={field.value ?? ""}
                onChange={e => field.setValue(e.target.value)}
                onBlur={field.touch}
            />
            {field.validationResult?.messages[0]?.text}
        </>
    );
};
```

| Prop | Meaning |
|---|---|
| `name` | The field name. See [Field names](../concepts.md#field-names). |
| `form` | The form to use outside a `FormProvider`. |
| `listen` | Which child changes re-render the component: `"self"` (default), `"child"` or `"descendants"`. See [`addFieldListener`](kerty-form.md#addfieldlistenername-listener-scope---void). |

`field` contains:

| Member | Meaning |
|---|---|
| `value` | The field's value. |
| `isDirty`, `isTouched`, `isValid`, `isValidated` | The field state. |
| `validationResult` | The field's validation result, or `undefined` when it has no messages. |
| `setValue(value, silent?)` | Same as `form.setFieldValue(name, value, silent)`. |
| `touch()` | Same as `form.touch(name)`. |

While the component is mounted, the field is tracked by the form. When it unmounts and no other component listens to the field, the field's touched state is cleared. See [`addFieldListener`](kerty-form.md#addfieldlistenername-listener-scope---void).

`setValue` and `touch` are new functions on every render.

### `useArrayField({ name, form?, listen? }): [field, form]`

Like `useField`, for an array field. `field` also has the [array item methods](kerty-form.md#array-items) without the `name` argument: `prependItems`, `appendItems`, `insertItems`, `removeItems`, `swapItem`, `moveItem` and `updateItem`.

```tsx
type Contact = { id: number; phone: string };
type Person = { name: string; email: string; contacts: Contact[] };

const Contacts = () => {
    const [contacts] = useArrayField<Person, "contacts">({ name: "contacts" });
    return (
        <>
            {contacts.value?.map((contact, i) => (
                <ContactField key={contact.id} index={i} onRemove={() => contacts.removeItems(i)} />
            ))}
            <button onClick={() => contacts.appendItems({ id: nextContactId++, phone: "" })}>Add</button>
        </>
    );
};
```

With the default `listen: "self"`, the component re-renders when the array itself is replaced, which every array item method does. A change inside an item, such as `setFieldValue("contacts[0].phone", …)`, re-renders it only when it changes the array's state, for example making it dirty. Use `listen: "child"` to re-render on every item change.

**Key rows by an id stored in the item, not by the index.** The form moves field state (touched, dirty, validation messages) with the items when one is removed or moved, but React moves component state only with the `key`. With `key={i}`, removing row 0 hands row 0's React state, such as focus, an open popup or local `useState`, to the row that took its place. An array of plain values, such as `string[]`, has nowhere to keep an id; store objects instead when the rows can be removed or reordered.

## Field components

`FormField` and `FormArrayField` are `useField` and `useArrayField` as render-prop components. Use them when a field's markup is small enough to write inline, such as a table cell, and doesn't deserve a component of its own. Only the component's children re-render when the field changes; the component that renders `FormField` doesn't.

### `FormField`

Takes the same props as [`useField`](#usefield-name-form-listen--field-form). Its children are a function that receives `{ field, form }`, where `field` is the same object `useField` returns.

```tsx
<FormField form={form} name="email">
    {({ field }) => (
        <input
            value={field.value ?? ""}
            onChange={e => field.setValue(e.target.value)}
            onBlur={field.touch}
        />
    )}
</FormField>
```

With the `form` prop, the model type and the field name are inferred. Inside a `FormProvider` without the `form` prop, pass them explicitly, as for `useField`:

```tsx
<FormField<Person, "email"> name="email">
    {({ field }) => <input value={field.value ?? ""} onChange={e => field.setValue(e.target.value)} />}
</FormField>
```

### `FormArrayField`

Takes the same props as [`useArrayField`](#usearrayfield-name-form-listen--field-form), and its `field` has the same array item methods. It re-renders on the same changes as `useArrayField`.

```tsx
<FormArrayField form={form} name="contacts">
    {({ field }) => (
        <ul>
            {field.value?.map((contact, i) => (
                <li key={contact.id}>
                    <FormField form={form} name={`contacts[${i}].phone`}>
                        {({ field: phone }) => (
                            <input value={phone.value ?? ""} onChange={e => phone.setValue(e.target.value)} />
                        )}
                    </FormField>
                    <button onClick={() => field.removeItems(i)}>Remove</button>
                </li>
            ))}
        </ul>
    )}
</FormArrayField>
```

## Lists inside lists

An array inside an array item, such as the tasks of each project, is just another array field whose name contains the outer index: `` `projects[${projectIndex}].tasks` ``. Each level gets its own `FormArrayField` or `useArrayField`.

```tsx
type Task = { id: number; title: string; hours: number | null };
type Project = { id: number; name: string; tasks: Task[] };
type Plan = { projects: Project[] };

const PlanEditor = () => {
    const form = useForm<Plan>({ data: { projects: [newProject()] }, validator: planValidator });
    return (
        <FormProvider value={form}>
            <FormArrayField form={form} name="projects">
                {({ field }) => (
                    <>
                        {field.value?.map((project, projectIndex) => (
                            <ProjectEditor key={project.id} projectIndex={projectIndex} />
                        ))}
                        <button onClick={() => field.appendItems(newProject())}>Add project</button>
                    </>
                )}
            </FormArrayField>
        </FormProvider>
    );
};

const ProjectEditor = (props: { projectIndex: number }) => {
    const form = useFormContext<Plan>();
    const tasksName = `projects[${props.projectIndex}].tasks` as const;

    // The last task takes its project with it.
    const removeTask = (taskIndex: number) => {
        if (form.getData().projects[props.projectIndex].tasks.length === 1) {
            form.removeItems("projects", props.projectIndex);
        }
        else {
            form.removeItems(tasksName, taskIndex);
        }
    };

    return (
        <fieldset>
            <FormField form={form} name={`projects[${props.projectIndex}].name`}>
                {({ field }) => <input value={field.value ?? ""} onChange={e => field.setValue(e.target.value)} />}
            </FormField>
            <FormArrayField form={form} name={tasksName}>
                {({ field }) => (
                    <>
                        {field.value?.map((task, taskIndex) => (
                            <TaskEditor
                                key={task.id}
                                projectIndex={props.projectIndex}
                                taskIndex={taskIndex}
                                onRemove={removeTask}
                            />
                        ))}
                        <button onClick={() => field.appendItems(newTask())}>Add task</button>
                    </>
                )}
            </FormArrayField>
        </fieldset>
    );
};

const TaskEditor = (props: { projectIndex: number; taskIndex: number; onRemove: (taskIndex: number) => void }) => {
    const form = useFormContext<Plan>();
    return (
        <div>
            <FormField form={form} name={`projects[${props.projectIndex}].tasks[${props.taskIndex}].title`}>
                {({ field }) => (
                    <input value={field.value ?? ""} onChange={e => field.setValue(e.target.value)} onBlur={field.touch} />
                )}
            </FormField>
            <button onClick={() => props.onRemove(props.taskIndex)}>Remove</button>
        </div>
    );
};
```

Things to note:

- **Names built from template strings are still checked.** `` `projects[${i}].tasks[${j}].title` `` is checked against the model, so a misspelled property is a compile error. Add `as const` when you keep a name in a variable, as `tasksName` above, so it stays a literal type instead of widening to `string`.
- **Pass the form to the components when it comes from context.** `useFormContext<Plan>()` gives a typed form, and `form={form}` lets `FormField` and `FormArrayField` infer the model and check the name.
- **Key every level by the item's own id.** See [the note on keys](#usearrayfield-name-form-listen--field-form).
- **Read the current data in event handlers.** `removeTask` reads `form.getData()` when it runs, not a value captured at render, so it sees the latest task count.
- **An inner row can change an outer array.** Removing the project from `removeTask` re-renders the outer `FormArrayField`, which unmounts the project with its tasks. Field state of the remaining projects moves with them.
- **Validate every level with `[]`.** In `ValidatorBuilder`, `"projects[].tasks[].title"` applies to the title of every task of every project:

    ```ts
    const planValidator = () => new ValidatorBuilder<Plan>()
        .setup(b => {
            b.validationFor("projects[].name")
                .add({ check: ctx => Validations.IsTextEmpty(ctx.value), message: "Name is required" });
            b.validationFor("projects[].tasks[].title")
                .add({ check: ctx => Validations.IsTextEmpty(ctx.value), message: "Title is required" });
        })
        .build();
    ```

- **Derive totals with `useDataWatch`.** A total of one project's hours returns a number, so it needs no `isEqual`; hours per project return a new array and need `shallowEqual`. See [`useDataWatch`](#usedatawatchform-getvalue-isequal).

    ```tsx
    const hoursByProject = useDataWatch(
        form,
        d => d.projects.map(p => p.tasks.reduce((total, task) => total + (task.hours ?? 0), 0)),
        shallowEqual,
    );
    ```

## Low-level field hooks

These take the form as an argument and don't use `FormProvider`.

### `useFieldWatch(form, name, scope?): FieldSnapshot`

Subscribes to a field and returns its snapshot: value, state and validation result. `useField` is built on it.

### `useFieldValue(form, name, scope?)`

Subscribes to a field and returns only its value. The name isn't type-checked; pass the value type explicitly:

```ts
const city = useFieldValue<string>(form, "address.city");
```

### `useFieldState(form, name, scope?): FieldState`

Subscribes to a field and returns only its state.

## Form hooks

These take the form as an argument and don't use `FormProvider`.

### `useWatch(form): FormSnapshot`

Subscribes to the whole form and returns `{ data, state, validationResult }`. `useFormWatch` is built on it.

### `useDataWatch(form, getValue, isEqual?)`

Subscribes to data changes and returns `getValue(data)`. The component re-renders only when the returned value changes.

```tsx
const rowCount = useDataWatch(form, d => d.rows.length);
```

When `getValue` returns a new object on every call, pass `isEqual` so equal results keep the previous value:

```tsx
const names = useDataWatch(form, d => d.persons.map(p => p.name), shallowEqual);
```

`shallowEqual` and `deepEqual` are exported by the library. Which one to pass depends on what `getValue` returns:

| `getValue` returns | Pass | Examples |
|---|---|---|
| A primitive, or a value taken from the data as it is | nothing | `d => d.rows.length`, `d => d.rows` |
| A new array or object whose items are primitives or values taken from the data | `shallowEqual` | `d => d.rows.map(r => r.id)`, `d => d.rows.filter(r => r.isSelected)` |
| New objects created inside `getValue` | `deepEqual` | `d => d.rows.map(r => ({ id: r.id, total: r.a + r.b }))` |

Values taken from the data compare by identity because the data is [immutable](../concepts.md#immutable-data): an unchanged row is the same object after an unrelated change. That's why a filtered list of rows only needs `shallowEqual`. `deepEqual` walks the whole result after every data change, so keep what it compares small.

### `useStateWatch(form, getValue, isEqual?)`

Like `useDataWatch`, for the form state:

```tsx
const canSave = useStateWatch(form, s => s.isDirty && s.isValid);
```

### `useFormValidationResult(form)`

Subscribes to validation changes and returns the form's own validation result.
