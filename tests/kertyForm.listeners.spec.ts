import { describe, expect, it } from "vitest";
import { KertyForm, ValidationResult, Severity, type FormListenerOptions } from "../src/lib";

const dataOnly: FormListenerOptions = {
    listenDataChange: true,
    listenStateChange: false,
    listenValidationChange: false,
};

const stateOnly: FormListenerOptions = {
    listenDataChange: false,
    listenStateChange: true,
    listenValidationChange: false,
};

const formValidationOnly: FormListenerOptions = {
    listenDataChange: false,
    listenStateChange: false,
    listenValidationChange: true,
};

const counter = () => {
    const state = { calls: 0 };
    return [state, () => { state.calls++; }] as const;
};

describe("KertyForm.addListener", () => {
    it("should notify the listener when any field value changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        form.addListener(listener);

        form.setFieldValue("a", 2);

        expect(count.calls).toBe(1);
    });

    it("should notify the listener only once when a single change touches data and state", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        form.addListener(listener);

        form.setFieldValue("a", 2);

        expect(count.calls).toBe(1);
    });

    it("should stop notifying the listener when the returned unsubscribe is called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        const unsubscribe = form.addListener(listener);
        unsubscribe();

        form.setFieldValue("a", 2);

        expect(count.calls).toBe(0);
    });

    it("should notify a data-only listener when a field value changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        form.addListener(listener, dataOnly);

        form.setFieldValue("a", 2);

        expect(count.calls).toBe(1);
    });

    it("should not notify a data-only listener when only the form state changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        form.addListener(listener, dataOnly);

        form.touch();

        expect(count.calls).toBe(0);
    });

    it("should notify a state-only listener when the form becomes touched", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        form.addListener(listener, stateOnly);

        form.touch();

        expect(count.calls).toBe(1);
    });

    it("should not notify a state-only listener when a change leaves the form state unchanged", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        form.setFieldValue("a", 2);
        const [count, listener] = counter();
        form.addListener(listener, stateOnly);

        form.setFieldValue("a", 3);

        expect(count.calls).toBe(0);
    });

    it("should notify a form-validation listener when a form validation result is applied", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        form.addListener(listener, formValidationOnly);

        form.applyValidationResult(new ValidationResult().add({ text: "boom", severity: Severity.Error }));

        expect(count.calls).toBe(1);
    });

    it("should not notify any listener when a silent change is made", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        form.addListener(listener);

        form.setFieldValue("a", 2, true);

        expect(count.calls).toBe(0);
    });

    it("should not notify a listener when touch is called twice and nothing changes the second time", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        form.touch();
        const [count, listener] = counter();
        form.addListener(listener);

        form.touch();

        expect(count.calls).toBe(0);
    });
});

describe("KertyForm.addFieldListener", () => {
    it("should notify the listener when its own field changes", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        const [count, listener] = counter();
        form.addFieldListener("a", listener);

        form.setFieldValue("a", 2);

        expect(count.calls).toBe(1);
    });

    it("should not notify the listener when a sibling field changes", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        const [count, listener] = counter();
        form.addFieldListener("a", listener);

        form.setFieldValue("b", 2);

        expect(count.calls).toBe(0);
    });

    it("should not notify the listener when only the form state changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        form.addFieldListener("a", listener);

        form.touch();

        expect(count.calls).toBe(0);
    });

    it("should stop notifying the listener when the returned unsubscribe is called", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        const unsubscribe = form.addFieldListener("a", listener);
        unsubscribe();

        form.setFieldValue("a", 2);

        expect(count.calls).toBe(0);
    });

    it("should notify both listeners when two listeners share one field", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [first, firstListener] = counter();
        const [second, secondListener] = counter();
        form.addFieldListener("a", firstListener);
        form.addFieldListener("a", secondListener);

        form.setFieldValue("a", 2);

        expect([first.calls, second.calls]).toEqual([1, 1]);
    });

    it("should keep notifying the remaining listener when one of two listeners on a field unsubscribes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [remaining, remainingListener] = counter();
        form.addFieldListener("a", remainingListener);
        form.addFieldListener("a", () => { })();

        form.setFieldValue("a", 2);

        expect(remaining.calls).toBe(1);
    });

    it("should notify the listener when its field is touched", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        const [count, listener] = counter();
        form.addFieldListener("a", listener);

        form.touch("a");

        expect(count.calls).toBe(1);
    });

    it("should not notify the listener when a different field is touched", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        const [count, listener] = counter();
        form.addFieldListener("a", listener);

        form.touch("b");

        expect(count.calls).toBe(0);
    });

    it("should not notify the listener when its field is touched a second time", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        form.touch("a");
        const [count, listener] = counter();
        form.addFieldListener("a", listener);

        form.touch("a");

        expect(count.calls).toBe(0);
    });

    it("should notify the listener when its field validation result changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const [count, listener] = counter();
        form.addFieldListener("a", listener);

        form.applyFieldValidationResult("a", new ValidationResult().add({ text: "boom" }));

        expect(count.calls).toBe(1);
    });
});

