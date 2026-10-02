import { describe, expect, it } from "vitest";
import { KertyForm, Severity, ValidationResult, type FieldPath } from "../src/lib";

type ListForm = {
    items: string[];
};

const listForm = (items: string[] = ["a", "b", "c"]) => new KertyForm<ListForm>({ data: { items } });

const counter = () => {
    const state = { calls: 0 };
    return [state, () => { state.calls++; }] as const;
};

describe("KertyForm.appendItems", () => {
    it("should add the item at the end when a single value is given", () => {
        const form = listForm();

        form.appendItems("items", "d");

        expect(form.getData().items).toEqual(["a", "b", "c", "d"]);
    });

    it("should add every item at the end when an array is given", () => {
        const form = listForm();

        form.appendItems("items", ["d", "e"]);

        expect(form.getData().items).toEqual(["a", "b", "c", "d", "e"]);
    });

    it("should create the array when the target property does not exist", () => {
        const form = new KertyForm<ListForm>({ data: {} as ListForm });

        form.appendItems("items", "a");

        expect(form.getData().items).toEqual(["a"]);
    });

    it("should leave the data unchanged when the value is null", () => {
        const form = listForm();

        form.appendItems("items", null as any);

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });

    it("should still append a falsy item when the value is an empty string", () => {
        const form = listForm();

        form.appendItems("items", "");

        expect(form.getData().items).toEqual(["a", "b", "c", ""]);
    });

    it("should leave the data unchanged when the target is not an array", () => {
        const form = new KertyForm<any>({ data: { items: { notAnArray: true } } });

        form.appendItems("items", "a");

        expect(form.getData().items).toEqual({ notAnArray: true });
    });

    it("should replace the array reference when items are appended", () => {
        const items = ["a"];
        const form = new KertyForm<ListForm>({ data: { items } });
        const before = form.getData().items;

        form.appendItems("items", "b");

        expect(form.getData().items).not.toBe(before);
    });

    it("should notify the array field listener when items are appended", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.appendItems("items", "d");

        expect(count.calls).toBe(1);
    });

    it("should not notify listeners when appended in silent mode", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.appendItems("items", "d", true);

        expect(count.calls).toBe(0);
    });
});

describe("KertyForm.prependItems", () => {
    it("should add the item at the front when a single value is given", () => {
        const form = listForm();

        form.prependItems("items", "z");

        expect(form.getData().items).toEqual(["z", "a", "b", "c"]);
    });

    it("should keep the given order when an array is prepended", () => {
        const form = listForm();

        form.prependItems("items", ["x", "y"]);

        expect(form.getData().items).toEqual(["x", "y", "a", "b", "c"]);
    });

    it("should create the array when the target property does not exist", () => {
        const form = new KertyForm<ListForm>({ data: {} as ListForm });

        form.prependItems("items", "a");

        expect(form.getData().items).toEqual(["a"]);
    });

    it("should leave the data unchanged when the value is null", () => {
        const form = listForm();

        form.prependItems("items", null as any);

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });

    it("should leave the data unchanged when the value is undefined", () => {
        const form = listForm();

        form.prependItems("items", undefined as any);

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });

    it("should not notify listeners when the value is null", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.prependItems("items", null as any);

        expect(count.calls).toBe(0);
    });

    it("should leave the data unchanged when the target is not an array", () => {
        const form = new KertyForm<any>({ data: { items: { notAnArray: true } } });

        form.prependItems("items", "a");

        expect(form.getData().items).toEqual({ notAnArray: true });
    });

    it("should still prepend a falsy item when the value is an empty string", () => {
        const form = listForm();

        form.prependItems("items", "");

        expect(form.getData().items).toEqual(["", "a", "b", "c"]);
    });

    it("should notify the array field listener when items are prepended", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.prependItems("items", "z");

        expect(count.calls).toBe(1);
    });
});

