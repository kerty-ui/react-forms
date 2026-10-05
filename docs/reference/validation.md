# Validation

How to describe validation rules, run them, and show the results. The form methods that run validation and apply results are described in [KertyForm › Validation](kerty-form.md#validation).

## Contents

- [Overview](#overview)
- [Messages and severity](#messages-and-severity)
- [Validator modes](#validator-modes)
- [Schema validator](#schema-validator): `Validator`, `FieldValidations`, `ValidatorBuilder`
- [Message-driven validators](#message-driven-validators): `SingleMessageDrivenValidator`, `MultiMessageDrivenValidator`
- [Custom validators](#custom-validators)
- [Applying results from elsewhere](#applying-results-from-elsewhere): `ValidationResult`, `SingleMessageResult`, `SingleMessageResults`, `MultiMessageResults`
- [Showing results](#showing-results)
- [Check helpers](#check-helpers): `Validations`

## Overview

A form gets a validator through its options:

```tsx
const form = useForm<Person>({ validator: () => personValidator() });
```

`validator` can be a validator, or a function that returns one. The function is called once, when the form is created.

Validation runs:

- when you call `form.validate()`, usually on submit;
- after a value change, once the field or the form has been validated (see [Revalidation](kerty-form.md#revalidation-after-a-change)).

Results can also be applied without a validator, for example errors from a server, with `form.applyValidationResults` and the related methods.

Async validation isn't supported. Run async checks yourself and apply their results.

## Messages and severity

A validation result is a list of messages. Each message has a `text` and a `severity`:

| Severity | Makes the field invalid |
|---|---|
| `Severity.Error` (default) | yes |
| `Severity.Warning` | no |
| `Severity.Info` | no |
| `Severity.Success` | no |

A field is invalid only when its result has an error. Warnings and other messages are shown but don't block `validate().isValid`.

`result.has(severity)` tells whether the result contains a message of that severity:

```ts
const result = form.getValidationResult("password");
if(result?.has(Severity.Warning)) { ... }
```

## Validator modes

Every validator has a `mode`, which tells the form how to apply what it returns after a value change.

| Mode | The validator returns | Used by |
|---|---|---|
| `fieldDriven` | After a change, every field it checked, including valid ones with an empty result. Fields it doesn't return keep their results. | `Validator` |
| `messageDriven` | Only fields that have messages. All other fields are cleared first. | `SingleMessageDrivenValidator`, `MultiMessageDrivenValidator` |

`fieldDriven` validators can check only the changed field and the fields that depend on it. `messageDriven` validators check everything on every run, which is simpler to write and fine for small forms.

## Schema validator

### `Validator`

A `fieldDriven` validator built from a schema that mirrors the data:

```ts
type Person = {
    name: string;
    email: string;
    address: { city: string };
    phoneNumbers: string[];
    children: { name: string }[];
};

const personValidator = () => new Validator<Person>({
    _name: new FieldValidations({ check: ctx => Validations.IsTextEmpty(ctx.value), message: "Name is required" }),
    _email: new FieldValidations([
        { check: ctx => Validations.IsTextEmpty(ctx.value), message: "Email is required", stop: true },
        { check: ctx => !ctx.value?.includes("@"), message: "Email is not valid" },
    ]),
    address: {
        _city: new FieldValidations({ check: ctx => Validations.IsTextEmpty(ctx.value), message: "City is required" }),
    },
    phoneNumbers: [
        new FieldValidations({ check: ctx => Validations.IsTextEmpty(ctx.value), message: "Phone is required" }),
    ],
    children: [{
        _name: new FieldValidations({ check: ctx => Validations.IsTextEmpty(ctx.value), message: "Name is required" }),
    }],
});
```

Schema keys:

| Key | Value | Validates |
|---|---|---|
| `_field` | `FieldValidations` | The field itself. |
| `field` | a nested schema | The fields of an object. |
| `field` | `[FieldValidations]` | Every item of an array of values. |
| `field` | `[{ ...schema }]` | The fields of every item of an array of objects. |

The schema is copied when the validator is created, so changing it later has no effect.

`new Validator(schema, options?)` takes one option:

| Option | Default | Effect |
|---|---|---|
| `addMessageWhenCheckIs` | `true` | Adds the message when `check` returns this value. With `false`, `check` describes the valid case instead. |

### Rules

Each rule passed to `FieldValidations` is an object:

| Property | Meaning |
|---|---|
| `check(ctx)` | Returns `true` when the message should be added (with the default `addMessageWhenCheckIs`). |
| `message` | The message text, or a function of `ctx` that returns it. |
| `severity` | The message severity. Defaults to `Severity.Error`. |
| `stop` | When the rule adds its message, the field's remaining rules are skipped. |
| `when(ctx)` | The rule runs only when this returns `true`. |
| `ruleSet` | The rule runs only when `validate` is called with this rule set. Rules without a rule set always run. |
| `hasDependency` | The field depends on other fields, so it's validated again after any change in the form. |

Rules run in order. `ctx` contains:

| Property | Meaning |
|---|---|
| `value` | The field's value. |
| `parent` | The object that holds the field. For an array item, such as a `tags[]` rule, it's the object that holds the array; the array itself is `ctx.parent.tags`. |
| `parentContext` | The context of the object or array that holds the field, or `undefined` at the form data. Follow it up to reach every ancestor; see below. |
| `data` | The whole form data. |
| `fieldName` | The full field name, for example `children[2].name`. |

`parentContext` links each context to the one above it, so a rule can read any ancestor, not only the closest object. Unlike `parent`, the chain also passes through arrays. For a field `orders[0].lines[1].qty`:

| Expression | Value |
|---|---|
| `ctx.parentContext.value` | `orders[0].lines[1]`, the line |
| `ctx.parentContext.parentContext.value` | `orders[0].lines`, the array of lines |
| `ctx.parentContext.parentContext.parentContext.value` | `orders[0]`, the order |

A line rule that needs a setting of its order:

```ts
orders: [{
    lines: [{
        _qty: new FieldValidations({
            check: ctx => ctx.value > ctx.parentContext!.parentContext!.parentContext!.value.maxQty,
            message: "Quantity is above the order limit",
        }),
    }],
}],
```

The contexts are only valid while the rule runs. Don't store them: a stored context keeps its whole chain in memory.

A field that depends on another field needs `hasDependency`, or it won't be validated again when the other field changes:

```ts
_confirmPassword: new FieldValidations({
    check: ctx => ctx.value !== ctx.parent.password,
    message: "Passwords must match",
    hasDependency: true,
}),
```

A rule with `when` is treated the same way, because its condition may depend on other fields.

### Rule sets

Rule sets let one validator serve several situations, such as saving a draft and submitting:

```ts
_email: new FieldValidations([
    { check: ctx => !ctx.value?.includes("@"), message: "Email is not valid" },
    { check: ctx => Validations.IsTextEmpty(ctx.value), message: "Email is required", ruleSet: "submit" },
]),
```

```ts
form.validate();          // runs only rules without a rule set
form.validate("submit");  // also runs rules in the "submit" set
```

Revalidation after a change uses the rule set of the last `validate` call.

### What runs after a change

After a change to a field, `Validator` checks only:

- the changed field;
- the fields inside it, when an object or array was replaced;
- fields with a `hasDependency` or `when` rule.

### `ValidatorBuilder`

Builds the same validator with field names instead of a nested schema. Array items are written as `[]`:

```ts
const personValidator = () => new ValidatorBuilder<Person>()
    .setup(b => {
        b.validationFor("name")
            .add({ check: ctx => Validations.IsTextEmpty(ctx.value), message: "Name is required" });
        b.validationFor("children[].name")
            .add({ check: ctx => Validations.IsTextEmpty(ctx.value), message: "Name is required" });
    })
    .build();
```

`validationFor` returns the same builder for the same name, so rules can be added in several places. `new ValidatorBuilder(options?)` takes the same options as `Validator`.

## Message-driven validators

A single function that checks the data and sets messages. It runs in full on every validation:

```ts
const loginValidator = () => new SingleMessageDrivenValidator<LoginModel>((result, { data }) => {
    if(!data.username) {
        result.setFieldMessage("username", "Username is required");
    }
    if(!data.password) {
        result.setFieldMessage("password", "Password is required");
    }
});
```

The function receives:

- `result`, to set messages;
- `{ data, ruleSet }`, the form data and the rule set passed to `validate`.

| Validator | Method | Messages per field |
|---|---|---|
| `SingleMessageDrivenValidator` | `setFieldMessage(name, text, severity?)` | One; a later call replaces the earlier one. |
| `MultiMessageDrivenValidator` | `addFieldMessage(name, text, severity?)` | Many; each call adds one. |

Both validators set field messages only. For a form-level message, use `form.applyValidationResult`.

## Custom validators

Any object that implements `IValidator<TData>` can be used:

```ts
const validator: IValidator<Person> = {
    mode: "messageDriven",
    validate: ({ data, fieldName, ruleSet }) => {
        const results = new Map<string, IValidationResult>();
        if(!data.name) {
            results.set("name", new SingleMessageResult("Name is required"));
        }
        return results;
    },
};
```

`validate` receives:

| Property | Meaning |
|---|---|
| `data` | The form data. |
| `fieldName` | The changed field, or `undefined` when the whole form is validated. |
| `ruleSet` | The rule set passed to `form.validate`. |

It returns results keyed by field name. Follow the rules of the chosen [mode](#validator-modes). A result under the key `""` is applied to the form when `validate` is called; after a change it's ignored.

## Applying results from elsewhere

These classes build results to pass to `form.applyValidationResult`, `form.applyFieldValidationResult` and `form.applyValidationResults`.

### `ValidationResult`

A result that can hold several messages:

| Method | Effect |
|---|---|
| `set(message)` | Replaces all messages with one. |
| `add(message)` | Adds a message. |
| `merge(result)` | Adds the messages of another result. |
| `replace(result)` | Replaces all messages with those of another result. |
| `has(severity)` | Whether a message of that severity exists. `has(Severity.None)` is `true` when there are no messages. |

```ts
form.applyValidationResult(new ValidationResult().set({
    text: "Username or password is incorrect",
    severity: Severity.Error,
}));
```

### `SingleMessageResult`

A result with one message that can't be changed:

```ts
form.applyFieldValidationResult("email", new SingleMessageResult("Email is already taken"));
```

### `SingleMessageResults` and `MultiMessageResults`

Maps of results, for `form.applyValidationResults`. They also track `isValid`, which is `false` once any error message is added.

| Class | Field message | Form message | Messages per key |
|---|---|---|---|
| `SingleMessageResults` | `setFieldMessage(name, text, severity?)` | `setFormMessage(text, severity?)` | One |
| `MultiMessageResults` | `addFieldMessage(name, text, severity?)` | `addFormMessage(text, severity?)` | Many |

```ts
const response = await api.save(form.getData());
if(!response.ok) {
    const results = new SingleMessageResults<Person>();
    for(const error of response.errors) {
        results.setFieldMessage(error.field, error.message);
    }
    form.applyValidationResults(results);
}
```

## Showing results

Field results are part of the field snapshot:

```tsx
const [field] = useField<Person, "email">({ name: "email" });
const message = field.validationResult?.messages[0];
```

The form's own result is returned by `useFormWatch`, `useFormValidationResult`, or the `FormValidationResult` component. The component renders its children only when the form has a result:

```tsx
<FormValidationResult form={form}>
    {result => result.messages.map((m, i) => <p key={i}>{m.text}</p>)}
</FormValidationResult>
```

Outside React, use `form.getValidationResult(name?)`, `form.getValidationMessage(name?)` and `form.getInvalidFields()`.

## Check helpers

`Validations` has static checks for use in rules. Each returns `true` when its condition holds.

Checks that compare a value with a limit return `false` for `null` and `undefined`. Pair them with an empty check that has `stop: true`, so an empty field gets the "required" message instead:

```ts
_name: new FieldValidations([
    { check: ctx => Validations.IsTextEmpty(ctx.value), message: "Required", stop: true },
    { check: ctx => Validations.IsShorterThan(ctx.value, 3), message: "Min 3 characters" },
]),
```

| Group | Checks |
|---|---|
| Nil | `IsNil`, `IsNotNil` |
| Text | `IsTextEmpty`, `IsTextNotEmpty`, `IsTextEmptyOrWhitespace`, `IsTextNotEmptyOrWhitespace`, `Contains`, `DoesNotContain`, `DoesNotMatch` |
| Arrays | `IsArrayEmpty`, `IsArrayNotEmpty` |
| Length (text and arrays) | `IsShorterThan`, `IsLongerThan` |
| Numbers | `IsLessThan`, `IsLessOrEqualThan`, `IsGreaterThan`, `IsGreaterOrEqualThan`, `IsBetween`, `IsNotBetween` |
| Dates | `IsDateEmpty`, `IsDateNotEmpty`, `IsInvalidDate`, `IsBefore`, `IsAfter`, `IsDateBetween`, `IsDateNotBetween`, `IsInThePast`, `IsInTheFuture`, `IsBeforeToday`, `IsAfterToday`, `IsToday` |

Day-based date checks (`IsBeforeToday`, `IsAfterToday`, `IsToday`) ignore the time and use the local time zone.
