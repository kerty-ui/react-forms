import { describe, expect, it } from "vitest";
import { KertyForm, defaultFormConfig } from "../src/lib/kertyForm";

type LoginForm = {
    username: string;
    password: string;
};

type ProfileForm = {
    person: {
        name: string;
        address: { city: string };
    };
};

/** Registers `name` so value/state reads and notifications work, mirroring what a mounted field does. */
const register = <T,>(form: KertyForm<T>, name: string) => form.addFieldListener(name as any, () => { });

// ─── construction ────────────────────────────────────────────────────────────

describe("KertyForm – construction", () => {
    it("should start with an empty object when no data is given", () => {
        const form = new KertyForm<LoginForm>({});

        expect(form.getData()).toEqual({});
    });

    it("should expose the given data when constructed with data", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        expect(form.getData()).toEqual({ username: "bob", password: "pw" });
    });

    it("should clone the given data when constructed so the caller's object is not shared", () => {
        const data = { username: "bob", password: "pw" };
        const form = new KertyForm<LoginForm>({ data });

        expect(form.getData()).not.toBe(data);
    });

    it("should start in a pristine state when constructed", () => {
        const form = new KertyForm<LoginForm>({});

        expect(form.getState()).toEqual({ isTouched: false, isDirty: false, isValid: true, isValidated: false });
    });

    it("should call the validator factory when the validator is given as a function", () => {
        let called = false;
        const form = new KertyForm<LoginForm>({
            validator: () => {
                called = true;
                return { mode: "fieldDriven", validate: () => new Map() };
            },
        });

        expect(called).toBe(true);
        expect(form.getState().isValid).toBe(true);
    });
});

// ─── configuration ───────────────────────────────────────────────────────────

describe("KertyForm – configuration", () => {
    it("should enable every tracking option when the default config is used", () => {
        expect(defaultFormConfig).toEqual({
            dirtyCheckEnabled: true,
            dirtyCheckEmptyStringAsNull: true,
            trackTouchOnValueChange: true,
            clearFormValidationResultsOnChange: true,
        });
    });

    it("should not mark the field dirty when dirty checking is disabled", () => {
        const form = new KertyForm<any>({ data: { a: 1 }, dirtyCheckEnabled: false });
        register(form, "a");

        form.setFieldValue("a", 2);

        expect(form.getState().isDirty).toBe(false);
    });

    it("should not mark the field touched when touch tracking on change is disabled", () => {
        const form = new KertyForm<any>({ data: { a: 1 }, trackTouchOnValueChange: false });
        register(form, "a");

        form.setFieldValue("a", 2);

        expect(form.getState().isTouched).toBe(false);
    });

    it("should apply the new setting when updateConfiguration is called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.updateConfiguration({ trackTouchOnValueChange: false });
        form.setFieldValue("a", 2);

        expect(form.getState().isTouched).toBe(false);
    });

    it("should keep the current settings when updateConfiguration is called with null", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.updateConfiguration(null as any);
        form.setFieldValue("a", 2);

        expect(form.getState().isDirty).toBe(true);
    });

    it("should ignore omitted keys when updateConfiguration is called with a partial config", () => {
        const form = new KertyForm<any>({ data: { a: 1 }, dirtyCheckEnabled: false });
        register(form, "a");

        form.updateConfiguration({ trackTouchOnValueChange: false });
        form.setFieldValue("a", 2);

        expect(form.getState().isDirty).toBe(false);
    });
});

// ─── reading values ──────────────────────────────────────────────────────────

