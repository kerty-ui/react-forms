import { afterEach, describe, expect, it } from "vitest";
import { KertyForm, Severity, ValidationResult, defaultFormConfig, setInternalNamePrefix, type ObjectData } from "../src/lib";

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

class Money {
    constructor(readonly amount: number) { }
}

type PriceForm = {
    price: Money;
    format: () => string;
};

const register = <T extends ObjectData>(form: KertyForm<T>, name: string) => form.addFieldListener(name as any, () => { });

describe("KertyForm – construction", () => {
    it("should start with an empty object when no data is given", () => {
        const form = new KertyForm<LoginForm>({});

        expect(form.getData()).toEqual({});
    });

    it("should expose the given data when constructed with data", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        expect(form.getData()).toEqual({ username: "bob", password: "pw" });
    });

    it("should keep the given data without copying when constructed", () => {
        const data = { username: "bob", password: "pw" };

        const form = new KertyForm<LoginForm>({ data });

        expect(form.getData()).toBe(data);
    });

    it("should keep a class instance field value when constructed", () => {
        const price = new Money(5);

        const form = new KertyForm<PriceForm>({ data: { price, format: () => "" } });

        expect(form.getFieldValue("price")).toBe(price);
    });

    it("should keep a function field value when constructed", () => {
        const format = () => "";

        const form = new KertyForm<PriceForm>({ data: { price: new Money(5), format } });

        expect(form.getFieldValue("format")).toBe(format);
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

describe("KertyForm – configuration", () => {
    it("should enable every tracking option when the default config is used", () => {
        expect(defaultFormConfig).toEqual({
            dirtyCheckEnabled: true,
            dirtyCheckNullAsDefault: true,
            trackTouchOnValueChange: true,
            clearFormValidationResultsOnChange: true,
            keepValidationResultsWithoutListeners: true,
            cacheValidationResult: true,
            validateOnValueChange: true,
        });
    });

    it("should not mark the field dirty when dirty checking is disabled", () => {
        const form = new KertyForm<any>({ data: { a: 1 }, dirtyCheckEnabled: false });
        register(form, "a");

        form.setFieldValue("a", 2);

        expect(form.getState().isDirty).toBe(false);
    });

    it("should clear the field dirty flag when dirty checking is disabled at runtime", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");
        form.setFieldValue("a", 2);

        form.updateConfiguration({ dirtyCheckEnabled: false });

        expect(form.getFieldState("a").isDirty).toBe(false);
    });

    it("should clear the form dirty flag when dirty checking is disabled at runtime", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");
        form.setFieldValue("a", 2);

        form.updateConfiguration({ dirtyCheckEnabled: false });

        expect(form.getState().isDirty).toBe(false);
    });

    it("should mark a changed field dirty when dirty checking is enabled at runtime", () => {
        const form = new KertyForm<any>({ data: { a: 1 }, dirtyCheckEnabled: false });
        register(form, "a");
        form.setFieldValue("a", 2);

        form.updateConfiguration({ dirtyCheckEnabled: true });

        expect(form.getState().isDirty).toBe(true);
    });

    it("should mark a changed array item dirty when dirty checking is enabled at runtime", () => {
        const form = new KertyForm<any>({ data: { items: [{ name: "a" }] }, dirtyCheckEnabled: false });
        register(form, "items[0]");
        register(form, "items[0].name");
        form.setFieldValue("items[0].name", "b");

        form.updateConfiguration({ dirtyCheckEnabled: true });

        expect(form.getFieldState("items[0]").isDirty).toBe(true);
    });

    it("should recompute the dirty flag when dirtyCheckNullAsDefault changes at runtime", () => {
        const form = new KertyForm<any>({ data: { a: "" } });
        register(form, "a");
        form.setFieldValue("a", undefined);

        form.updateConfiguration({ dirtyCheckNullAsDefault: false });

        expect(form.getFieldState("a").isDirty).toBe(true);
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

describe("KertyForm.getFieldValue", () => {
    it("should return the value when the field has been registered", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        register(form, "username");
        expect(form.getFieldValue("username")).toBe("bob");
    });

    it("should return the value when the field has not been unregistered", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        expect(form.getFieldValue("username")).toBe("bob");
    });

    it("should return the nested value when a dotted path is registered", () => {
        const form = new KertyForm<ProfileForm>({ data: { person: { name: "John", address: { city: "London" } } } });
        register(form, "person.address.city");
        expect(form.getFieldValue("person.address.city")).toBe("London");
    });

    it("should return the nested value when a dotted path is not registered", () => {
        const form = new KertyForm<ProfileForm>({ data: { person: { name: "John", address: { city: "London" } } } });
        expect(form.getFieldValue("person.address.city")).toBe("London");
    });

    it("should return the item when an indexed path is registered", () => {
        const form = new KertyForm<any>({ data: { tags: ["ts", "js"] } });
        register(form, "tags[1]");
        expect(form.getFieldValue("tags[1]")).toBe("js");
    });

    it("should return the item when an indexed path is not registered", () => {
        const form = new KertyForm<any>({ data: { tags: ["ts", "js"] } });
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
});

describe("KertyForm.clearFieldValue", () => {
    it("should set the value to undefined when called", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        form.clearFieldValue("username");

        expect(form.getData().username).toBeUndefined();
    });

    it("should keep the property key when the value is cleared", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        form.clearFieldValue("username");

        expect(Object.keys(form.getData())).toEqual(["username", "password"]);
    });

    it("should clear every field when a list of names is given", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        form.clearFieldValue(["username", "password"]);

        expect(form.getData()).toEqual({ username: undefined, password: undefined });
    });

    it("should mark the form dirty when a field with an initial value is cleared", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        register(form, "username");

        form.clearFieldValue("username");

        expect(form.getState().isDirty).toBe(true);
    });

    it("should notify the field listener when the value is cleared", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        let calls = 0;
        form.addFieldListener("username", () => { calls++; });

        form.clearFieldValue("username");

        expect(calls).toBe(1);
    });

    it("should not notify the field listener when called in silent mode", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        let calls = 0;
        form.addFieldListener("username", () => { calls++; });

        form.clearFieldValue("username", true);

        expect(calls).toBe(0);
    });
});

