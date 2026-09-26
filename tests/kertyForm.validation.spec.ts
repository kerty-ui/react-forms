import { describe, expect, it } from "vitest";
import { KertyForm } from "../src/lib/kertyForm";
import { FieldValidations, Validator } from "../src/lib/validation/validator";
import { SingleMessageDrivenValidator } from "../src/lib/validation/singleMessageDrivenValidator";
import { ValidationResult } from "../src/lib/validation/validationResult";
import { Validations } from "../src/lib/validation/validations";
import { Severity } from "../src/lib/types";

type LoginForm = {
    username: string;
    password: string;
};

const isTextEmpty = (ctx: any) => {
    return Validations.IsTextEmpty(ctx.value);
}

/** A fieldDriven validator requiring both login fields. */
const requiredLoginValidator = () => new Validator<Partial<LoginForm>>({
    _username: new FieldValidations({ check: isTextEmpty, message: "Username is required" }),
    _password: new FieldValidations({ check: isTextEmpty, message: "Password is required" }),
});

/** A messageDriven validator requiring both login fields. */
const requiredLoginMessageValidator = () => new SingleMessageDrivenValidator<Partial<LoginForm>>((result, { data }) => {
    if (!data.username) result.setFieldMessage("username", "Username is required");
    if (!data.password) result.setFieldMessage("password", "Password is required");
});

const mountedForm = (validator?: any, data: Partial<LoginForm> = {}) => {
    const form = new KertyForm<Partial<LoginForm>>({ data, validator });
    form.addFieldListener("username", () => { });
    form.addFieldListener("password", () => { });
    return form;
};

const error = (text: string) => new ValidationResult().add({ text, severity: Severity.Error });
const warning = (text: string) => new ValidationResult().add({ text, severity: Severity.Warning });

/** A validator that always reports the given form-level result. */
const formLevelValidator = (result: ValidationResult) => ({
    mode: "fieldDriven" as const,
    validate: () => new Map([["", result]]),
});

// ─── validate ────────────────────────────────────────────────────────────────

describe("KertyForm.validate", () => {
    it("should report the form as valid when there is no validator", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });

        expect(form.validate().isValid).toBe(true);
    });

    it("should report the form as invalid when a field rule fails", () => {
        const form = mountedForm(requiredLoginValidator());

        expect(form.validate().isValid).toBe(false);
    });

    it("should list every failing field when validation runs", () => {
        const form = mountedForm(requiredLoginValidator());

        const result = form.validate();

        expect([...result.invalidFields].sort()).toEqual(["password", "username"]);
    });

    it("should expose the field message when a field rule fails", () => {
        const form = mountedForm(requiredLoginValidator());

        form.validate();

        expect(form.getFieldValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should mark the failing field as invalid when validation runs", () => {
        const form = mountedForm(requiredLoginValidator());

        form.validate();

        expect(form.getFieldState("username")).toMatchObject({ isValid: false, isValidated: true });
    });

    it("should mark the form as validated when validation runs", () => {
        const form = mountedForm(requiredLoginValidator(), { username: "bob", password: "pw" });

        form.validate();

        expect(form.getState().isValidated).toBe(true);
    });

    it("should report the form as valid when every rule passes", () => {
        const form = mountedForm(requiredLoginValidator(), { username: "bob", password: "pw" });

        expect(form.validate().isValid).toBe(true);
    });

    it("should clear a previous field message when the value became valid", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.setFieldValue("username", "bob");
        form.setFieldValue("password", "pw");
        form.validate();

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should apply only the active rule set when a rule set is passed", () => {
        const form = mountedForm(new Validator<Partial<LoginForm>>({
            _username: new FieldValidations({ check: isTextEmpty, message: "Username is required", ruleSet: "submit" }),
        }));

        expect([form.validate().isValid, form.validate("submit").isValid]).toEqual([true, false]);
    });

    it("should return an independent set of invalid fields when validation runs twice", () => {
        const form = mountedForm(requiredLoginValidator());
        const first = form.validate();

        form.setFieldValue("username", "bob");
        form.validate();

        expect([...first.invalidFields].sort()).toEqual(["password", "username"]);
    });

    it("should expose the form-level result when the validator reports one under the empty key", () => {
        const form = mountedForm(formLevelValidator(error("Login failed")));

        form.validate();

        expect(form.getValidationMessage()?.text).toBe("Login failed");
    });

    it("should report the form as invalid when the validator reports a form-level error", () => {
        const form = mountedForm(formLevelValidator(error("Login failed")));

        expect(form.validate().isValid).toBe(false);
    });

    it("should ignore an empty form-level result when the validator reports one", () => {
        const form = mountedForm(formLevelValidator(new ValidationResult()));

        form.validate();

        expect(form.getValidationResult()).toBeUndefined();
    });

    it("should drop a previously applied form result when validation runs again", () => {
        const form = mountedForm(requiredLoginValidator(), { username: "bob", password: "pw" });
        form.applyValidationResult(error("Login failed"));

        form.validate();

        expect(form.getValidationResult()).toBeUndefined();
    });
});