describe("KertyForm.getFieldValue", () => {
    it("should return the value when the field has been registered", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        register(form, "username");

        expect(form.getFieldValue("username")).toBe("bob");
    });

    it("should return undefined when the field has never been registered", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        expect(form.getFieldValue("username")).toBeUndefined();
    });

    it("should return the nested value when a dotted path is registered", () => {
        const form = new KertyForm<ProfileForm>({ data: { person: { name: "John", address: { city: "London" } } } });
        register(form, "person.address.city");

        expect(form.getFieldValue("person.address.city")).toBe("London");
    });

    it("should return the item when an indexed path is registered", () => {
        const form = new KertyForm<any>({ data: { tags: ["ts", "js"] } });
        register(form, "tags[1]");

        expect(form.getFieldValue("tags[1]")).toBe("js");
    });
});

describe("KertyForm.getFieldState", () => {
    it("should return a pristine state when the field has never been registered", () => {
        const form = new KertyForm<LoginForm>({});

        expect(form.getFieldState("username")).toEqual({
            isTouched: false, isDirty: false, isValid: true, isValidated: false,
        });
    });

    it("should report the field as dirty when its value differs from the initial data", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.setFieldValue("a", 2);

        expect(form.getFieldState("a").isDirty).toBe(true);
    });

    it("should report the field as touched when its value changed", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.setFieldValue("a", 2);

        expect(form.getFieldState("a").isTouched).toBe(true);
    });
});

// ─── writing values ──────────────────────────────────────────────────────────

describe("KertyForm.setFieldValue", () => {
    it("should write the value into the form data when called", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        form.setFieldValue("username", "alice");

        expect(form.getData().username).toBe("alice");
    });

    it("should replace the data object when called so identity comparison detects the change", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        const before = form.getData();

        form.setFieldValue("username", "alice");

        expect(form.getData()).not.toBe(before);
    });

    it("should create the missing branch when a nested path does not exist yet", () => {
        const form = new KertyForm<any>({ data: {} });

        form.setFieldValue("person.address.city", "London");

        expect(form.getData()).toEqual({ person: { address: { city: "London" } } });
    });

    it("should register the field when called for a path with no listener", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        form.setFieldValue("username", "alice");

        expect(form.getFieldValue("username")).toBe("alice");
    });

    it("should still write the value when called in silent mode", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });

        form.setFieldValue("a", 2, true);

        expect(form.getData().a).toBe(2);
    });

    it("should not update the form state when called in silent mode", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.setFieldValue("a", 2, true);

        expect(form.getState()).toEqual({ isTouched: false, isDirty: false, isValid: true, isValidated: false });
    });
});

// ─── dirty tracking ──────────────────────────────────────────────────────────

describe("KertyForm – dirty tracking", () => {
    it("should mark the form dirty when a field moves away from its initial value", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.setFieldValue("a", 2);

        expect(form.getState().isDirty).toBe(true);
    });

    it("should clear the dirty flag when the field returns to its initial value", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");
        form.setFieldValue("a", 2);

        form.setFieldValue("a", 1);

        expect(form.getState().isDirty).toBe(false);
    });

    it("should stay dirty when one of two changed fields returns to its initial value", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        register(form, "a");
        register(form, "b");
        form.setFieldValue("a", 2);
        form.setFieldValue("b", 2);

        form.setFieldValue("a", 1);

        expect(form.getState().isDirty).toBe(true);
    });

    it("should not mark the form dirty when an empty string becomes null and the default config is used", () => {
        const form = new KertyForm<any>({ data: { a: "" } });
        register(form, "a");

        form.setFieldValue("a", null);

        expect(form.getState().isDirty).toBe(false);
    });

    it("should mark the form dirty when an empty string becomes null and the normalisation is disabled", () => {
        const form = new KertyForm<any>({ data: { a: "" }, dirtyCheckEmptyStringAsNull: false });
        register(form, "a");

        form.setFieldValue("a", null);

        expect(form.getState().isDirty).toBe(true);
    });

    it("should compare structurally when an object field is set to an equal object", () => {
        const form = new KertyForm<any>({ data: { person: { name: "John" } } });
        register(form, "person");

        form.setFieldValue("person", { name: "John" });

        expect(form.getState().isDirty).toBe(false);
    });

    it("should not report the field dirty when the initial data reuses one object twice", () => {
        const lookup = { id: 1, label: "EUR" };
        const form = new KertyForm<any>({ data: { from: lookup, to: lookup } });
        register(form, "from");

        form.setFieldValue("from", { id: 1, label: "EUR" });

        expect(form.getState().isDirty).toBe(false);
    });
});

