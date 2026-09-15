import { describe, expect, it } from "vitest";
import { KertyForm } from "../src/lib/kertyForm";
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

// ─── 1. ValidatorBuilder path registration is order dependent ────────────────

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

// ─── 2. MultiMessageResults.addFormMessage ───────────────────────────────────

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

// ─── 3. touch() on an unregistered field is a silent no-op ───────────────────

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

// ─── 4. reading a validation result registers the field as a side effect ─────

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