// ─── on-change revalidation, fieldDriven ─────────────────────────────────────

describe("KertyForm – fieldDriven revalidation on change", () => {
    it("should not validate the field when it changes before the first validate call", () => {
        const form = mountedForm(requiredLoginValidator());

        form.setFieldValue("username", "");

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should clear the field message when the field becomes valid after having been validated", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should restore the field message when the field becomes invalid again", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();
        form.setFieldValue("username", "bob");

        form.setFieldValue("username", "");

        expect(form.getFieldValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should leave other invalid fields untouched when one field is corrected", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getFieldValidationMessage("password")?.text).toBe("Password is required");
    });

    it("should keep the form invalid when only one of two failing fields is corrected", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getState().isValid).toBe(false);
    });

    it("should make the form valid when the last failing field is corrected", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.setFieldValue("username", "bob");
        form.setFieldValue("password", "pw");

        expect(form.getState().isValid).toBe(true);
    });
});

// ─── on-change revalidation after a passing validate ─────────────────────────

describe("KertyForm – fieldDriven revalidation after a passing validate", () => {
    it("should flag the field when it is cleared after having passed full validation", () => {
        const form = mountedForm(requiredLoginValidator(), { username: "bob", password: "pw" });
        form.validate();

        form.setFieldValue("username", "");

        expect(form.getFieldValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should make the form invalid when a passing field is cleared after full validation", () => {
        const form = mountedForm(requiredLoginValidator(), { username: "bob", password: "pw" });
        form.validate();

        form.setFieldValue("username", "");

        expect(form.getState().isValid).toBe(false);
    });

    it("should still not validate on change when the form has never been validated", () => {
        const form = mountedForm(requiredLoginValidator(), { username: "bob", password: "pw" });

        form.setFieldValue("username", "");

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should validate a field that was registered after the form was validated", () => {
        const form = new KertyForm<Partial<LoginForm>>({
            data: { username: "bob", password: "pw" },
            validator: requiredLoginValidator(),
        });
        form.addFieldListener("username", () => { });
        form.validate();

        form.addFieldListener("password", () => { });
        form.setFieldValue("password", "");

        expect(form.getFieldValidationMessage("password")?.text).toBe("Password is required");
    });
});

// ─── dependent and conditional fields on change ──────────────────────────────

describe("KertyForm – dependent fields on change", () => {
    const passwordForm = (data: { password: string; confirmPassword: string }) => {
        const form = new KertyForm<any>({
            data,
            validator: new Validator<any>({
                _password: new FieldValidations({ check: isTextEmpty, message: "Password is required" }),
                _confirmPassword: new FieldValidations({
                    check: (ctx) => ctx.value !== ctx.parent.password,
                    message: "Passwords must match",
                    hasDependency: true,
                }),
            }),
        });
        form.addFieldListener("password", () => { });
        form.addFieldListener("confirmPassword", () => { });
        return form;
    };

    it("should flag the dependent field when the field it depends on changes", () => {
        const form = passwordForm({ password: "abc", confirmPassword: "abc" });
        form.validate();

        form.setFieldValue("password", "xyz");

        expect(form.getFieldValidationMessage("confirmPassword")?.text).toBe("Passwords must match");
    });

    it("should make the form invalid when the dependent field starts failing", () => {
        const form = passwordForm({ password: "abc", confirmPassword: "abc" });
        form.validate();

        form.setFieldValue("password", "xyz");

        expect(form.getState().isValid).toBe(false);
    });

    it("should clear the dependent field message when it becomes valid again", () => {
        const form = passwordForm({ password: "abc", confirmPassword: "abc" });
        form.validate();
        form.setFieldValue("password", "xyz");

        form.setFieldValue("password", "abc");

        expect(form.getFieldValidationMessage("confirmPassword")).toBeUndefined();
    });

    it("should make the form valid again when the dependent field stops failing", () => {
        const form = passwordForm({ password: "abc", confirmPassword: "abc" });
        form.validate();
        form.setFieldValue("password", "xyz");

        form.setFieldValue("password", "abc");

        expect(form.getState().isValid).toBe(true);
    });

    it("should notify the dependent field's listener when it starts failing", () => {
        const form = passwordForm({ password: "abc", confirmPassword: "abc" });
        form.validate();
        let calls = 0;
        form.addFieldListener("confirmPassword", () => calls++);

        form.setFieldValue("password", "xyz");

        expect(calls).toBe(1);
    });
});

// ─── on-change revalidation of array item fields ─────────────────────────────

describe("KertyForm – fieldDriven revalidation of array item fields", () => {
    const gridForm = (items: { name: string }[]) => {
        const form = new KertyForm<any>({
            data: { items },
            validator: new Validator<any>({
                items: [{ _name: new FieldValidations({ check: isTextEmpty, message: "Name is required" }) }],
            }),
        });
        items.forEach((_, index) => form.addFieldListener(`items[${index}].name`, () => { }));
        return form;
    };

    it("should keep the form invalid when the edited item field is still empty", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.setFieldValue("items[0].name", "");

        expect(form.getState().isValid).toBe(false);
    });

    it("should keep the item message when the edited item field is still empty", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.setFieldValue("items[0].name", "");

        expect(form.getFieldValidationMessage("items[0].name")?.text).toBe("Name is required");
    });

    it("should clear the item message when the edited item field is filled in", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.setFieldValue("items[0].name", "John");

        expect(form.getFieldValidationMessage("items[0].name")).toBeUndefined();
    });

    it("should make the form valid when the last failing item field is filled in", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.setFieldValue("items[0].name", "John");

        expect(form.getState().isValid).toBe(true);
    });

    it("should keep the form invalid when another item is still failing", () => {
        const form = gridForm([{ name: "" }, { name: "" }]);
        form.validate();

        form.setFieldValue("items[0].name", "John");

        expect(form.getState().isValid).toBe(false);
    });

    it("should report the item message again when an item field is cleared after having failed once", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();
        form.setFieldValue("items[0].name", "John");

        form.setFieldValue("items[0].name", "");

        expect(form.getFieldValidationMessage("items[0].name")?.text).toBe("Name is required");
    });
});

