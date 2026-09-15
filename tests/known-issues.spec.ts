import { describe, expect, it } from "vitest";
import { KertyForm } from "../src/lib/kertyForm";
import { isEqual } from "../src/lib/utils/isEqual";
import { FieldValidations, Validator } from "../src/lib/validation/validator";
import { ValidatorBuilder } from "../src/lib/validation/validatorBuilder";
import { MultiMessageResults } from "../src/lib/validation/multiMessageResults";
import { Validations } from "../src/lib/validation/validations";
import type { IValidationResult } from "../src/lib/types";

/**
 * Each test here asserts the behaviour the library *should* have and is marked
 * `it.fails`, so the suite stays green while the defect exists and starts failing the
 * moment it is fixed — at which point drop the `.fails` and move the test into the
 * matching spec file.
 *
 * These are genuine defects, not deliberate performance trade-offs. The deliberate
 * trade-offs (fields only notify downwards, `getFieldValue` needs a registered field,
 * `isEqual` compares keys positionally) are covered as designed behaviour in
 * kertyForm.listeners.spec.ts, kertyForm.spec.ts and isEqual.spec.ts.
 */

const textsFor = (result: Map<string, IValidationResult>, field: string) =>
    result.get(field)?.messages.map(m => m.text);

const isTextEmpty = (ctx: any) => Validations.IsTextEmpty(ctx.value);

// ─── 1. on-change validation never reaches array item fields ─────────────────

describe("Validator – array item fields on change", () => {
    it.fails("should revalidate the array item field when that field changes", () => {
        // `Validator.validate` normalises the incoming field name to `items[].name`, but
        // `#validateInternal` builds concrete names (`items[0].name`), so the equality
        // check never matches. Effect: a grid/repeater cell shows its error after an
        // explicit `validate()` but is never re-validated (nor cleared) while typing.
        const validator = new Validator<any>({
            items: [{ _name: new FieldValidations({ check: isTextEmpty, message: "Name is required" }) }],
        });

        const result = validator.validate({
            data: { items: [{ name: "" }] },
            fieldName: "items[0].name",
        });

        expect(textsFor(result, "items[0].name")).toEqual(["Name is required"]);
    });

    it.fails("should revalidate the inner array item when a nested array item changes", () => {
        // Same root cause one level deeper: the built name is `matrix[0][]`, the
        // normalised incoming name is `matrix[][]`.
        const validator = new Validator<any>({
            matrix: [[new FieldValidations({ check: isTextEmpty, message: "Cell is required" })]],
        });

        const result = validator.validate({
            data: { matrix: [["", "b"]] },
            fieldName: "matrix[0][0]",
        });

        expect(textsFor(result, "matrix[0][0]")).toEqual(["Cell is required"]);
    });

    it.fails("should keep the form invalid when an array item field is edited but still invalid", () => {
        // Worst downstream effect of the two cases above. On change the form eagerly
        // clears the field's error and removes it from `#invalidFields` *before* asking
        // the validator, expecting the validator to re-add it. Because the validator
        // never matches the indexed path it returns nothing, so a still-empty required
        // cell silently flips the whole form to valid and submit goes through.
        const form = new KertyForm<any>({
            data: { items: [{ name: "" }] },
            validator: new Validator<any>({
                items: [{ _name: new FieldValidations({ check: isTextEmpty, message: "Name is required" }) }],
            }),
        });
        form.addFieldListener("items[0].name", () => { });
        form.validate();

        form.setFieldValue("items[0].name", "");

        expect(form.getState().isValid).toBe(false);
    });
});

// ─── 2. ValidatorBuilder path registration is order dependent ────────────────

describe("ValidatorBuilder – mixing item and item-field rules", () => {
    it.fails("should keep the item field rule when the item rule was registered first", () => {
        // `#setObjectValue` hits the already-stored `FieldValidations` at the item slot,
        // `continue`s without descending, and then pushes the item-*field* rule onto the
        // array as a second item-level rule. The field rule is silently lost.
        // Registering `items[].brand` before `items[]` produces the correct schema.
        const validator = new ValidatorBuilder<{ items: { brand: string }[] }>()
            .setup((b) => {
                b.validationFor("items[]").add({ check: (ctx: any) => ctx.value == null, message: "Item is required" });
                b.validationFor("items[].brand").add({ check: isTextEmpty, message: "Brand is required" });
            })
            .build();

        const result = validator.validate({ data: { items: [{ brand: "" }] } });

        expect(textsFor(result, "items[0].brand")).toEqual(["Brand is required"]);
    });
});