describe("KertyForm.insertItems", () => {
    it("should place the item at the given index when a single value is given", () => {
        const form = listForm();

        form.insertItems("items", 1, "x");

        expect(form.getData().items).toEqual(["a", "x", "b", "c"]);
    });

    it("should place every item at the given index when an array is given", () => {
        const form = listForm();

        form.insertItems("items", 1, ["x", "y"]);

        expect(form.getData().items).toEqual(["a", "x", "y", "b", "c"]);
    });

    it("should append the item when the index is past the end", () => {
        const form = listForm();

        form.insertItems("items", 99, "x");

        expect(form.getData().items).toEqual(["a", "b", "c", "x"]);
    });

    it("should count from the end when the index is negative", () => {
        const form = listForm();

        form.insertItems("items", -1, "x");

        expect(form.getData().items).toEqual(["a", "b", "x", "c"]);
    });

    it("should leave the data unchanged when the value is null", () => {
        const form = listForm();

        form.insertItems("items", 1, null as any);

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });

    it("should still insert a falsy item when the value is an empty string", () => {
        const form = listForm();

        form.insertItems("items", 1, "");

        expect(form.getData().items).toEqual(["a", "", "b", "c"]);
    });
});

describe("KertyForm.removeItems", () => {
    it("should drop the item at the given index when a single index is given", () => {
        const form = listForm();

        form.removeItems("items", 1);

        expect(form.getData().items).toEqual(["a", "c"]);
    });

    it("should drop every listed item when several indices are given", () => {
        const form = listForm(["a", "b", "c", "d"]);

        form.removeItems("items", [0, 2]);

        expect(form.getData().items).toEqual(["b", "d"]);
    });

    it("should drop the intended items when the indices are given out of order", () => {
        const form = listForm(["a", "b", "c", "d"]);

        form.removeItems("items", [2, 0]);

        expect(form.getData().items).toEqual(["b", "d"]);
    });

    it("should leave the caller's index array unchanged when several indices are given", () => {
        const form = listForm(["a", "b", "c", "d"]);
        const indexes = [0, 2];

        form.removeItems("items", indexes);

        expect(indexes).toEqual([0, 2]);
    });

    it("should leave the array unchanged when the index is out of range", () => {
        const form = listForm();

        form.removeItems("items", 99);

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });

    it("should notify the array field listener when an item is removed", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.removeItems("items", 0);

        expect(count.calls).toBe(1);
    });

    it("should notify the array field listener when a removed trailing item has no registered fields", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);
        form.addFieldListener("items[2]", () => { });

        form.removeItems("items", [0, 1]);

        expect(count.calls).toBe(1);
    });
});

describe("KertyForm – silent array mutations", () => {
    it.each([
        ["prependItems", (form: KertyForm<ListForm>) => form.prependItems("items", "z", true), ["z", "a", "b", "c"]],
        ["insertItems", (form: KertyForm<ListForm>) => form.insertItems("items", 1, "z", true), ["a", "z", "b", "c"]],
        ["removeItems", (form: KertyForm<ListForm>) => form.removeItems("items", 1, true), ["a", "c"]],
        ["swapItem", (form: KertyForm<ListForm>) => form.swapItem("items", 0, 2, true), ["c", "b", "a"]],
        ["moveItem", (form: KertyForm<ListForm>) => form.moveItem("items", 0, 2, true), ["b", "c", "a"]],
        ["updateItem", (form: KertyForm<ListForm>) => form.updateItem("items", 1, "z", true), ["a", "z", "c"]],
    ] as const)("should still write the data when %s is called in silent mode", (_, mutate, expected) => {
        const form = listForm();

        mutate(form);

        expect(form.getData().items).toEqual(expected);
    });

    it.each([
        ["prependItems", (form: KertyForm<ListForm>) => form.prependItems("items", "z", true)],
        ["insertItems", (form: KertyForm<ListForm>) => form.insertItems("items", 1, "z", true)],
        ["removeItems", (form: KertyForm<ListForm>) => form.removeItems("items", 1, true)],
        ["swapItem", (form: KertyForm<ListForm>) => form.swapItem("items", 0, 2, true)],
        ["moveItem", (form: KertyForm<ListForm>) => form.moveItem("items", 0, 2, true)],
        ["updateItem", (form: KertyForm<ListForm>) => form.updateItem("items", 1, "z", true)],
    ] as const)("should not notify listeners when %s is called in silent mode", (_, mutate) => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);
        form.addListener(listener);

        mutate(form);

        expect(count.calls).toBe(0);
    });
});