// ─── on-change revalidation after array mutations ────────────────────────────

/*
 * Intended behaviour - these currently FAIL. An array mutation reports the array
 * itself as the changed field - `items` - which matches no item rule, so nothing
 * under it is revalidated and the results stay keyed to the old indexes.
 * See #validateInternal in src/lib/validation/validator.ts.
 */
describe("KertyForm – fieldDriven revalidation after an array mutation", () => {
    const gridForm = (items: { name: string }[]) => {
        const form = new KertyForm<any>({
            data: { items },
            validator: new Validator<any>({
                items: [{ _name: new FieldValidations({ check: isTextEmpty, message: "Name is required" }) }],
            }),
        });
        items.forEach((_, index) => form.addFieldListener(`items[${index}].name`, () => { }));
        return form;
    };

    it("should report the message for an appended failing item when the form was already validated", () => {
        const form = gridForm([{ name: "John" }]);
        form.validate();

        form.appendItems("items", { name: "" });

        expect(form.getFieldValidationMessage("items[1].name")?.text).toBe("Name is required");
    });

    it("should make the form invalid when an appended item fails a rule", () => {
        const form = gridForm([{ name: "John" }]);
        form.validate();

        form.appendItems("items", { name: "" });

        expect(form.getState().isValid).toBe(false);
    });

    it("should report the message for the appended failing item when the whole form is validated again", () => {
        const form = gridForm([{ name: "John" }]);
        form.validate();
        form.appendItems("items", { name: "" });

        form.validate();

        expect(form.getFieldValidationMessage("items[1].name")?.text).toBe("Name is required");
    });

    it("should clear the message of the first item when a valid item is prepended before the failing one", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.prependItems("items", { name: "John" });

        expect(form.getFieldValidationMessage("items[0].name")).toBeUndefined();
    });

    it("should report the message at the new index of the failing item when a valid item is prepended", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.prependItems("items", { name: "John" });

        expect(form.getFieldValidationMessage("items[1].name")?.text).toBe("Name is required");
    });

    it("should report the message at the new index of the failing item when two items are swapped", () => {
        const form = gridForm([{ name: "John" }, { name: "" }]);
        form.validate();

        form.swapItem("items", 0, 1);

        expect(form.getFieldValidationMessage("items[0].name")?.text).toBe("Name is required");
    });

    it("should clear the message of the swapped-away index when two items are swapped", () => {
        const form = gridForm([{ name: "John" }, { name: "" }]);
        form.validate();

        form.swapItem("items", 0, 1);

        expect(form.getFieldValidationMessage("items[1].name")).toBeUndefined();
    });

    it("should clear the message of the removed item when the only failing item is removed", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.removeItems("items", 0);

        expect(form.getFieldValidationMessage("items[0].name")).toBeUndefined();
    });

    it("should make the form valid when the only failing item is removed", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.removeItems("items", 0);

        expect(form.getState().isValid).toBe(true);
    });

    it("should clear the message of the last index when the last item is removed while an earlier item still fails", () => {
        const form = gridForm([{ name: "" }, { name: "" }]);
        form.validate();

        form.removeItems("items", 1);

        expect(form.getFieldValidationMessage("items[1].name")).toBeUndefined();
    });

    it("should keep the message of the remaining failing item when the last item is removed", () => {
        const form = gridForm([{ name: "" }, { name: "" }]);
        form.validate();

        form.removeItems("items", 1);

        expect(form.getFieldValidationMessage("items[0].name")?.text).toBe("Name is required");
    });

    it("should report the message when an existing item is replaced by a failing one", () => {
        const form = gridForm([{ name: "John" }]);
        form.validate();

        form.updateItem("items", 0, { name: "" });

        expect(form.getFieldValidationMessage("items[0].name")?.text).toBe("Name is required");
    });
});