describe("KertyForm.removeFieldValue", () => {
    it("should delete the property when called", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        form.removeFieldValue("username");

        expect(Object.keys(form.getData())).toEqual(["password"]);
    });

    it("should delete a nested property without touching its siblings when a nested path is given", () => {
        const form = new KertyForm<any>({ data: { person: { name: "John", age: 30 } } });

        form.removeFieldValue("person.age");

        expect(form.getData()).toEqual({ person: { name: "John" } });
    });

    it("should remove the array item when the path targets an item", () => {
        const form = new KertyForm<any>({ data: { items: ["a", "b", "c"] } });

        form.removeFieldValue("items[1]");

        expect(form.getData().items).toEqual(["a", "c"]);
    });

    it("should remove every field when a list of names is given", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });

        form.removeFieldValue(["username", "password"]);

        expect(form.getData()).toEqual({});
    });

    it("should remove the array item once when its name is listed twice", () => {
        const form = new KertyForm<any>({ data: { items: ["a", "b", "c"] } });

        form.removeFieldValue(["items[1]", "items[1]"]);

        expect(form.getData().items).toEqual(["a", "c"]);
    });

    it("should remove each named array item once when names are repeated among others", () => {
        const form = new KertyForm<any>({ data: { items: ["a", "b", "c", "d"] } });

        form.removeFieldValue(["items[2]", "items[0]", "items[2]"]);

        expect(form.getData().items).toEqual(["b", "d"]);
    });

    it("should remove the nested array item once when its name is listed twice", () => {
        const form = new KertyForm<any>({ data: { orders: [{ lines: ["a", "b", "c"] }] } });

        form.removeFieldValue(["orders[0].lines[1]", "orders[0].lines[1]"]);

        expect(form.getData().orders[0].lines).toEqual(["a", "c"]);
    });

    it("should mark the form dirty when a field with an initial value is removed", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        register(form, "username");

        form.removeFieldValue("username");

        expect(form.getState().isDirty).toBe(true);
    });

    it("should not notify the field listener when called in silent mode", () => {
        const form = new KertyForm<LoginForm>({ data: { username: "bob", password: "pw" } });
        let calls = 0;
        form.addFieldListener("username", () => { calls++; });

        form.removeFieldValue("username", true);

        expect(calls).toBe(0);
    });

    it("should leave the data unchanged when a parent of the path is missing", () => {
        const form = new KertyForm<any>({ data: { name: "John" } });

        form.removeFieldValue("address.street");

        expect(form.getData()).toEqual({ name: "John" });
    });

    it("should not notify listeners when nothing is removed", () => {
        const form = new KertyForm<any>({ data: { name: "John" } });
        let calls = 0;
        form.addListener(() => { calls++; });

        form.removeFieldValue("address.street");

        expect(calls).toBe(0);
    });
});

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
        const form = new KertyForm<any>({ data: { a: "" }, dirtyCheckNullAsDefault: false });
        register(form, "a");

        form.setFieldValue("a", null);

        expect(form.getState().isDirty).toBe(true);
    });

    it("should not mark the form dirty when an empty array becomes null and the default config is used", () => {
        const form = new KertyForm<any>({ data: { a: [] } });
        register(form, "a");

        form.setFieldValue("a", null);

        expect(form.getState().isDirty).toBe(false);
    });

    it("should mark the form dirty when an empty array becomes null and the normalisation is disabled", () => {
        const form = new KertyForm<any>({ data: { a: [] }, dirtyCheckNullAsDefault: false });
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

describe("KertyForm – dirty state of a field registered after its value changed", () => {
    it("should report the field dirty when it is registered after its parent was replaced", () => {
        const form = new KertyForm<ProfileForm>({ data: { person: { name: "John", address: { city: "Riga" } } } });
        form.setFieldValue("person", { name: "Armands", address: { city: "Riga" } });

        register(form, "person.name");

        expect(form.getFieldState("person.name").isDirty).toBe(true);
    });

    it("should report the field of an appended item dirty when it is registered after the item was appended", () => {
        const form = new KertyForm<any>({ data: { items: [{ name: "a" }] } });
        form.appendItems("items", { name: "b" });

        register(form, "items[1].name");

        expect(form.getFieldState("items[1].name").isDirty).toBe(true);
    });

    // The city input is on a tab that is not shown, so nothing listens to "person.address.city".
    // Setting it directly (e.g. from a "copy address" button) creates its field with no listener,
    // and that field stays in the tree. Replacing the parent does not update it, so when the tab
    // is shown again the input gets the stale field instead of a freshly checked one.
    it("should report the field clean when it is shown after its parent was restored to the initial value while it was hidden", () => {
        const form = new KertyForm<ProfileForm>({ data: { person: { name: "John", address: { city: "Riga" } } } });
        register(form, "person.address");
        form.setFieldValue("person.address.city", "Tallinn");
        form.setFieldValue("person.address", { city: "Riga" });

        register(form, "person.address.city");

        expect(form.getFieldState("person.address.city").isDirty).toBe(false);
    });

    it("should report the field clean when it is shown after its parent was changed and restored to the initial value while it was hidden", () => {
        const form = new KertyForm<ProfileForm>({ data: { person: { name: "John", address: { city: "Riga" } } } });
        register(form, "person.address");
        form.setFieldValue("person.address", { city: "Tallinn" });
        form.setFieldValue("person.address", { city: "Riga" });

        register(form, "person.address.city");

        expect(form.getFieldState("person.address.city").isDirty).toBe(false);
    });
});

describe("KertyForm – dirty state of registered ancestors", () => {
    const profileForm = (registeredFields: string[]) => {
        const form = new KertyForm<ProfileForm>({ data: { person: { name: "John", address: { city: "Riga" } } } });
        registeredFields.forEach((fieldName) => register(form, fieldName));
        return form;
    };

    it("should mark the parent dirty when a child value changes", () => {
        const form = profileForm(["person", "person.name"]);

        form.setFieldValue("person.name", "Armands");

        expect(form.getFieldState("person").isDirty).toBe(true);
    });

    it("should mark the grandparent dirty when a nested child value changes", () => {
        const form = profileForm(["person", "person.address.city"]);

        form.setFieldValue("person.address.city", "Tallinn");

        expect(form.getFieldState("person").isDirty).toBe(true);
    });

    it("should mark an ancestor below the top level dirty when a nested child value changes", () => {
        const form = profileForm(["person.address", "person.address.city"]);

        form.setFieldValue("person.address.city", "Tallinn");

        expect(form.getFieldState("person.address").isDirty).toBe(true);
    });

    it("should mark the parent clean when the only changed child returns to its initial value", () => {
        const form = profileForm(["person", "person.name"]);
        form.setFieldValue("person.name", "Armands");

        form.setFieldValue("person.name", "John");

        expect(form.getFieldState("person").isDirty).toBe(false);
    });

    it("should keep the parent dirty when a child returns to its initial value while another child still differs", () => {
        const form = profileForm(["person", "person.name", "person.address.city"]);
        form.setFieldValue("person.name", "Armands");
        form.setFieldValue("person.address.city", "Tallinn");

        form.setFieldValue("person.name", "John");

        expect(form.getFieldState("person").isDirty).toBe(true);
    });

    it("should make the form clean when the only changed child of a dirty parent returns to its initial value", () => {
        const form = profileForm(["person", "person.name"]);
        form.setFieldValue("person.name", "Armands");

        form.setFieldValue("person.name", "John");

        expect(form.getState().isDirty).toBe(false);
    });

    it("should keep the form dirty after another field changes when the changed child unsubscribed while its parent stays registered", () => {
        const form = new KertyForm<ProfileForm>({ data: { person: { name: "John", address: { city: "Riga" } } } });
        register(form, "person");
        const unsubscribe = register(form, "person.name");
        form.setFieldValue("person.name", "Armands");
        unsubscribe();

        form.setFieldValue("person.address.city", "Riga");

        expect(form.getState().isDirty).toBe(true);
    });

    it("should mark the array item dirty when a field of the item changes", () => {
        const form = new KertyForm<any>({ data: { items: [{ name: "a" }] } });
        register(form, "items[0]");
        register(form, "items[0].name");

        form.setFieldValue("items[0].name", "b");

        expect(form.getFieldState("items[0]").isDirty).toBe(true);
    });

    it("should mark the array field dirty when a field of one of its items changes", () => {
        const form = new KertyForm<any>({ data: { items: [{ name: "a" }] } });
        register(form, "items");
        register(form, "items[0].name");

        form.setFieldValue("items[0].name", "b");

        expect(form.getFieldState("items").isDirty).toBe(true);
    });
});

describe("KertyForm – dirty state of ancestors when a property missing from the initial data is cleared", () => {

    it("should mark the parent clean when the missing property is filled in and cleared", () => {
        const form = new KertyForm<any>({ data: { person: {} } });
        register(form, "person");
        form.setFieldValue("person.name", "John");

        form.setFieldValue("person.name", "");

        expect(form.getFieldState("person").isDirty).toBe(false);
    });

    it("should mark the form clean when the missing property is filled in and cleared", () => {
        const form = new KertyForm<any>({ data: { person: {} } });
        register(form, "person");
        form.setFieldValue("person.name", "John");

        form.setFieldValue("person.name", "");

        expect(form.getState().isDirty).toBe(false);
    });

    it("should mark the array clean when a missing item property is filled in and cleared", () => {
        const form = new KertyForm<any>({ data: { items: [{}] } });
        register(form, "items");
        form.setFieldValue("items[0].name", "John");

        form.setFieldValue("items[0].name", "");

        expect(form.getFieldState("items").isDirty).toBe(false);
    });
});

describe("KertyForm – dirty state of registered descendants", () => {
    const personForm = (registeredFields: string[], config: { dirtyCheckEnabled?: boolean } = {}) => {
        const form = new KertyForm<any>({ data: { person: { name: "John", surname: "Smith" } }, ...config });
        registeredFields.forEach((fieldName) => register(form, fieldName));
        return form;
    };

    const itemsForm = (registeredFields: string[]) => {
        const form = new KertyForm<any>({ data: { items: [{ name: "a" }, { name: "b" }] } });
        registeredFields.forEach((fieldName) => register(form, fieldName));
        return form;
    };

    it("should mark a child dirty when its parent is replaced with a different child value", () => {
        const form = personForm(["person", "person.name"]);

        form.setFieldValue("person", { name: "Armands", surname: "Smith" });

        expect(form.getFieldState("person.name").isDirty).toBe(true);
    });

    it("should keep a child clean when its parent is replaced with the same child value", () => {
        const form = personForm(["person", "person.surname"]);

        form.setFieldValue("person", { name: "Armands", surname: "Smith" });

        expect(form.getFieldState("person.surname").isDirty).toBe(false);
    });

    it("should mark a nested descendant dirty when an ancestor further up is replaced", () => {
        const form = new KertyForm<any>({ data: { person: { address: { city: "Riga" } } } });
        register(form, "person.address.city");

        form.setFieldValue("person", { address: { city: "Tallinn" } });

        expect(form.getFieldState("person.address.city").isDirty).toBe(true);
    });

    it("should mark a dirty child clean when its parent is restored to the initial value", () => {
        const form = personForm(["person", "person.name"]);
        form.setFieldValue("person.name", "Armands");

        form.setFieldValue("person", { name: "John", surname: "Smith" });

        expect(form.getFieldState("person.name").isDirty).toBe(false);
    });

    it("should make the form clean when the parent of the only dirty child is restored to the initial value", () => {
        const form = personForm(["person", "person.name"]);
        form.setFieldValue("person.name", "Armands");

        form.setFieldValue("person", { name: "John", surname: "Smith" });

        expect(form.getState().isDirty).toBe(false);
    });

    it("should mark a dirty child clean when its parent stays dirty but the child returns to its initial value", () => {
        const form = personForm(["person", "person.name"]);
        form.setFieldValue("person.name", "Armands");

        form.setFieldValue("person", { name: "John", surname: "Jones" });

        expect(form.getFieldState("person.name").isDirty).toBe(false);
    });

    it("should mark the parent clean when a child is set back to its initial value after the parent was replaced", () => {
        const form = personForm(["person", "person.name"]);
        form.setFieldValue("person", { name: "Armands", surname: "Smith" });

        form.setFieldValue("person.name", "John");

        expect(form.getFieldState("person").isDirty).toBe(false);
    });

    it("should make the form clean when a child is set back to its initial value after the parent was replaced", () => {
        const form = personForm(["person", "person.name"]);
        form.setFieldValue("person", { name: "Armands", surname: "Smith" });

        form.setFieldValue("person.name", "John");

        expect(form.getState().isDirty).toBe(false);
    });

    it("should not mark a child dirty when its parent is replaced and dirty checking is disabled", () => {
        const form = personForm(["person", "person.name"], { dirtyCheckEnabled: false });

        form.setFieldValue("person", { name: "Armands", surname: "Smith" });

        expect(form.getFieldState("person.name").isDirty).toBe(false);
    });

    it.each([
        {
            operation: "prependItems",
            act: (form: KertyForm<any>) => form.prependItems("items", { name: "x" }),
            fieldName: "items[1].name",
        },
        {
            operation: "removeItems",
            act: (form: KertyForm<any>) => form.removeItems("items", 0),
            fieldName: "items[0].name",
        },
        {
            operation: "swapItem",
            act: (form: KertyForm<any>) => form.swapItem("items", 0, 1),
            fieldName: "items[0].name",
        },
        {
            operation: "updateItem",
            act: (form: KertyForm<any>) => form.updateItem("items", 0, { name: "z" }),
            fieldName: "items[0].name",
        },
    ])("should mark the field of an item dirty when $operation changes the value at its index", ({ act, fieldName }) => {
        const form = itemsForm(["items[0].name", "items[1].name"]);

        act(form);

        expect(form.getFieldState(fieldName).isDirty).toBe(true);
    });

    it("should mark the array item field dirty when an item is prepended before it", () => {
        const form = itemsForm(["items[0]"]);

        form.prependItems("items", { name: "x" });

        expect(form.getFieldState("items[0]").isDirty).toBe(true);
    });

    it("should keep the fields of the existing items clean when an item is appended", () => {
        const form = itemsForm(["items[0].name", "items[1].name"]);

        form.appendItems("items", { name: "c" });

        expect(form.getFieldState("items[1].name").isDirty).toBe(false);
    });

    it("should mark a dirty item field clean when the whole array is restored to the initial value", () => {
        const form = itemsForm(["items[0].name"]);
        form.setFieldValue("items[0].name", "z");

        form.setFieldValue("items", [{ name: "a" }, { name: "b" }]);

        expect(form.getFieldState("items[0].name").isDirty).toBe(false);
    });
});

describe("KertyForm – dirty tracking when a field unsubscribes", () => {
    it("should keep the form dirty when another dirty field is still subscribed", () => {
        const form = new KertyForm<any>({ data: { a: 1, b: 1 } });
        const unsubscribe = register(form, "a");
        register(form, "b");
        form.setFieldValue("a", 2);
        form.setFieldValue("b", 2);

        unsubscribe();

        expect(form.getState().isDirty).toBe(true);
    });

    it("should not notify state listeners when a clean field unsubscribes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const unsubscribe = register(form, "a");
        let calls = 0;
        form.addListener(() => calls++, {
            listenDataChange: false,
            listenStateChange: true,
            listenValidationChange: false,
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

describe("KertyForm – silent changes", () => {
    it("should mark the field dirty when a registered field changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.setFieldValue("a", 2, true);

        expect(form.getFieldState("a").isDirty).toBe(true);
    });

    it("should mark the form dirty when a registered field changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.setFieldValue("a", 2, true);

        expect(form.getState().isDirty).toBe(true);
    });

    it("should mark the form dirty when an unregistered field changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });

        form.setFieldValue("a", 2, true);

        expect(form.getState().isDirty).toBe(true);
    });

    it("should make the form clean again when a dirty field is reverted to its initial value", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");
        form.setFieldValue("a", 2);

        form.setFieldValue("a", 1, true);

        expect(form.getState().isDirty).toBe(false);
    });

    it("should mark a registered child dirty when its parent is replaced with a different child value", () => {
        const form = new KertyForm<any>({ data: { person: { name: "John", surname: "Smith" } } });
        register(form, "person");
        register(form, "person.name");

        form.setFieldValue("person", { name: "Armands", surname: "Smith" }, true);

        expect(form.getFieldState("person.name").isDirty).toBe(true);
    });

    it("should mark the field dirty when an item is appended to a registered array", () => {
        const form = new KertyForm<any>({ data: { items: ["a"] } });
        register(form, "items");

        form.appendItems("items", "b", true);

        expect(form.getFieldState("items").isDirty).toBe(true);
    });

    it("should not mark the field touched when a registered field changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.setFieldValue("a", 2, true);

        expect(form.getFieldState("a").isTouched).toBe(false);
    });

    it("should not mark the form touched when a registered field changes", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        register(form, "a");

        form.setFieldValue("a", 2, true);

        expect(form.getState().isTouched).toBe(false);
    });
});

describe("KertyForm – field state without listeners", () => {
    const error = (text: string) => new ValidationResult().add({ text, severity: Severity.Error });

    it("should keep the form invalid when the last listener of an invalid field unsubscribes", () => {
        const form = new KertyForm<any>({ data: { email: "" } });
        const unsubscribe = register(form, "email");
        form.applyFieldValidationResult("email", error("Email is required"));

        unsubscribe();

        expect(form.getState().isValid).toBe(false);
    });

    it("should keep the field validation result when the last listener unsubscribes", () => {
        const form = new KertyForm<any>({ data: { email: "" } });
        const unsubscribe = register(form, "email");
        form.applyFieldValidationResult("email", error("Email is required"));

        unsubscribe();

        expect(form.getValidationMessage("email")?.text).toBe("Email is required");
    });

    it("should make the form valid when the last listener of an invalid field unsubscribes and results are not kept", () => {
        const form = new KertyForm<any>({ data: { email: "" }, keepValidationResultsWithoutListeners: false });
        const unsubscribe = register(form, "email");
        form.applyFieldValidationResult("email", error("Email is required"));

        unsubscribe();

        expect(form.getState().isValid).toBe(true);
    });

    it.each([true, false])("should reset the touched state when the last listener unsubscribes (keep results: %s)", keepValidationResultsWithoutListeners => {
        const form = new KertyForm<any>({ data: { email: "" }, keepValidationResultsWithoutListeners });
        const unsubscribe = register(form, "email");
        form.touch("email");
        unsubscribe();

        register(form, "email");

        expect(form.getFieldState("email").isTouched).toBe(false);
    });

    it.each([true, false])("should keep the form dirty when the last listener of a dirty field unsubscribes (keep results: %s)", keepValidationResultsWithoutListeners => {
        const form = new KertyForm<any>({ data: { email: "", name: "" }, keepValidationResultsWithoutListeners });
        const unsubscribe = register(form, "email");
        form.setFieldValue("email", "a@b.c");
        unsubscribe();

        form.setFieldValue("name", "");

        expect(form.getState().isDirty).toBe(true);
    });

    it("should report the field dirty when its value was changed silently", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        form.setFieldValue("a", 2, true);

        const state = form.getFieldState("a");

        expect(state.isDirty).toBe(true);
    });
});

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

    it("should mark every registered field touched when called without a field name", () => {
        const form = new KertyForm<LoginForm>({});
        register(form, "username");
        register(form, "password");

        form.touch();

        expect([form.getFieldState("username").isTouched, form.getFieldState("password").isTouched]).toEqual([true, true]);
    });

    it("should mark a nested registered field touched when called without a field name", () => {
        const form = new KertyForm<any>({ data: { persons: [{ name: "bob" }] } });
        register(form, "persons[0].name");

        form.touch();

        expect(form.getFieldState("persons[0].name").isTouched).toBe(true);
    });

    it("should notify a field listener when called without a field name", () => {
        const form = new KertyForm<LoginForm>({});
        let calls = 0;
        form.addFieldListener("username", () => { calls++; });

        form.touch();

        expect(calls).toBe(1);
    });

    it("should leave a field registered after the call untouched when called without a field name", () => {
        const form = new KertyForm<LoginForm>({});
        form.touch();

        register(form, "username");

        expect(form.getFieldState("username").isTouched).toBe(false);
    });

    it("should clear the touched state when the form is reset", () => {
        const form = new KertyForm<LoginForm>({});
        form.touch("username");

        form.reset();

        expect([form.getState().isTouched, form.getFieldState("username").isTouched]).toEqual([false, false]);
    });
});

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

    it("should keep a class instance field value when called with new data", () => {
        const form = new KertyForm<PriceForm>({ data: { price: new Money(5), format: () => "" } });
        const price = new Money(9);

        form.reset({ price, format: () => "" });

        expect(form.getFieldValue("price")).toBe(price);
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

    it("should read the latest value through a field snapshot created before the reset", () => {
        const form = new KertyForm<any>({ data: { a: 1 } });
        const snapshot = form.getFieldSnapshot("a");
        form.reset();

        form.setFieldValue("a", 2);

        expect(snapshot().value).toBe(2);
    });

    it("should not validate a subscribed field again when another listener subscribes after the reset", () => {
        let calls = 0;
        const validator = { mode: "fieldDriven" as const, validate: () => { calls++; return new Map(); } };
        const form = new KertyForm<any>({ data: { a: 1, b: 1 }, validator });
        register(form, "a");
        form.getFieldValue("b");
        form.reset();
        form.validate();
        calls = 0;

        register(form, "a");

        expect(calls).toBe(0);
    });

    it("should validate a field when it subscribes again after its listener was removed before the reset", () => {
        let calls = 0;
        const validator = { mode: "fieldDriven" as const, validate: () => { calls++; return new Map(); } };
        const form = new KertyForm<any>({ data: { a: 1 }, validator });
        register(form, "a")();
        form.reset();
        form.validate();
        calls = 0;

        register(form, "a");

        expect(calls).toBe(1);
    });
});

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

