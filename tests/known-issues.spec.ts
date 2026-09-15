import { describe, expect, it } from "vitest";
import { KertyForm } from "../src/lib/kertyForm";

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

// ─── 1. touch() on an unregistered field is a silent no-op ───────────────────

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

// ─── 2. reading a validation result registers the field as a side effect ─────

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