describe("KertyForm – messageDriven revalidation on change", () => {
    it("should report both fields as invalid when the whole form is validated", () => {
        const form = mountedForm(requiredLoginMessageValidator());

        expect([...form.validate().invalidFields].sort()).toEqual(["password", "username"]);
    });

    it("should re-run the whole validator when any field changes after the form was validated", () => {
        const form = mountedForm(requiredLoginMessageValidator());
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should keep messages for the still-failing fields when one field is corrected", () => {
        const form = mountedForm(requiredLoginMessageValidator());
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getFieldValidationMessage("password")?.text).toBe("Password is required");
    });

    it("should make the form valid when every field is corrected", () => {
        const form = mountedForm(requiredLoginMessageValidator());
        form.validate();

        form.setFieldValue("username", "bob");
        form.setFieldValue("password", "pw");

        expect(form.getState().isValid).toBe(true);
    });

    it("should not validate on change when the form has never been validated", () => {
        const form = mountedForm(requiredLoginMessageValidator());

        form.setFieldValue("username", "");

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });
});

// ─── applying results from outside ───────────────────────────────────────────

describe("KertyForm.applyValidationResult", () => {
    it("should expose the applied result when a form-level result is applied", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });

        form.applyValidationResult(error("Login failed"));

        expect(form.getValidationMessage()?.text).toBe("Login failed");
    });

    it("should mark the form invalid when an error-severity result is applied", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });

        form.applyValidationResult(error("Login failed"));

        expect(form.getState().isValid).toBe(false);
    });

    it("should keep the form valid when a success-severity result is applied", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });

        form.applyValidationResult(new ValidationResult().add({ text: "Welcome", severity: Severity.Success }));

        expect(form.getState().isValid).toBe(true);
    });

    it("should replace the previous result when applied without options", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });
        form.applyValidationResult(error("First"));

        form.applyValidationResult(error("Second"));

        expect(form.getValidationResult()?.messages.map(m => m.text)).toEqual(["Second"]);
    });

    it("should keep both results when applied in merge mode", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });
        form.applyValidationResult(error("First"));

        form.applyValidationResult(error("Second"), { mode: "merge" });

        expect(form.getValidationResult()?.messages.map(m => m.text)).toEqual(["First", "Second"]);
    });

    it("should ignore the call when the result carries no messages in merge mode", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });
        form.applyValidationResult(error("First"));

        form.applyValidationResult(new ValidationResult(), { mode: "merge" });

        expect(form.getValidationMessage()?.text).toBe("First");
    });

    it("should drop the form result when a field value changes afterwards", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });
        form.applyValidationResult(error("Login failed"));

        form.setFieldValue("username", "bob");

        expect(form.getValidationResult()).toBeUndefined();
    });

    it("should keep the form result on change when clearing on change is disabled", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, clearFormValidationResultsOnChange: false });
        form.applyValidationResult(error("Login failed"));

        form.setFieldValue("username", "bob");

        expect(form.getValidationMessage()?.text).toBe("Login failed");
    });
});