describe("KertyForm.swapItem", () => {
    it("should exchange the two items when valid indices are given", () => {
        const form = listForm();

        form.swapItem("items", 0, 2);

        expect(form.getData().items).toEqual(["c", "b", "a"]);
    });

    it("should exchange the outer items when the first and last are swapped", () => {
        const form = listForm(["a", "b", "c", "d"]);

        form.swapItem("items", 0, 3);

        expect(form.getData().items).toEqual(["d", "b", "c", "a"]);
    });

    it("should leave the array unchanged when both indices are the same", () => {
        const items = ["a", "b", "c"];
        const form = new KertyForm<ListForm>({ data: { items } });
        const before = form.getData().items;

        form.swapItem("items", 1, 1);

        expect(form.getData().items).toBe(before);
    });

    it("should not notify listeners when both indices are the same", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.swapItem("items", 1, 1);

        expect(count.calls).toBe(0);
    });

    it.each([
        ["toIndex is past the end", 0, 9],
        ["fromIndex is past the end", 9, 0],
        ["fromIndex is negative", -1, 0],
        ["toIndex is negative", 0, -1],
        ["fromIndex is fractional", 1.5, 0],
        ["toIndex is fractional", 0, 1.5],
        ["fromIndex is NaN", NaN, 0],
    ])("should leave the array unchanged when %s", (_label, fromIndex, toIndex) => {
        const form = listForm();

        form.swapItem("items", fromIndex, toIndex);

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });

    it("should not grow the array when an index is past the end", () => {
        const form = listForm();

        form.swapItem("items", 0, 9);

        expect(form.getData().items).toHaveLength(3);
    });

    it("should not add a phantom property when an index is negative", () => {
        const form = listForm();

        form.swapItem("items", -1, 0);

        expect(Object.keys(form.getData().items)).toEqual(["0", "1", "2"]);
    });

    it("should not notify listeners when an index is out of range", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.swapItem("items", 0, 9);

        expect(count.calls).toBe(0);
    });

    it("should leave the data unchanged when the target is not an array", () => {
        const form = new KertyForm<any>({ data: { items: "not an array" } });

        form.swapItem("items", 0, 1);

        expect(form.getData().items).toBe("not an array");
    });

    it("should swap the items when the array is empty apart from the two targets", () => {
        const form = listForm(["a", "b"]);

        form.swapItem("items", 0, 1);

        expect(form.getData().items).toEqual(["b", "a"]);
    });
});

describe("KertyForm.moveItem", () => {
    it("should shift the item forward when moved to a later index", () => {
        const form = listForm();

        form.moveItem("items", 0, 2);

        expect(form.getData().items).toEqual(["b", "c", "a"]);
    });

    it("should shift the item backward when moved to an earlier index", () => {
        const form = listForm();

        form.moveItem("items", 2, 0);

        expect(form.getData().items).toEqual(["c", "a", "b"]);
    });

    it("should leave the order unchanged when the indices are the same", () => {
        const form = listForm();

        form.moveItem("items", 1, 1);

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });

    it("should leave the array unchanged when fromIndex is past the end", () => {
        const form = listForm();

        form.moveItem("items", 9, 0);

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });

    it("should not grow the array when fromIndex is past the end", () => {
        const form = listForm();

        form.moveItem("items", 9, 0);

        expect(form.getData().items).toHaveLength(3);
    });

    it("should not notify listeners when fromIndex is past the end", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.moveItem("items", 9, 0);

        expect(count.calls).toBe(0);
    });

    it("should move the last item when fromIndex is negative", () => {
        const form = listForm();

        form.moveItem("items", -1, 0);

        expect(form.getData().items).toEqual(["c", "a", "b"]);
    });

    it("should move the item to the end when toIndex is past the end", () => {
        const form = listForm();

        form.moveItem("items", 0, 9);

        expect(form.getData().items).toEqual(["b", "c", "a"]);
    });

    it("should move the item when the item being moved is null", () => {
        const form = new KertyForm<any>({ data: { items: [null, "b"] } });

        form.moveItem("items", 0, 1);

        expect(form.getData().items).toEqual(["b", null]);
    });

    it("should leave the data unchanged when the target is not an array", () => {
        const form = new KertyForm<any>({ data: { items: "not an array" } });

        form.moveItem("items", 0, 1);

        expect(form.getData().items).toBe("not an array");
    });
});

