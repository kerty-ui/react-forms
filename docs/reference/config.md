# Configuration

Options that change how a form tracks state and handles validation. They're all optional and default to `true`.

| Option | Effect |
|---|---|
| [`dirtyCheckEnabled`](#dirtycheckenabled) | Tracks dirty state. |
| [`dirtyCheckNullAsDefault`](#dirtychecknullasdefault) | Treats `""` and `[]` as empty in dirty checks. |
| [`trackTouchOnValueChange`](#tracktouchonvaluechange) | Marks fields touched when their value changes. |
| [`clearFormValidationResultsOnChange`](#clearformvalidationresultsonchange) | Clears the form's own validation result when any value changes. |
| [`keepValidationResultsWithoutListeners`](#keepvalidationresultswithoutlisteners) | Keeps a field's validation result after its last listener is removed. |
| [`cacheValidationResult`](#cachevalidationresult) | Reuses the last `validate` result while nothing has changed. |

## Setting options

Pass options when the form is created:

```tsx
const form = useForm<Person>({
    data: initialPerson,
    trackTouchOnValueChange: false,
});
```

Change them later with `updateConfiguration`. Options left out keep their current values:

```ts
form.updateConfiguration({ dirtyCheckEnabled: false });
```

Changing `dirtyCheckEnabled` or `dirtyCheckNullAsDefault` recalculates the dirty state of every tracked field and notifies the affected listeners. Other options take effect from the next operation.

The defaults are in the exported `defaultFormConfig`.

## `dirtyCheckEnabled`

Default: `true`

When on, a field is dirty when its value differs from the initial data, and the form is dirty when any tracked field is. See [Field state](../concepts.md#field-state).

When off, no field and no form is ever dirty. Turn it off when the form never shows or uses dirty state; every value change then skips comparing values with the initial data.

Values are compared deeply:

- dates are compared by time;
- objects are compared key by key, **in key order**. An object whose keys were added in a different order, or that has an extra key set to `undefined`, counts as changed.

## `dirtyCheckNullAsDefault`

Default: `true`

`null` and `undefined` always count as equal. When this option is on, `""` and `[]` count as equal to them too, at any depth.

This matters when the initial data leaves a field out but the input writes an empty value back:

```ts
const form = new KertyForm<Partial<Person>>({ data: {} });

form.setFieldValue("name", "Anna");
form.setFieldValue("name", "");

form.getFieldState("name").isDirty; // false; true when the option is off
```

## `trackTouchOnValueChange`

Default: `true`

When on, a value change marks the changed field and the form as touched, unless it's [`silent`](kerty-form.md#silent). For array methods, the array field is the one marked.

When off, fields become touched only through `touch`. Turn it off to show validation messages only after a field loses focus:

```tsx
const [field] = useField<Person, "email">({ name: "email" });

<input
    value={field.value ?? ""}
    onChange={e => field.setValue(e.target.value)}
    onBlur={field.touch}
/>
{field.isTouched && field.validationResult?.messages[0]?.text}
```

## `clearFormValidationResultsOnChange`

Default: `true`

When on, any value change removes the form's own validation result: the one set with `applyValidationResult` or under the `""` key. Field results aren't affected.

A form-level message usually describes the data as it was submitted, such as "Username or password is incorrect", so it no longer applies once the user edits anything. Turn this off when form-level messages should stay until you remove them with `applyValidationResult` or `resetValidationResults`.

## `keepValidationResultsWithoutListeners`

Default: `true`

Decides what happens to a field's validation when its last listener is removed, for example when its component unmounts:

| | On | Off |
|---|---|---|
| Field's validation result | kept | removed |
| Field counts as invalid in the form state | yes, while it has an error | no |
| `isTouched` | cleared | cleared |

It also affects what happens when a field gets its first listener after the form has been validated:

| Validator | On | Off |
|---|---|---|
| `fieldDriven` | the field is validated | the field is validated |
| `messageDriven` | the result from the last run is kept | the field is validated |

Keep it on when hidden fields still count, as with tabs or wizard steps: an error on a step that isn't shown keeps the form invalid. Turn it off when unmounted fields should no longer affect validity, for example fields hidden by a condition.

## `cacheValidationResult`

Default: `true`

When on, `validate` returns the previous result without running the validator again, as long as:

- it's called with the same rule set, and
- no value has changed, and no validation results or validator have been set or reset, since the last call.

This makes repeated `validate` calls cheap, for example when a submit handler runs twice before the user changes anything.

Turn it off when the validator reads anything outside the form data, such as other application state or the current time. The form can't see those changes, so a cached result could be out of date.