describe("KertyForm.applyFieldValidationResult", () => {
    it("should expose the applied message when the field is registered", () => {
        const form = mountedForm();

        form.applyFieldValidationResult("username", error("Taken"));

        expect(form.getFieldValidationMessage("username")?.text).toBe("Taken");
    });

    it("should mark the field invalid when an error-severity result is applied", () => {
        const form = mountedForm();

        form.applyFieldValidationResult("username", error("Taken"));

        expect(form.getFieldState("username").isValid).toBe(false);
    });

    it("should mark the form invalid when an error-severity field result is applied", () => {
        const form = mountedForm();

        form.applyFieldValidationResult("username", error("Taken"));

        expect(form.getState().isValid).toBe(false);
    });

    it("should ignore the call when the field was never registered", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });

        form.applyFieldValidationResult("username", error("Taken"), {
            unknownFieldBehavior: "ignore"
        });

        expect(form.getState().isValid).toBe(true);
    });

    it("should keep both messages when applied in merge mode", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("First"));
        form.applyFieldValidationResult("username", error("Second"), { mode: "merge" });

        expect(form.getFieldValidationResult("username")?.messages.map(m => m.text)).toEqual(["First", "Second"]);
    });
});

describe("KertyForm – externally applied field results without a validator", () => {
    it("should clear the field message when the field changes afterwards", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        form.setFieldValue("username", "alice");

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should make the field valid again when the field changes afterwards", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        form.setFieldValue("username", "alice");

        expect(form.getFieldState("username")).toMatchObject({ isValid: true, isValidated: false });
    });

    it("should make the form valid again when the last invalid field changes afterwards", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        form.setFieldValue("username", "alice");

        expect(form.getState().isValid).toBe(true);
    });

    it("should mark the form as not validated when the field changes afterwards", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        form.setFieldValue("username", "alice");

        expect(form.getState().isValidated).toBe(false);
    });

    it("should leave a different field's message in place when one field changes", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));
        form.applyFieldValidationResult("password", error("Too short"), { mode: "patch" });

        form.setFieldValue("username", "alice");

        expect(form.getFieldValidationMessage("password")?.text).toBe("Too short");
    });
});

describe("KertyForm.getFieldValidationResult", () => {
    it("should return undefined when the field was never registered", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: { username: "bob" } });

        expect(form.getFieldValidationResult("username")).toBeUndefined();
    });

    it("should register the field when its validation result is read", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: { username: "bob" } });

        form.getFieldValidationResult("username");

        expect(form.getFieldValue("username")).toBe("bob");
    });

    it("should not register the field when its validation message is read", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: { username: "bob" } });

        form.getFieldValidationMessage("username");

        expect(form.getFieldState("username").isValidated).toBe(false);
    });

    it("should return undefined when the field name is not a valid path", () => {
        const form = new KertyForm<any>({ data: { username: "bob" } });

        expect(form.getFieldValidationResult("not a path")).toBeUndefined();
    });

    it("should return the result when the validator reported on a field with no listener", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator: requiredLoginValidator() });
        form.validate();

        expect(form.getFieldValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should return the result when the field is registered", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        expect(form.getFieldValidationMessage("username")?.text).toBe("Taken");
    });

    it("should stop returning the result once the field unsubscribes", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });
        const unsubscribe = form.addFieldListener("username", () => { });
        form.applyFieldValidationResult("username", error("Taken"));

        unsubscribe();

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });
});