describe("KertyForm – hierarchical field notification", () => {
    it("should notify a child field listener when its parent object is replaced", () => {
        const form = new KertyForm<any>({ data: { person: { name: "John" } } });
        const [count, listener] = counter();
        form.addFieldListener("person.name", listener);

        form.setFieldValue("person", { name: "Jane" });

        expect(count.calls).toBe(1);
    });

    it("should notify an array item listener when the whole array is replaced", () => {
        const form = new KertyForm<any>({ data: { items: ["a"] } });
        const [count, listener] = counter();
        form.addFieldListener("items[0]", listener);

        form.setFieldValue("items", ["b"]);

        expect(count.calls).toBe(1);
    });

    it("should notify a deeply nested listener when a top-level ancestor is replaced", () => {
        const form = new KertyForm<any>({ data: { a: { b: { c: 1 } } } });
        const [count, listener] = counter();
        form.addFieldListener("a.b.c", listener);

        form.setFieldValue("a", { b: { c: 2 } });

        expect(count.calls).toBe(1);
    });

    it("should not notify a listener whose field name merely shares a prefix with the changed field", () => {
        const form = new KertyForm<any>({ data: { name: 1, nameSuffix: 1 } });
        const [count, listener] = counter();
        form.addFieldListener("nameSuffix", listener);

        form.setFieldValue("name", 2);

        expect(count.calls).toBe(0);
    });

    it("should notify the direct parent field listener when a child field changes", () => {
        const form = new KertyForm<any>({ data: { parent: { text: "a" } } });
        const [count, listener] = counter();
        form.addFieldListener("parent", listener);

        form.setFieldValue("parent.text", "b");

        expect(count.calls).toBe(1);
    });

    it("should not notify a grandparent field listener when a deeply nested field changes", () => {
        const form = new KertyForm<any>({ data: { parentRoot: { parent: { text: "a" } } } });
        const [count, listener] = counter();
        form.addFieldListener("parentRoot", listener);

        form.setFieldValue("parentRoot.parent.text", "b");

        expect(count.calls).toBe(0);
    });

    it("should notify the array item listener when a property of that item changes", () => {
        const form = new KertyForm<any>({ data: { parent: [{ text: "a" }] } });
        const [count, listener] = counter();
        form.addFieldListener("parent[0]", listener);

        form.setFieldValue("parent[0].text", "b");

        expect(count.calls).toBe(1);
    });

    it("should not notify the array listener when a property of one of its items changes", () => {
        const form = new KertyForm<any>({ data: { parent: [{ text: "a" }] } });
        const [count, listener] = counter();
        form.addFieldListener("parent", listener);

        form.setFieldValue("parent[0].text", "b");

        expect(count.calls).toBe(0);
    });

    it("should notify the array listener when one of its items is assigned directly", () => {
        const form = new KertyForm<any>({ data: { parent: [{ text: "a" }] } });
        const [count, listener] = counter();
        form.addFieldListener("parent", listener);

        form.setFieldValue("parent[0]", { text: "b" });

        expect(count.calls).toBe(1);
    });

    it("should notify the direct parent listener when an array operation changes a nested array", () => {
        const form = new KertyForm<any>({ data: { rows: [{ tags: ["a"] }] } });
        const [count, listener] = counter();
        form.addFieldListener("rows[0]", listener);

        form.appendItems("rows[0].tags", "b");

        expect(count.calls).toBe(1);
    });

    it("should notify only the changed field when a root level field changes", () => {
        const form = new KertyForm<any>({ data: { name: "a", other: "b" } });
        const [changed, changedListener] = counter();
        const [other, otherListener] = counter();
        form.addFieldListener("name", changedListener);
        form.addFieldListener("other", otherListener);

        form.setFieldValue("name", "c");

        expect([changed.calls, other.calls]).toEqual([1, 0]);
    });

    it("should not notify a listener whose field name merely shares a prefix with the changed field's parent", () => {
        const form = new KertyForm<any>({ data: { name: 1, nameSuffix: { x: 1 } } });
        const [count, listener] = counter();
        form.addFieldListener("name", listener);

        form.setFieldValue("nameSuffix.x", 2);

        expect(count.calls).toBe(0);
    });

    it("should keep notifying later field listeners when an earlier listener is a non-boundary prefix of the changed field", () => {
        const form = new KertyForm<any>({ data: { name: 1, nameSuffix: { x: 1 } } });
        const [prefix, prefixListener] = counter();
        const [target, targetListener] = counter();
        form.addFieldListener("name", prefixListener);
        form.addFieldListener("nameSuffix.x", targetListener);

        form.setFieldValue("nameSuffix.x", 2);

        expect([prefix.calls, target.calls]).toEqual([0, 1]);
    });

    it("should keep notifying a whole form listener when an earlier listener is a non-boundary prefix of the changed field", () => {
        const form = new KertyForm<any>({ data: { name: 1, nameSuffix: { x: 1 } } });
        const [prefix, prefixListener] = counter();
        const [whole, wholeListener] = counter();
        form.addFieldListener("name", prefixListener);
        form.addListener(wholeListener, dataOnly);

        form.setFieldValue("nameSuffix.x", 2);

        expect([prefix.calls, whole.calls]).toEqual([0, 1]);
    });

    it("should keep notifying later field listeners when an earlier listener is a shorter unrelated field", () => {
        const form = new KertyForm<any>({ data: { a: 1, parent: { text: "x" } } });
        const [unrelated, unrelatedListener] = counter();
        const [parent, parentListener] = counter();
        const [child, childListener] = counter();
        form.addFieldListener("a", unrelatedListener);
        form.addFieldListener("parent", parentListener);
        form.addFieldListener("parent.text", childListener);

        form.setFieldValue("parent.text", "y");

        expect([unrelated.calls, parent.calls, child.calls]).toEqual([0, 1, 1]);
    });

    it("should not notify the parent field listener when the child change is silent", () => {
        const form = new KertyForm<any>({ data: { parent: { text: "a" } } });
        const [count, listener] = counter();
        form.addFieldListener("parent", listener);

        form.setFieldValue("parent.text", "b", true);

        expect(count.calls).toBe(0);
    });

    it("should still notify a whole-form listener when a nested child field changes", () => {
        const form = new KertyForm<any>({ data: { items: [{ name: "a" }] } });
        const [count, listener] = counter();
        form.addListener(listener, dataOnly);

        form.setFieldValue("items[0].name", "b");

        expect(count.calls).toBe(1);
    });
});

describe("KertyForm – mixed subscriptions", () => {
    it("should notify only the changed field and the form listener when one field changes", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        const [whole, wholeListener] = counter();
        const [fieldA, fieldAListener] = counter();
        const [fieldB, fieldBListener] = counter();
        form.addListener(wholeListener);
        form.addFieldListener("a", fieldAListener);
        form.addFieldListener("b", fieldBListener);

        form.setFieldValue("a", 2);

        expect([whole.calls, fieldA.calls, fieldB.calls]).toEqual([1, 1, 0]);
    });

    it("should notify every listener when the form is reset", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        const [whole, wholeListener] = counter();
        const [fieldA, fieldAListener] = counter();
        const [fieldB, fieldBListener] = counter();
        form.addListener(wholeListener);
        form.addFieldListener("a", fieldAListener);
        form.addFieldListener("b", fieldBListener);

        form.reset();

        expect([whole.calls, fieldA.calls, fieldB.calls]).toEqual([1, 1, 1]);
    });
});
