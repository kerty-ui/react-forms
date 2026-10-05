# Concepts

The ideas behind `@kerty-ui/react-forms`: how the form holds data, which fields it tracks, what field state means and when components are notified. The API itself is in the reference:

- [KertyForm](reference/kerty-form.md): the form object;
- [Hooks](reference/hooks.md): creating forms and subscribing components;
- [Validation](reference/validation.md): validators and results;
- [Configuration](reference/config.md): form options.

## Contents

- [The form](#the-form)
- [Field names](#field-names)
- [Immutable data](#immutable-data)
- [Tracked fields](#tracked-fields)
- [Field state](#field-state)
- [Notifications](#notifications)
- [Arrays](#arrays)
- [Validation lifecycle](#validation-lifecycle)
- [What the library doesn't do](#what-the-library-doesnt-do)

## The form

A form is an object that lives outside React. It holds:

- the **data**, a plain object or tree of objects and arrays;
- the **initial data**, used to decide what's dirty;
- the **state** of the form and of its fields: dirty, touched, valid, validated;
- the **validation results** of the form and of its fields.

Components never change these directly. They call form methods such as `setFieldValue`, and subscribe to the parts they show. The form works out which subscribers are affected by each change and notifies only them.

```
component ──setFieldValue──▶ form ──notify──▶ subscribed components
```

Because the form isn't React state, a component that creates it with `useForm` doesn't re-render when the data changes. Only components that subscribe do. This is what lets a large form re-render one field at a time.

## Field names

A field is named by its path in the data, using dots for properties and `[index]` for array items:

```ts
"name"
"address.city"
"persons[0].phoneNumbers[1]"
```

Any value in the data is a field, including objects and arrays: `"address"` and `"persons[0]"` are fields too, and the parents of `"address.city"` and `"persons[0].name"`.

With a typed form, names are checked by TypeScript and completed by the editor. A name may point to a value that doesn't exist yet; setting it creates the missing objects and arrays along the path. Spaces and non-numeric indexes throw an error. Data property names must not start with the form's reserved key prefix, `"."` by default; see [Reserved key prefix](reference/kerty-form.md#reserved-key-prefix).

`ValidatorBuilder` uses a different form for rules that apply to every item: `"persons[].name"`. See [ValidatorBuilder](reference/validation.md#validatorbuilder).

## Immutable data

The form never mutates data. Each change creates new objects and arrays along the changed path and reuses everything else:

```ts
const before = form.getData();
form.setFieldValue("address.city", "Riga");
const after = form.getData();

after !== before;                       // new root
after.address !== before.address;       // new object on the changed path
after.persons === before.persons;       // unchanged branch is reused
```

So a value read from the form can be compared by identity to tell whether it changed, which is what `useSyncExternalStore`, `React.memo` and `useMemo` rely on.

The object passed as `data` is kept without copying. Don't mutate it, or any object read from the form: the form would not notice the change, and the initial data used for dirty checks could change with it.

Values that aren't plain objects or arrays, such as dates or class instances, are stored as they are and treated as single values.

## Tracked fields

The form doesn't keep state for every value in the data. It tracks only the fields that need state:

- fields with a listener, usually because a component using `useField` is mounted;
- fields an operation has given state to: a changed, touched or validated field, or one that received a validation result.

A tracked field stops being tracked when its last listener is removed and it has nothing left to remember: it isn't dirty and has no validation state.

For a field that isn't tracked, `getFieldState` works out the state when asked: `isDirty` by comparing its value with the initial data, and defaults for the rest.

Tracking matters in a few places:

- the form state is built from tracked fields only, so an untracked field can't make the form dirty or invalid by itself;
- `touch()` without a name, `validate()` and `applyValidationResults` in `replace` mode act on tracked fields;
- a field mounted after `touch()` starts untouched. A field mounted after `validate()` is validated when it mounts (see [`addFieldListener`](reference/kerty-form.md#addfieldlistenername-listener-scope---void)).

## Field state

Each field has four flags:

| Flag | Meaning | Set by |
|---|---|---|
| `isDirty` | The value differs from the initial data. | Value changes. See [dirty checks](reference/config.md#dirtycheckenabled). |
| `isTouched` | The user has interacted with the field. | Value changes and `touch`. Cleared when the field's last listener is removed. |
| `isValidated` | The field has been validated since its results were last reset. | `validate`, revalidation after a change, applied results. |
| `isValid` | The field has no error message. Warnings don't count. | Validation. |

A field that hasn't been validated is valid: `isValid` is only `false` when there's an error to show.

A field is dirty when anything inside it is: changing `"address.city"` also makes a tracked `"address"` dirty. Changing a value back to the initial one makes it clean again.

The form state has the same four flags:

| Flag | The form is… |
|---|---|
| `isDirty` | dirty when any tracked field is dirty. |
| `isTouched` | touched once any field has been touched. |
| `isValidated` | validated after `validate` or applied results, until results are reset or a change clears them. |
| `isValid` | invalid when any tracked field is invalid, or the form's own validation result has an error. |

`reset()` clears all state and validation and restores the initial data.

## Notifications

A listener is notified when something it subscribed to changes, and not otherwise.

Form listeners (`addListener`, and hooks such as `useFormWatch` and `useDataWatch`) choose any of three kinds of change: data, form state and validation.

Field listeners (`addFieldListener`, and hooks such as `useField`) are notified when:

- the field's value changes, directly or because an ancestor was replaced;
- the field's state or validation result changes;
- something inside the field changes, depending on the listener's scope:

| Scope | Notified for changes in |
|---|---|
| `"self"` (default) | nothing below the field |
| `"child"` | direct children |
| `"descendants"` | anything below the field |

```tsx
const [address] = useField<Person, "address">({ name: "address", listen: "child" });
// re-renders when address.city changes, but not when address.geo.lat changes
```

A change that doesn't change anything, such as touching a field that's already touched, notifies nobody.

Methods that change values take a `silent` argument. A silent change updates data, state and validation but notifies nobody and doesn't mark anything touched. Use it for programmatic changes that the user didn't make and the UI doesn't need to show straight away.

## Arrays

Array methods such as `appendItems` and `removeItems` replace the whole array, so:

- the array field is the one marked touched;
- every listener inside the array is notified, as for any replaced ancestor;
- with the default `"self"` scope, a component watching the array itself re-renders on every array method.

Field state follows the items. When items are inserted, removed or moved, the state and validation results of each item and everything inside it move with the item, and the state of removed items is dropped. A touched or invalid row stays touched or invalid after another row is removed above it.

React state doesn't follow the items by itself: it moves with the `key`. Key rows by an id stored in the item, not by the index. See [`useArrayField`](reference/hooks.md#usearrayfield-name-form-listen--field-form).

An array inside an array item, such as `projects[0].tasks`, works the same way at every level. See [Lists inside lists](reference/hooks.md#lists-inside-lists) for a worked example.

When several items are removed in one call, each index refers to the array before the call.

## Validation lifecycle

1. **Before validation**, every field is valid and not validated, and nothing is shown.
2. **`validate()`** runs the validator on the whole form. The form and every tracked field become validated. Usually called on submit.
3. **After a change**, once the field or the form has been validated, the changed field is validated again. Messages appear and disappear as the user edits.
4. **Results from elsewhere**, such as a server, are added with `applyValidationResults` and the related methods.
5. **`resetValidationResults()`** or **`reset()`** go back to step 1.

The form also has its own validation result, separate from field results, for messages that don't belong to a field, such as "Username or password is incorrect". By default it's cleared on the next change.

See [Validation](reference/validation.md) for validators, and [KertyForm › Validation](reference/kerty-form.md#validation) for the methods.

## What the library doesn't do

- **Submitting:** call `validate()` and your API yourself, then apply any errors you get back.
- **Async validation:** run async checks yourself and apply their results.
- **Rendering:** there are no input components. Use your own, and connect them with `useField` or `setFieldValue`.