describe("KertyForm.updateItem", () => {
    it("should replace the item at the given index when called", () => {
        const form = listForm();

        form.updateItem("items", 1, "z");

        expect(form.getData().items).toEqual(["a", "z", "c"]);
    });

    it("should notify a listener bound to that item when the item is replaced", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items[1]", listener);

        form.updateItem("items", 1, "z");

        expect(count.calls).toBe(1);
    });

    it("should leave the data unchanged when the target is not an array", () => {
        const form = new KertyForm<any>({ data: { items: "not an array" } });

        form.updateItem("items", 0, "z");

        expect(form.getData().items).toBe("not an array");
    });

    it("should write the value when the new value is null", () => {
        const form = listForm();

        form.updateItem("items", 1, null as any);

        expect(form.getData().items).toEqual(["a", null, "c"]);
    });

    it.each([
        ["the index is past the end", 9],
        ["the index is negative", -1],
        ["the index is fractional", 1.5],
        ["the index is NaN", NaN],
    ])("should leave the array unchanged when %s", (_label, index) => {
        const form = listForm();

        form.updateItem("items", index, "z");

        expect(form.getData().items).toEqual(["a", "b", "c"]);
    });

    it("should not grow the array when the index is past the end", () => {
        const form = listForm();

        form.updateItem("items", 9, "z");

        expect(form.getData().items).toHaveLength(3);
    });

    it("should not add a phantom property when the index is negative", () => {
        const form = listForm();

        form.updateItem("items", -1, "z");

        expect(Object.keys(form.getData().items)).toEqual(["0", "1", "2"]);
    });

    it("should not notify listeners when the index is out of range", () => {
        const form = listForm();
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.updateItem("items", 9, "z");

        expect(count.calls).toBe(0);
    });
});

describe("KertyForm – array state tracking", () => {
    it("should mark the form dirty when an item is appended", () => {
        const form = listForm();
        form.addFieldListener("items", () => { });

        form.appendItems("items", "d");

        expect(form.getState().isDirty).toBe(true);
    });

    it("should clear the dirty flag when an appended item is removed again", () => {
        const form = listForm();
        form.addFieldListener("items", () => { });
        form.appendItems("items", "d");

        form.removeItems("items", 3);

        expect(form.getState().isDirty).toBe(false);
    });

    it("should move the touched state of a later item to its new index when an earlier item is removed", () => {
        const form = listForm();
        form.touch("items[2]");

        form.removeItems("items", 0);

        expect(form.getFieldState("items[1]").isTouched).toBe(true);
    });

    it("should clear the touched state at the removed index when the item that moved there was not touched", () => {
        const form = listForm();
        form.addFieldListener("items[0]", () => { });
        form.touch("items[0]");

        form.removeItems("items", 0);

        expect(form.getFieldState("items[0]").isTouched).toBe(false);
    });

    it("should read the moved item's value at its new index when an earlier item is removed", () => {
        const form = listForm();
        form.addFieldListener("items[2]", () => { });

        form.removeItems("items", 0);

        expect(form.getFieldValue("items[1]")).toBe("c");
    });

    it("should mark the form touched when an item is appended", () => {
        const form = listForm();
        form.addFieldListener("items", () => { });

        form.appendItems("items", "d");

        expect(form.getState().isTouched).toBe(true);
    });

    it("should operate on the nested array when the path points inside an object", () => {
        const form = new KertyForm<any>({ data: { order: { lines: ["a"] } } });

        form.appendItems("order.lines", "b");

        expect(form.getData().order.lines).toEqual(["a", "b"]);
    });

    it("should operate on the inner array when the path points at an array of arrays", () => {
        const form = new KertyForm<any>({ data: { matrix: [["a"]] } });

        form.appendItems("matrix[0]", "b");

        expect(form.getData().matrix).toEqual([["a", "b"]]);
    });
});