describe("KertyForm.applyValidationResults", () => {
    it("should apply each field result when a map is given", () => {
        const form = mountedForm();

        form.applyValidationResults(new Map([["username", error("Taken")]]));

        expect(form.getFieldValidationMessage("username")?.text).toBe("Taken");
    });

    it("should apply the form result when the map contains the empty key", () => {
        const form = mountedForm();

        form.applyValidationResults(new Map([["", error("Login failed")]]));

        expect(form.getValidationMessage()?.text).toBe("Login failed");
    });

    it("should clear previous field results when applied in replace mode", () => {
        const form = mountedForm();
        form.applyValidationResults(new Map([["username", error("Taken")]]), { mode: "replace" });

        form.applyValidationResults(new Map([["password", error("Too short")]]), { mode: "replace" });

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should keep previous field results when applied in merge mode", () => {
        const form = mountedForm();
        form.applyValidationResults(new Map([["username", error("Taken")]]));

        form.applyValidationResults(new Map([["password", error("Too short")]]), { mode: "merge" });

        expect(form.getFieldValidationMessage("username")?.text).toBe("Taken");
    });

    it("should clear a field result when the map holds an empty result for it in merge mode", () => {
        const form = mountedForm();
        form.applyValidationResults(new Map([["username", error("Taken")]]));

        form.applyValidationResults(new Map([["username", new ValidationResult()]]), { mode: "merge" });

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should make the form valid again when every field result is cleared in merge mode", () => {
        const form = mountedForm();
        form.applyValidationResults(new Map([["username", error("Taken")]]));

        form.applyValidationResults(new Map([["username", new ValidationResult()]]), { mode: "merge" });

        expect(form.getState().isValid).toBe(true);
    });

    it("should leave the form untouched when an empty map is applied in merge mode", () => {
        const form = mountedForm();
        form.applyValidationResults(new Map([["username", error("Taken")]]));

        form.applyValidationResults(new Map(), { mode: "merge" });

        expect(form.getFieldValidationMessage("username")?.text).toBe("Taken");
    });

    it("should clear the previous form result when applied in replace mode", () => {
        const form = mountedForm();
        form.applyValidationResult(error("Login failed"));

        form.applyValidationResults(new Map([["username", error("Taken")]]), { mode: "replace" });

        expect(form.getValidationResult()).toBeUndefined();
    });

    it("should keep the field valid when only a warning is applied to it", () => {
        const form = mountedForm();

        form.applyValidationResults(new Map([["username", warning("Weak")]]));

        expect(form.getFieldState("username")).toMatchObject({ isValid: true, isValidated: true });
    });

    it("should make the form valid again when a field error is patched with a warning", () => {
        const form = mountedForm();
        form.applyValidationResults(new Map([["username", error("Taken")]]));

        form.applyValidationResults(new Map([["username", warning("Weak")]]));

        expect(form.getState().isValid).toBe(true);
    });
});

describe("KertyForm.resetValidationResults", () => {
    it("should clear the form result when called without arguments", () => {
        const form = mountedForm();
        form.applyValidationResult(error("Login failed"));

        form.resetValidationResults();

        expect(form.getValidationResult()).toBeUndefined();
    });

    it("should clear every field result when called without arguments", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.resetValidationResults();

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should make the form valid again when called without arguments", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.resetValidationResults();

        expect(form.getState().isValid).toBe(true);
    });

    it("should mark the form as not validated when called without arguments", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.resetValidationResults();

        expect(form.getState().isValidated).toBe(false);
    });

    it("should clear only the named field when called with a field name", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.resetFieldValidationResults("username");

        expect(form.getFieldValidationMessage("password")?.text).toBe("Password is required");
    });

    it("should clear the named field when called with a field name", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.resetFieldValidationResults("username");

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should clear every named field when called with a list", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.resetFieldValidationResults(["username", "password"]);

        expect(form.getState().isValid).toBe(true);
    });

    it("should leave the form result in place when called with a field name", () => {
        const form = mountedForm(requiredLoginValidator());
        form.applyValidationResult(error("Login failed"));

        form.resetFieldValidationResults("username");

        expect(form.getValidationMessage()?.text).toBe("Login failed");
    });
});

// ─── reset clears validation ─────────────────────────────────────────────────

describe("KertyForm.reset – validation", () => {
    it("should clear the form validation result when the form is reset", () => {
        const form = mountedForm();
        form.applyValidationResult(error("Login failed"));

        form.reset();

        expect(form.getValidationResult()).toBeUndefined();
    });

    it("should clear the field validation results when the form is reset", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.reset();

        expect(form.getFieldValidationMessage("username")).toBeUndefined();
    });

    it("should make the form valid again when the form is reset", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.reset();

        expect(form.getState().isValid).toBe(true);
    });
});

// ─── setValidator ────────────────────────────────────────────────────────────

describe("KertyForm.setValidator", () => {
    it("should use the new validator when one is set after construction", () => {
        const form = mountedForm();

        form.setValidator(requiredLoginValidator());

        expect(form.validate().isValid).toBe(false);
    });

    it("should keep the current validator when null is passed", () => {
        const form = mountedForm(requiredLoginValidator());

        form.setValidator(undefined);

        expect(form.validate().isValid).toBe(false);
    });
});