// ─── dirty tracking across unmount ───────────────────────────────────────────

describe("KertyForm – dirty tracking when a field unsubscribes", () => {
    it("should clear the form dirty flag when the last dirty field unsubscribes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const unsubscribe = register(form, "a");
        form.setFieldValue("a", 2);

        unsubscribe();

        expect(form.getState().isDirty).toBe(false);
    });

    it("should keep the form dirty when another dirty field is still subscribed", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        const unsubscribe = register(form, "a");
        register(form, "b");
        form.setFieldValue("a", 2);
        form.setFieldValue("b", 2);

        unsubscribe();

        expect(form.getState().isDirty).toBe(true);
    });

    it("should notify state listeners when the dirty flag changes on unsubscribe", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const unsubscribe = register(form, "a");
        form.setFieldValue("a", 2);
        let calls = 0;
        form.addListener(() => calls++, {
            listenDataChange: false,
            listenStateChange: true,
            listenValidationChange: false,
            listenFieldValidationChange: false,
        });

        unsubscribe();

        expect(calls).toBe(1);
    });

    it("should not notify state listeners when a clean field unsubscribes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const unsubscribe = register(form, "a");
        let calls = 0;
        form.addListener(() => calls++, {
            listenDataChange: false,
            listenStateChange: true,
            listenValidationChange: false,
            listenFieldValidationChange: false,
        });

        unsubscribe();

        expect(calls).toBe(0);
    });

    it("should keep the form dirty when one of two listeners on a dirty field unsubscribes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");
        const unsubscribe = register(form, "a");
        form.setFieldValue("a", 2);

        unsubscribe();

        expect(form.getState().isDirty).toBe(true);
    });
});

// ─── touch ───────────────────────────────────────────────────────────────────

describe("KertyForm.touch", () => {
    it("should mark the form touched when called without a field name", () => {
        const form = new KertyForm<LoginForm>({});

        form.touch();

        expect(form.getState().isTouched).toBe(true);
    });

    it("should mark the field touched when called with a registered field name", () => {
        const form = new KertyForm<LoginForm>({});
        register(form, "username");

        form.touch("username");

        expect(form.getFieldState("username").isTouched).toBe(true);
    });

    it("should mark the form touched when called with a registered field name", () => {
        const form = new KertyForm<LoginForm>({});
        register(form, "username");

        form.touch("username");

        expect(form.getState().isTouched).toBe(true);
    });

    it("should mark the field touched when called for a field that has no listener", () => {
        const form = new KertyForm<LoginForm>({});

        form.touch("username");

        expect(form.getFieldState("username").isTouched).toBe(true);
    });

    it("should mark the form touched when called for a field that has no listener", () => {
        const form = new KertyForm<LoginForm>({});

        form.touch("username");

        expect(form.getState().isTouched).toBe(true);
    });

    it("should keep the field touched when a listener subscribes after the touch", () => {
        const form = new KertyForm<LoginForm>({});
        form.touch("username");

        const snapshot = form.getFieldSnapshot("username");

        expect(snapshot().isTouched).toBe(true);
    });

    it("should leave other fields untouched when one field is touched", () => {
        const form = new KertyForm<LoginForm>({});

        form.touch("username");

        expect(form.getFieldState("password").isTouched).toBe(false);
    });

    it("should touch no individual field when called without a field name", () => {
        const form = new KertyForm<LoginForm>({});
        register(form, "username");

        form.touch();

        expect(form.getFieldState("username").isTouched).toBe(false);
    });

    it("should clear the touched state when the form is reset", () => {
        const form = new KertyForm<LoginForm>({});
        form.touch("username");

        form.reset();

        expect([form.getState().isTouched, form.getFieldState("username").isTouched]).toEqual([false, false]);
    });
});