type PersonsForm = {
    persons: {
        name: string;
        surname?: string;
        email?: string;
        age?: number;
        phoneNumbers: string[];
    }[];
};

const registeredPersonFields: FieldPath<PersonsForm>[] = [
    "persons[0]",
    "persons[0].name",
    "persons[0].age",
    "persons[0].phoneNumbers[0]",
    "persons[1]",
    "persons[1].name",
    "persons[1].surname",
    "persons[1].phoneNumbers[0]",
    "persons[1].phoneNumbers[1]",
    "persons[2]",
    "persons[2].name",
    "persons[2].surname",
    "persons[2].email",
    "persons[2].phoneNumbers[0]",
    "persons[2].phoneNumbers[1]",
    "persons[2].phoneNumbers[2]",
];

const personsForm = () => {
    const form = new KertyForm<PersonsForm>({
        data: {
            persons: [
                { name: "Anna", age: 30, phoneNumbers: ["111"] },
                { name: "Ben", surname: "Brown", phoneNumbers: ["211", "212"] },
                { name: "Cleo", surname: "Clark", email: "cleo@example.com", phoneNumbers: ["311", "312", "313"] },
            ],
        },
    });
    registeredPersonFields.forEach((fieldName, index) => {
        form.addFieldListener(fieldName, () => { });
        form.applyFieldValidationResult(fieldName, new ValidationResult().add({
            text: `${fieldName} message`,
            severity: index % 2 === 0 ? Severity.Error : Severity.Warning,
        }));
        if(index % 3 === 0) {
            form.touch(fieldName);
        }
    });
    return form;
};

const itemFieldState = (form: KertyForm<PersonsForm>, fieldName: FieldPath<PersonsForm>) => {
    const { isTouched, isValid, isValidated } = form.getFieldState(fieldName);
    return { isTouched, isValid, isValidated, messages: form.getFieldValidationResult(fieldName)?.messages };
};

describe("KertyForm.removeFieldValue on an array item path", () => {
    it("should notify the array listener when an item is removed while the array is already dirty", () => {
        const form = listForm(["a", "b", "c"]);
        form.setFieldValue("items[0]", "x");
        const [count, listener] = counter();
        form.addFieldListener("items", listener);

        form.removeFieldValue("items[1]");

        expect(count.calls).toBe(1);
    });

    it("should not mark the shifted item dirty when it equals the initial item at its new index", () => {
        const form = listForm(["a", "b", "b"]);

        form.removeFieldValue("items[1]");

        expect(form.getFieldState("items[1]").isDirty).toBe(false);
    });

    it("should move the validation result of a later item down with its value", () => {
        const form = listForm(["a", "b", "c"]);
        const result = new ValidationResult().add({ text: "c is invalid", severity: Severity.Error });
        form.applyFieldValidationResult("items[2]", result);

        form.removeFieldValue("items[1]");

        expect(form.getFieldValidationMessage("items[1]")?.text).toBe("c is invalid");
    });
});