// ─── 3. MultiMessageResults.addFormMessage ───────────────────────────────────

describe("MultiMessageResults.addFormMessage", () => {
    it.fails("should store the message once when called", () => {
        // The method stores a fresh ValidationResult holding the message and then adds
        // the very same message to it again.
        const results = new MultiMessageResults<any>().addFormMessage("Form failed");

        expect(results.get("")?.messages.map(m => m.text)).toEqual(["Form failed"]);
    });

    it.fails("should accumulate messages when called twice", () => {
        // The leading `this.set("", new ValidationResult()...)` discards whatever was
        // already stored, so a "multi message" collector keeps only the last form
        // message. `addFieldMessage` on the same class does this correctly.
        const results = new MultiMessageResults<any>()
            .addFormMessage("First")
            .addFormMessage("Second");

        expect(results.get("")?.messages.map(m => m.text)).toEqual(["First", "Second"]);
    });
});

// ─── 4. isEqual and repeated object references ───────────────────────────────

describe("isEqual – repeated references", () => {
    it.fails("should report the values as equal when one side reuses the same reference twice", () => {
        // The `visited` WeakSet exists for cycle detection but is consulted for *any*
        // repeated reference: on the second visit it returns
        // `visited.has(a) && visited.has(b)`, which is false whenever only one side
        // reuses the reference. Effect: a false "dirty" on shared lookup objects.
        const shared = { id: 1 };

        expect(isEqual({ from: shared, to: shared }, { from: { id: 1 }, to: { id: 1 } })).toBe(true);
    });
});

// ─── 5. form dirty flag survives the last dirty field unmounting ─────────────

describe("KertyForm – unsubscribing a dirty field", () => {
    it.fails("should recompute the form dirty flag when the last dirty field unsubscribes", () => {
        // The unsubscribe path drops the field from `#dirtyFields` and recomputes
        // `isValid`, but never recomputes `isDirty`. The form then reports itself dirty
        // with an empty dirty-field set until the next change happens to recompute it.
        const form = new KertyForm<any>({ data: { a: 1 } });
        const unsubscribe = form.addFieldListener("a", () => { });
        form.setFieldValue("a", 2);

        unsubscribe();

        expect(form.getState().isDirty).toBe(false);
    });
});

// ─── 6. prependItems does not guard against a null value ─────────────────────

describe("KertyForm.prependItems", () => {
    it.fails("should leave the array unchanged when the value is null", () => {
        // `appendItems` and `insertItems` both return early on a null value;
        // `prependItems` is missing the same guard and inserts the null.
        const form = new KertyForm<any>({ data: { items: ["a"] } });

        form.prependItems("items", null as any);

        expect(form.getData().items).toEqual(["a"]);
    });
});

// ─── 7. swapItem does not validate its indices ───────────────────────────────

describe("KertyForm.swapItem", () => {
    it.fails("should leave the array unchanged when an index is out of range", () => {
        // The swap writes through to `arrayValue[toIndex]`, growing the array and
        // filling the gap with empty slots instead of rejecting the call.
        const form = new KertyForm<any>({ data: { items: ["a", "b", "c"] } });

        form.swapItem("items", 0, 9);

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });
});

// ─── 8. touch() on an unregistered field is a silent no-op ───────────────────

describe("KertyForm.touch", () => {
    it.fails("should mark the form touched when called for a field that has no listener", () => {
        // `touch(name)` returns early when the field is unknown, skipping the
        // form-level flag that `touch()` without a name would have set. A blur handler
        // on a field rendered without `useField` therefore silently does nothing.
        const form = new KertyForm<any>({ data: { a: 1 } });

        form.touch("a");

        expect(form.getState().isTouched).toBe(true);
    });
});

// ─── 9. reading a validation result registers the field as a side effect ─────

describe("KertyForm.getFieldValidationResult", () => {
    it.fails("should not register the field when only its validation result is read", () => {
        // `getFieldValidationResult` goes through `#getField`, which creates and stores
        // the field entry. Reading `form.getFieldValidationMessage(name)` during render —
        // exactly what the wiki examples do — therefore grows `#fields` with entries that
        // have no listener and are never cleaned up.
        const form = new KertyForm<any>({ data: { a: 1 } });

        form.getFieldValidationResult("a");

        expect(form.getFieldValue("a")).toBeUndefined();
    });
});