// ─── reset ───────────────────────────────────────────────────────────────────

describe("KertyForm.reset", () => {
    it("should restore the initial data when called without arguments", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        form.setFieldValue("a", 2);

        form.reset();

        expect(form.getData()).toEqual({ a: 1 });
    });

    it("should restore the pristine form state when called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");
        form.setFieldValue("a", 2);

        form.reset();

        expect(form.getState()).toEqual({ isTouched: false, isDirty: false, isValid: true, isValidated: false });
    });

    it("should clear the field state when called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");
        form.setFieldValue("a", 2);

        form.reset();

        expect(form.getFieldState("a")).toEqual({ isTouched: false, isDirty: false, isValid: true, isValidated: false });
    });

    it("should adopt the given data when called with new data", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });

        form.reset({ a: 9 });

        expect(form.getData()).toEqual({ a: 9 });
    });

    it("should use the new data as the dirty baseline when called with new data", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.reset({ a: 9 });
        form.setFieldValue("a", 9);

        expect(form.getState().isDirty).toBe(false);
    });

    it("should notify every listener when called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        let calls = 0;
        form.addListener(() => calls++);

        form.reset();

        expect(calls).toBe(1);
    });

    it("should notify field listeners when called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        let calls = 0;
        form.addFieldListener("a", () => calls++);

        form.reset();

        expect(calls).toBe(1);
    });
});

// ─── snapshots ───────────────────────────────────────────────────────────────

describe("KertyForm.getSnapshot", () => {
    it("should return the same object on consecutive calls when nothing changed", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const snapshot = form.getSnapshot();

        expect(snapshot()).toBe(snapshot());
    });

    it("should return a new object when the data changed", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const snapshot = form.getSnapshot();
        const before = snapshot();

        form.setFieldValue("a", 2);

        expect(snapshot()).not.toBe(before);
    });

    it("should expose data, state and validation result when called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });

        expect(form.getSnapshot()()).toEqual({
            data: { a: 1 },
            state: { isTouched: false, isDirty: false, isValid: true, isValidated: false },
            validationResult: undefined,
        });
    });
});

describe("KertyForm.getDataSnapshot", () => {
    it("should project the selected value when called", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        const snapshot = form.getDataSnapshot(data => data.username);

        expect(snapshot()).toBe("bob");
    });

    it("should observe the latest data when the form changed after the selector was created", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        const snapshot = form.getDataSnapshot(data => data.username);

        form.setFieldValue("username", "alice");

        expect(snapshot()).toBe("alice");
    });
});

describe("KertyForm.getStateSnapshot", () => {
    it("should project the selected state value when called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");
        const snapshot = form.getStateSnapshot(state => state.isDirty);

        form.setFieldValue("a", 2);

        expect(snapshot()).toBe(true);
    });
});

describe("KertyForm.getFieldSnapshot", () => {
    it("should return the same object on consecutive calls when nothing changed", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const snapshot = form.getFieldSnapshot("a");

        expect(snapshot()).toBe(snapshot());
    });

    it("should return a new object when the field value changed", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const snapshot = form.getFieldSnapshot("a");
        const before = snapshot();

        form.setFieldValue("a", 2);

        expect(snapshot()).not.toBe(before);
    });

    it("should combine the value with the field state when called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const snapshot = form.getFieldSnapshot("a");

        expect(snapshot()).toEqual({
            value: 1,
            validationResult: undefined,
            isTouched: false, isDirty: false, isValid: true, isValidated: false,
        });
    });

    it("should not be affected by a sibling field changing when called", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        const snapshot = form.getFieldSnapshot("a");
        const before = snapshot();

        form.setFieldValue("b", 2);

        expect(snapshot()).toBe(before);
    });
});