describe("KertyForm.removeItems – moving item field states when the first item is removed", () => {
    it.each([
        ["persons[1]", "persons[0]"],
        ["persons[1].name", "persons[0].name"],
        ["persons[1].surname", "persons[0].surname"],
        ["persons[1].phoneNumbers[0]", "persons[0].phoneNumbers[0]"],
        ["persons[1].phoneNumbers[1]", "persons[0].phoneNumbers[1]"],
        ["persons[2]", "persons[1]"],
        ["persons[2].name", "persons[1].name"],
        ["persons[2].surname", "persons[1].surname"],
        ["persons[2].email", "persons[1].email"],
        ["persons[2].phoneNumbers[0]", "persons[1].phoneNumbers[0]"],
        ["persons[2].phoneNumbers[1]", "persons[1].phoneNumbers[1]"],
        ["persons[2].phoneNumbers[2]", "persons[1].phoneNumbers[2]"],
    ] as [FieldPath<PersonsForm>, FieldPath<PersonsForm>][])("should move the state of %s to %s", (oldFieldName, newFieldName) => {
        const form = personsForm();
        const oldFieldState = itemFieldState(form, oldFieldName);
        form.removeItems("persons", 0);
        expect(itemFieldState(form, newFieldName)).toEqual(oldFieldState);
    });

    it.each([
        "persons[0].age",
        "persons[2]",
        "persons[2].name",
        "persons[2].surname",
        "persons[2].email",
        "persons[2].phoneNumbers[0]",
        "persons[2].phoneNumbers[1]",
        "persons[2].phoneNumbers[2]",
    ] as FieldPath<PersonsForm>[])("should leave no state on %s", (fieldName) => {
        const form = personsForm();

        form.removeItems("persons", 0);

        expect(itemFieldState(form, fieldName)).toEqual({
            isTouched: false,
            isValid: true,
            isValidated: false,
            messages: undefined,
        });
    });
});

describe("KertyForm.swapItem – swapping item field states when the first and last items are swapped", () => {
    it.each([
        ["persons[0]", "persons[2]"],
        ["persons[0].name", "persons[2].name"],
        ["persons[0].age", "persons[2].age"],
        ["persons[0].phoneNumbers[0]", "persons[2].phoneNumbers[0]"],
        ["persons[2]", "persons[0]"],
        ["persons[2].name", "persons[0].name"],
        ["persons[2].surname", "persons[0].surname"],
        ["persons[2].email", "persons[0].email"],
        ["persons[2].phoneNumbers[0]", "persons[0].phoneNumbers[0]"],
        ["persons[2].phoneNumbers[1]", "persons[0].phoneNumbers[1]"],
        ["persons[2].phoneNumbers[2]", "persons[0].phoneNumbers[2]"],
    ] as [FieldPath<PersonsForm>, FieldPath<PersonsForm>][])("should move the state of %s to %s", (oldFieldName, newFieldName) => {
        const form = personsForm();
        const oldFieldState = itemFieldState(form, oldFieldName);

        form.swapItem("persons", 0, 2);

        expect(itemFieldState(form, newFieldName)).toEqual(oldFieldState);
    });

    it.each([
        "persons[0].age",
        "persons[2].surname",
        "persons[2].email",
        "persons[2].phoneNumbers[1]",
        "persons[2].phoneNumbers[2]",
    ] as FieldPath<PersonsForm>[])("should leave no state on %s", (fieldName) => {
        const form = personsForm();

        form.swapItem("persons", 0, 2);

        expect(itemFieldState(form, fieldName)).toEqual({
            isTouched: false,
            isValid: true,
            isValidated: false,
            messages: undefined,
        });
    });
});

