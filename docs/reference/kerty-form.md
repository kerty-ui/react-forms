# KertyForm

`IKertyForm<TData>` is the form object. It holds the form data, the form and field state, and the validation results, and it notifies listeners when any of them change.

You usually get it from a hook:

```tsx
const form = useForm<Person>({ data: initialPerson });
const [form, data, state, validationResult] = useFormWatch<Person>({ data: initialPerson });
```

You can also create one directly with `new KertyForm<Person>(options)`.

## Contents

- [Basics](#basics)
- [Reading data and state](#reading-data-and-state)
- [Changing values](#changing-values)
- [Array items](#array-items)
- [Touch and reset](#touch-and-reset)
- [Listeners](#listeners)
- [Validation](#validation)
- [Configuration](#configuration)

## Basics

Field names, immutable data, tracked fields and field state are explained in [Concepts](../concepts.md).

### `silent`

Methods that change values take an optional `silent` argument. When it's `true`:

- listeners aren't notified;
- the field and the form aren't marked touched.

Data, dirty state and validation are still updated. Read them directly, or wait for the next notification.

### Reserved key prefix

The form stores field state in a tree that mirrors the data. A field's state is kept under its property name with a prefix, `INTERNAL_NAME_PREFIX`, and an array item's own state under the prefix alone. **Data property names must not start with the prefix**; such a property would share a key with another field's state.

The default prefix is `"."`. A dot always separates the parts of a field name, so no part can start with one, and the default can't collide with any data.

Change it with `setInternalNamePrefix` only when you need a different prefix. Call it once, at application start, before any form is created. Each form caches the prefixed keys when it first uses a field name, so changing the prefix while forms exist breaks their state.

```ts
import { setInternalNamePrefix } from "@kerty-ui/react-forms";

setInternalNamePrefix("~");
```

Choose a prefix that no data property starts with. Avoid `"#"` with XML converted to JSON: converters such as fast-xml-parser store element text under `"#text"`.

## Reading data and state

### `getData(): TData`

Returns the current form data.

### `getState(): FormState`

Returns the form state. The same object is returned until the state changes.

### `getSnapshot(): () => FormSnapshot<TData>`

Returns a function that reads `{ data, state, validationResult }`. The function returns the same snapshot object until one of those changes, so it can be used with `useSyncExternalStore`:

```ts
const read = form.getSnapshot();
const snapshot = useSyncExternalStore(form.addListener.bind(form), read);
```

### `getFieldValue(name)`

Returns the field's value, or `undefined` when the path doesn't exist.

### `getFieldState(name): FieldState`

Returns the field's state. See [Tracked fields](../concepts.md#tracked-fields) for fields the form doesn't track.

### `getFieldSnapshot(name): () => FieldSnapshot`

Returns a function that reads the field's state together with its `value` and `validationResult`. Like `getSnapshot`, it returns the same object until something in it changes. The field doesn't need to exist in the data.

## Changing values

Every value change:

1. replaces the data along the field's path;
2. updates the dirty state of the field, its tracked ancestors and its tracked descendants;
3. marks the field and form touched (unless `silent`, or `trackTouchOnValueChange` is off);
4. clears the form's own validation result (unless `clearFormValidationResultsOnChange` is off);
5. validates the field again if the field or the form has been validated (see [Revalidation](#revalidation-after-a-change));
6. notifies the listeners affected by the change (unless `silent`).

### `setFieldValue(name, value, silent?)`

Sets the field's value. Missing parent objects and arrays along the path are created.

```ts
form.setFieldValue("address.city", "Riga");
form.setFieldValue("persons[2].name", "Anna");
```

The value is stored as it is. Setting an object replaces the whole object, so it isn't merged.

### `clearFieldValue(name | name[], silent?)`

Sets each named field to `undefined`. The key stays in its parent object, and an array item keeps its place, so the other items keep their indexes.

### `removeFieldValue(name | name[], silent?)`

Removes each named field from the data:

- an object property is deleted;
- an array item is removed as by [`removeItems`](#removeitemsname-index--index-silent), so the items after it move to lower indexes, and so does their field state.

With several names, each name refers to the field it named before the call:

```ts
// Removes the original items 0 and 2.
form.removeFieldValue(["persons[0]", "persons[2]"]);
```

Names of fields that don't exist are ignored, and nothing is notified for them.

## Array items

These methods take the name of an array field. Adding items to an array that doesn't exist yet creates it. If the value at that path isn't an array, or an index is outside the array, nothing happens.

The array field itself is the one that changes: it's the field marked touched, and its field listener is notified. Item and descendant listeners are notified as for any replaced ancestor.

Field state follows the items: when items move, the state of each item and its descendants moves with it, and the state of removed items is dropped. This keeps touched fields and validation messages attached to the right rows.

All of them take an optional `silent` argument.

### `prependItems(name, value | value[], silent?)`

Adds one or more items to the start of the array.

### `appendItems(name, value | value[], silent?)`

Adds one or more items to the end of the array.

### `insertItems(name, index, value | value[], silent?)`

Inserts one or more items at `index`. `index` may equal the array length, which appends.

### `removeItems(name, index | index[], silent?)`

Removes the items at the given indexes. Like `removeFieldValue`, each index refers to the item before the call. Duplicate and out-of-range indexes are ignored.

```ts
// Removes the original items 1 and 3.
form.removeItems("persons", [1, 3]);
```

### `swapItem(name, fromIndex, toIndex, silent?)`

Swaps two items.

### `moveItem(name, fromIndex, toIndex, silent?)`

Moves the item at `fromIndex` to `toIndex`, shifting the items in between.

### `updateItem(name, index, value, silent?)`

Replaces the item at `index`. The item keeps its field state.

## Touch and reset

### `touch(name?)`

Marks the named field and the form as touched. Without `name`, it marks every tracked field and the form. Fields mounted later start untouched. Nothing is notified when everything was already touched.

### `reset(data?)`

Resets the form:

- the data goes back to the initial data;
- all field and form state is cleared;
- all validation results are removed, and so is the rule set used by the last `validate`.

When `data` is given, it becomes the new initial data, kept without copying. Every listener is notified.

## Listeners

### `addListener(listener, options?): () => void`

Subscribes to form changes. Returns a function that unsubscribes.

`options` picks which kinds of change notify the listener. All three default to `true`:

| Option | Notified when |
|---|---|
| `listenDataChange` | any value changes |
| `listenStateChange` | the form state changes |
| `listenValidationChange` | any validation result changes |

```ts
const unsubscribe = form.addListener(() => save(form.getData()), {
    listenDataChange: true,
    listenStateChange: false,
    listenValidationChange: false,
});
```

### `addFieldListener(name, listener, scope?): () => void`

Subscribes to changes of one field. Returns a function that unsubscribes. This is what `useField` uses.

The listener is notified when:

- the field's value changes, including when an ancestor is replaced;
- the field's state or validation result changes;
- a child changes, depending on `scope`:

| `scope` | Children that notify |
|---|---|
| `"self"` (default) | none |
| `"child"` | direct children |
| `"descendants"` | any depth |

Adding the first listener makes the field tracked. If the form has already been validated, the field is validated straight away. The exception is a `messageDriven` validator with `keepValidationResultsWithoutListeners` on: then the results of the last run are kept.

Removing the last listener:

- clears the field's touched state;
- clears its validation result too, when `keepValidationResultsWithoutListeners` is off.

## Validation

### `setValidator(validator | undefined)`

Sets the validator used by `validate` and by revalidation after changes. `undefined` removes it. Existing results stay until the next validation or reset.

### `validate(ruleSet?): FormValidateResult`

Clears all validation results and runs the validator on the whole form. With `ruleSet`, the validator uses only the rules in that set; later revalidations after changes use the same set.

Returns `{ isValid, invalidFields }`. Afterwards the form and every tracked field are marked validated; fields without messages count as valid.

When `cacheValidationResult` is on (the default), calling `validate` again with the same `ruleSet` and no change in between returns the previous result without running the validator.

```ts
const onSubmit = () => {
    if(form.validate().isValid) {
        send(form.getData());
    }
};
```

### Revalidation after a change

Once a field or the form has been validated, a value change validates that field again:

- **`fieldDriven` validator:** the changed field's result is cleared, then the validator runs for that field. Only the fields it returns are updated.
- **`messageDriven` validator:** all field results are cleared first, then the validator runs for the changed field.

Without a validator, changing a validated field clears its validation result and marks the form not validated.

### `applyValidationResult(result, options?)`

Applies a result to the form itself, for example a server error that doesn't belong to a field.

```ts
form.applyValidationResult(new ValidationResult().set({
    text: "Username or password is incorrect",
    severity: Severity.Error,
}));
```

### `applyFieldValidationResult(name, result, options?)`

Applies a result to one field.

### `applyValidationResults(results, options?)`

Applies several results at once, keyed by field name. The key `""` is the form itself.

`options.mode`:

| Mode | Effect |
|---|---|
| `"patch"` (default) | Replaces the results of the given fields; other fields keep theirs. |
| `"merge"` | Adds the given messages to the existing ones. |
| `"replace"` | Removes all results first. Every tracked field is marked validated, so fields without messages count as validated and valid. |

`options.unknownFieldBehavior` decides what happens to results for fields the form doesn't track:

- `"add"` (default): the field becomes tracked and gets the result;
- `"ignore"`: the result is skipped.

A result with no messages marks the field validated and valid. Each field with a result is marked validated, and so is the form.

### `resetValidationResults()`

Removes all validation results, from the form and every field. The form and fields are no longer validated.

### `resetFieldValidationResults(name | name[])`

Removes the validation results of the named fields. Those fields are no longer validated.

### `getValidationResult(name?)`

Returns the field's validation result, or the form's own result when `name` is omitted. A field without messages has no result.

### `getValidationMessage(name?)`

Returns the first message of the field's validation result, or of the form's when `name` is omitted.

### `getInvalidFields(): string[]`

Returns the names of the tracked fields that are invalid.

## Configuration

### `updateConfiguration(config)`

Changes the given options; omitted options keep their values. Changing `dirtyCheckEnabled` or `dirtyCheckNullAsDefault` recalculates dirty state and notifies affected listeners.

The same options can be passed when the form is created. See [Configuration](config.md) for what each option does.