describe("KertyForm – data properties that start with a symbol", () => {
    const hashKeyForm = () => {
        const form = new KertyForm<any>({ data: { foo: "a", "#foo": { x: "1" } } });
        register(form, "foo");
        register(form, "#foo.x");
        return form;
    };

    it("should touch the field of a #-prefixed property next to a property of the same name when every field is touched", () => {
        const form = hashKeyForm();

        form.touch();

        expect(form.getFieldState("#foo.x").isTouched).toBe(true);
    });

    it("should report the invalid field of a #-prefixed property next to a property of the same name", () => {
        const form = hashKeyForm();
        form.applyFieldValidationResult("#foo.x", new ValidationResult().add({ text: "Required" }));

        const invalidFields = form.getInvalidFields();

        expect(invalidFields).toEqual(["#foo.x"]);
    });
});

describe("KertyForm – a changed internal name prefix", () => {
    afterEach(() => {
        setInternalNamePrefix(".");
    });

    it("should track the dirty state of a parent when the prefix was changed before the form was created", () => {
        setInternalNamePrefix("~");
        const form = new KertyForm<any>({ data: { person: { name: "John" } } });
        register(form, "person");

        form.setFieldValue("person.name", "Jane");

        expect(form.getFieldState("person").isDirty).toBe(true);
    });
});