describe("KertyForm.moveItem – moving item field states when the first item is moved to the end", () => {
    it.each([
        ["persons[0]", "persons[2]"],
        ["persons[0].name", "persons[2].name"],
        ["persons[0].age", "persons[2].age"],
        ["persons[0].phoneNumbers[0]", "persons[2].phoneNumbers[0]"],
        ["persons[1]", "persons[0]"],
        ["persons[1].name", "persons[0].name"],
        ["persons[1].surname", "persons[0].surname"],
        ["persons[1].phoneNumbers[0]", "persons[0].phoneNumbers[0]"],
        ["persons[1].phoneNumbers[1]", "persons[0].phoneNumbers[1]"],
        ["persons[2]", "persons[1]"],
        ["persons[2].name", "persons[1].name"],
        ["persons[2].surname", "persons[1].surname"],
        ["persons[2].email", "persons[1].email"],
        ["persons[2].phoneNumbers[0]", "persons[1].phoneNumbers[0]"],
        ["persons[2].phoneNumbers[1]", "persons[1].phoneNumbers[1]"],
        ["persons[2].phoneNumbers[2]", "persons[1].phoneNumbers[2]"],
    ] as [FieldPath<PersonsForm>, FieldPath<PersonsForm>][])("should move the state of %s to %s", (oldFieldName, newFieldName) => {
        const form = personsForm();
        const oldFieldState = itemFieldState(form, oldFieldName);

        form.moveItem("persons", 0, 2);

        expect(itemFieldState(form, newFieldName)).toEqual(oldFieldState);
    });

    it.each([
        "persons[0].age",
        "persons[2].surname",
        "persons[2].email",
        "persons[2].phoneNumbers[1]",
        "persons[2].phoneNumbers[2]",
    ] as FieldPath<PersonsForm>[])("should leave no state on %s", (fieldName) => {
        const form = personsForm();

        form.moveItem("persons", 0, 2);

        expect(itemFieldState(form, fieldName)).toEqual({
            isTouched: false,
            isValid: true,
            isValidated: false,
            messages: undefined,
        });
    });
});

describe("KertyForm.moveItem – moving item field states when the last item is moved to the start", () => {
    it.each([
        ["persons[2]", "persons[0]"],
        ["persons[2].name", "persons[0].name"],
        ["persons[2].surname", "persons[0].surname"],
        ["persons[2].email", "persons[0].email"],
        ["persons[2].phoneNumbers[0]", "persons[0].phoneNumbers[0]"],
        ["persons[2].phoneNumbers[1]", "persons[0].phoneNumbers[1]"],
        ["persons[2].phoneNumbers[2]", "persons[0].phoneNumbers[2]"],
        ["persons[0]", "persons[1]"],
        ["persons[0].name", "persons[1].name"],
        ["persons[0].age", "persons[1].age"],
        ["persons[0].phoneNumbers[0]", "persons[1].phoneNumbers[0]"],
        ["persons[1]", "persons[2]"],
        ["persons[1].name", "persons[2].name"],
        ["persons[1].surname", "persons[2].surname"],
        ["persons[1].phoneNumbers[0]", "persons[2].phoneNumbers[0]"],
        ["persons[1].phoneNumbers[1]", "persons[2].phoneNumbers[1]"],
    ] as [FieldPath<PersonsForm>, FieldPath<PersonsForm>][])("should move the state of %s to %s", (oldFieldName, newFieldName) => {
        const form = personsForm();
        const oldFieldState = itemFieldState(form, oldFieldName);

        form.moveItem("persons", 2, 0);

        expect(itemFieldState(form, newFieldName)).toEqual(oldFieldState);
    });

    it.each([
        "persons[0].age",
        "persons[1].surname",
        "persons[1].phoneNumbers[1]",
        "persons[2].email",
        "persons[2].phoneNumbers[2]",
    ] as FieldPath<PersonsForm>[])("should leave no state on %s", (fieldName) => {
        const form = personsForm();

        form.moveItem("persons", 2, 0);

        expect(itemFieldState(form, fieldName)).toEqual({
            isTouched: false,
            isValid: true,
            isValidated: false,
            messages: undefined,
        });
    });
});

describe("KertyForm.insertItems – moving item field states when an item is inserted in the middle", () => {
    it.each([
        ["persons[0]", "persons[0]"],
        ["persons[0].name", "persons[0].name"],
        ["persons[0].age", "persons[0].age"],
        ["persons[0].phoneNumbers[0]", "persons[0].phoneNumbers[0]"],
        ["persons[1]", "persons[2]"],
        ["persons[1].name", "persons[2].name"],
        ["persons[1].surname", "persons[2].surname"],
        ["persons[1].phoneNumbers[0]", "persons[2].phoneNumbers[0]"],
        ["persons[1].phoneNumbers[1]", "persons[2].phoneNumbers[1]"],
        ["persons[2]", "persons[3]"],
        ["persons[2].name", "persons[3].name"],
        ["persons[2].surname", "persons[3].surname"],
        ["persons[2].email", "persons[3].email"],
        ["persons[2].phoneNumbers[0]", "persons[3].phoneNumbers[0]"],
        ["persons[2].phoneNumbers[1]", "persons[3].phoneNumbers[1]"],
        ["persons[2].phoneNumbers[2]", "persons[3].phoneNumbers[2]"],
    ] as [FieldPath<PersonsForm>, FieldPath<PersonsForm>][])("should move the state of %s to %s", (oldFieldName, newFieldName) => {
        const form = personsForm();
        const oldFieldState = itemFieldState(form, oldFieldName);

        form.insertItems("persons", 1, { name: "Dan", phoneNumbers: [] });

        expect(itemFieldState(form, newFieldName)).toEqual(oldFieldState);
    });

    it.each([
        "persons[1]",
        "persons[1].name",
        "persons[1].surname",
        "persons[1].phoneNumbers[0]",
        "persons[1].phoneNumbers[1]",
        "persons[2].email",
        "persons[2].phoneNumbers[2]",
    ] as FieldPath<PersonsForm>[])("should leave no state on %s", (fieldName) => {
        const form = personsForm();

        form.insertItems("persons", 1, { name: "Dan", phoneNumbers: [] });

        expect(itemFieldState(form, fieldName)).toEqual({
            isTouched: false,
            isValid: true,
            isValidated: false,
            messages: undefined,
        });
    });
});

describe("KertyForm.prependItems – moving item field states when two items are prepended", () => {
    it.each([
        ["persons[0]", "persons[2]"],
        ["persons[0].name", "persons[2].name"],
        ["persons[0].age", "persons[2].age"],
        ["persons[0].phoneNumbers[0]", "persons[2].phoneNumbers[0]"],
        ["persons[1]", "persons[3]"],
        ["persons[1].name", "persons[3].name"],
        ["persons[1].surname", "persons[3].surname"],
        ["persons[1].phoneNumbers[0]", "persons[3].phoneNumbers[0]"],
        ["persons[1].phoneNumbers[1]", "persons[3].phoneNumbers[1]"],
        ["persons[2]", "persons[4]"],
        ["persons[2].name", "persons[4].name"],
        ["persons[2].surname", "persons[4].surname"],
        ["persons[2].email", "persons[4].email"],
        ["persons[2].phoneNumbers[0]", "persons[4].phoneNumbers[0]"],
        ["persons[2].phoneNumbers[1]", "persons[4].phoneNumbers[1]"],
        ["persons[2].phoneNumbers[2]", "persons[4].phoneNumbers[2]"],
    ] as [FieldPath<PersonsForm>, FieldPath<PersonsForm>][])("should move the state of %s to %s", (oldFieldName, newFieldName) => {
        const form = personsForm();
        const oldFieldState = itemFieldState(form, oldFieldName);

        form.prependItems("persons", [{ name: "Dan", phoneNumbers: [] }, { name: "Eva", phoneNumbers: [] }]);

        expect(itemFieldState(form, newFieldName)).toEqual(oldFieldState);
    });

    it.each([
        "persons[0]",
        "persons[0].name",
        "persons[0].age",
        "persons[0].phoneNumbers[0]",
        "persons[1]",
        "persons[1].name",
        "persons[1].surname",
        "persons[1].phoneNumbers[0]",
        "persons[1].phoneNumbers[1]",
        "persons[2].surname",
        "persons[2].email",
        "persons[2].phoneNumbers[1]",
        "persons[2].phoneNumbers[2]",
    ] as FieldPath<PersonsForm>[])("should leave no state on %s", (fieldName) => {
        const form = personsForm();

        form.prependItems("persons", [{ name: "Dan", phoneNumbers: [] }, { name: "Eva", phoneNumbers: [] }]);

        expect(itemFieldState(form, fieldName)).toEqual({
            isTouched: false,
            isValid: true,
            isValidated: false,
            messages: undefined,
        });
    });
});
