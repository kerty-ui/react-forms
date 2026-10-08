import { describe, expect, it } from "vitest";
import {
    KertyForm,
    FieldValidations,
    Validator,
    SingleMessageDrivenValidator,
    ValidatorBuilder,
    ValidationResult,
    Validations,
    Severity,
    type FieldPath,
    type IKertyForm
} from "../src/lib";
import { treeOf } from "./validationResultTree.helpers";

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
    validate: () => treeOf([["", result]]),
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

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should mark the failing field as invalid when validation runs", () => {
        const form = mountedForm(requiredLoginValidator());

        form.validate();

        expect(form.getFieldState("username")).toMatchObject({ isValid: false, isValidated: true });
    });

    it.each([
        { mode: "fieldDriven", validator: requiredLoginValidator },
        { mode: "messageDriven", validator: requiredLoginMessageValidator },
    ])("should mark a registered field without messages as valid and validated when a $mode validator runs", ({ validator }) => {
        const form = mountedForm(validator(), { username: "bob" });

        form.validate();

        expect(form.getFieldState("username")).toMatchObject({ isValid: true, isValidated: true });
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

        expect(form.getValidationMessage("username")).toBeUndefined();
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

// ─── validate result caching ─────────────────────────────────────────────────

/** A fieldDriven validator that counts its full-form runs. */
const countingValidator = () => {
    const validator = {
        mode: "fieldDriven" as const,
        fullRuns: 0,
        validate: ({ fieldName }: { fieldName?: string | null }) => {
            if (fieldName == null) validator.fullRuns++;
            return treeOf();
        },
    };
    return validator;
};

const validatedCountingForm = (cacheValidationResult?: boolean) => {
    const validator = countingValidator();
    const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator, cacheValidationResult });
    form.addFieldListener("username", () => { });
    form.validate();
    return { form, validator };
};

const cacheInvalidatingOperations = [
    { operation: "setFieldValue()", invalidate: (form: KertyForm<Partial<LoginForm>>) => form.setFieldValue("username", "bob") },
    { operation: "silent setFieldValue()", invalidate: (form: KertyForm<Partial<LoginForm>>) => form.setFieldValue("username", "bob", true) },
    { operation: "reset()", invalidate: (form: KertyForm<Partial<LoginForm>>) => form.reset() },
    { operation: "applyValidationResult()", invalidate: (form: KertyForm<Partial<LoginForm>>) => form.applyValidationResult(error("Login failed")) },
    { operation: "resetValidationResults()", invalidate: (form: KertyForm<Partial<LoginForm>>) => form.resetValidationResults() },
    { operation: "resetFieldValidationResults()", invalidate: (form: KertyForm<Partial<LoginForm>>) => form.resetFieldValidationResults("username") },
];

describe("KertyForm.validate – result caching", () => {
    it("should return the previous result when validation runs again without changes", () => {
        const { form } = validatedCountingForm();
        const first = form.validate("submit");

        const second = form.validate("submit");

        expect(second).toBe(first);
    });

    it("should not run the validator when validation runs again without changes", () => {
        const { form, validator } = validatedCountingForm();

        form.validate();

        expect(validator.fullRuns).toBe(1);
    });

    it("should not notify listeners when validation runs again without changes", () => {
        const { form } = validatedCountingForm();
        let notifications = 0;
        form.addListener(() => notifications++);

        form.validate();

        expect(notifications).toBe(0);
    });

    it("should run the validator when a different rule set is passed", () => {
        const { form, validator } = validatedCountingForm();

        form.validate("submit");

        expect(validator.fullRuns).toBe(2);
    });

    it.each(cacheInvalidatingOperations)("should run the validator when $operation was called after the last validation", ({ invalidate }) => {
        const { form, validator } = validatedCountingForm();
        invalidate(form);

        form.validate();

        expect(validator.fullRuns).toBe(2);
    });

    it("should run the new validator when a validator was set after the last validation", () => {
        const { form } = validatedCountingForm();
        const newValidator = countingValidator();
        form.setValidator(newValidator);

        form.validate();

        expect(newValidator.fullRuns).toBe(1);
    });

    it("should run the validator when caching is disabled", () => {
        const { form, validator } = validatedCountingForm(false);

        form.validate();

        expect(validator.fullRuns).toBe(2);
    });

    it("should run the validator when caching was disabled after the last validation", () => {
        const { form, validator } = validatedCountingForm();
        form.updateConfiguration({ cacheValidationResult: false });

        form.validate();

        expect(validator.fullRuns).toBe(2);
    });

    it("should run the validator when caching was re-enabled after a change", () => {
        const { form, validator } = validatedCountingForm(false);
        form.setFieldValue("username", "bob");
        form.updateConfiguration({ cacheValidationResult: true });

        form.validate();

        expect(validator.fullRuns).toBe(2);
    });

    it("should replace an applied field result when validation runs again", () => {
        const form = mountedForm(requiredLoginValidator(), { username: "bob", password: "pw" });
        form.validate();
        form.applyFieldValidationResult("username", error("Username is taken"));

        form.validate();

        expect(form.getValidationMessage("username")).toBeUndefined();
    });
});

// ─── on-change revalidation, fieldDriven ─────────────────────────────────────

describe("KertyForm – fieldDriven revalidation on change", () => {
    it("should not validate the field when it changes before the first validate call", () => {
        const form = mountedForm(requiredLoginValidator());

        form.setFieldValue("username", "");

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should clear the field message when the field becomes valid after having been validated", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should restore the field message when the field becomes invalid again", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();
        form.setFieldValue("username", "bob");

        form.setFieldValue("username", "");

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should leave other invalid fields untouched when one field is corrected", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getValidationMessage("password")?.text).toBe("Password is required");
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

    it("should not throw when the validator returns a form-level result while a changed field is revalidated", () => {
        const form = mountedForm(formLevelValidator(error("Login failed")));
        form.validate();

        expect(() => form.setFieldValue("username", "bob")).not.toThrow();
    });

    it("should not apply a form-level result when a changed field is revalidated", () => {
        const form = mountedForm(formLevelValidator(error("Login failed")));
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getValidationResult()).toBeUndefined();
    });

    it("should not throw when a field mounts after validate and the validator returns a form-level result", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator: formLevelValidator(error("Login failed")) });
        form.validate();

        expect(() => form.addFieldListener("username", () => { })).not.toThrow();
    });
});

// ─── on-change revalidation after a passing validate ─────────────────────────

describe("KertyForm – fieldDriven revalidation after a passing validate", () => {
    it("should flag the field when it is cleared after having passed full validation", () => {
        const form = mountedForm(requiredLoginValidator(), { username: "bob", password: "pw" });
        form.validate();

        form.setFieldValue("username", "");

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
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

        expect(form.getValidationMessage("username")).toBeUndefined();
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

        expect(form.getValidationMessage("password")?.text).toBe("Password is required");
    });
});

// ─── on-change revalidation disabled ─────────────────────────────────────────

const validatedFormWithoutChangeValidation = (validator: any, data: Partial<LoginForm> = {}) => {
    const form = new KertyForm<Partial<LoginForm>>({ data, validator, validateOnValueChange: false });
    form.addFieldListener("username", () => { });
    form.addFieldListener("password", () => { });
    form.validate();
    return form;
};

describe("KertyForm – validateOnValueChange disabled", () => {
    it("should keep the field message when a fieldDriven field becomes valid", () => {
        const form = validatedFormWithoutChangeValidation(requiredLoginValidator());

        form.setFieldValue("username", "bob");

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should not flag a fieldDriven field when it is cleared after passing validation", () => {
        const form = validatedFormWithoutChangeValidation(requiredLoginValidator(), { username: "bob", password: "pw" });

        form.setFieldValue("username", "");

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should keep the form valid when a fieldDriven field is cleared after passing validation", () => {
        const form = validatedFormWithoutChangeValidation(requiredLoginValidator(), { username: "bob", password: "pw" });

        form.setFieldValue("username", "");

        expect(form.getState().isValid).toBe(true);
    });

    it("should keep the field message when a messageDriven field becomes valid", () => {
        const form = validatedFormWithoutChangeValidation(requiredLoginMessageValidator());

        form.setFieldValue("username", "bob");

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should apply the changed value when validate is called after a change", () => {
        const form = validatedFormWithoutChangeValidation(requiredLoginValidator());
        form.setFieldValue("username", "bob");

        form.validate();

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should keep the field message when validation on change was disabled at runtime", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();
        form.updateConfiguration({ validateOnValueChange: false });

        form.setFieldValue("username", "bob");

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should clear the field message when validation on change was re-enabled at runtime", () => {
        const form = validatedFormWithoutChangeValidation(requiredLoginValidator());
        form.updateConfiguration({ validateOnValueChange: true });

        form.setFieldValue("username", "bob");

        expect(form.getValidationMessage("username")).toBeUndefined();
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

        expect(form.getValidationMessage("confirmPassword")?.text).toBe("Passwords must match");
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

        expect(form.getValidationMessage("confirmPassword")).toBeUndefined();
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

describe("KertyForm – dependent fields whose result does not change", () => {
    const nicknameForm = (nickname: string) => {
        const form = new KertyForm<any>({
            data: { name: "", nickname },
            validator: new Validator<any>({
                _nickname: new FieldValidations({ check: isTextEmpty, message: "Nickname is required", hasDependency: true }),
            }),
        });
        form.addFieldListener("name", () => { });
        form.addFieldListener("nickname", () => { });
        form.validate();
        return form;
    };

    it("should keep the snapshot of a dependent field that still passes when another field changes", () => {
        const form = nicknameForm("Johnny");
        const snapshot = form.getFieldSnapshot("nickname");
        const before = snapshot();

        form.setFieldValue("name", "John");

        expect(snapshot()).toBe(before);
    });

    it("should not notify the listener of a dependent field that still passes when another field changes", () => {
        const form = nicknameForm("Johnny");
        let calls = 0;
        form.addFieldListener("nickname", () => calls++);

        form.setFieldValue("name", "John");

        expect(calls).toBe(0);
    });

    it("should notify the listener of a dependent field when its message changes", () => {
        const form = new KertyForm<any>({
            data: { name: "", nickname: "" },
            validator: new Validator<any>({
                _nickname: new FieldValidations({
                    check: () => true,
                    message: (ctx: any) => `Nickname for ${ctx.parent.name} is required`,
                    hasDependency: true,
                }),
            }),
        });
        form.addFieldListener("nickname", () => { });
        form.validate();
        let calls = 0;
        form.addFieldListener("nickname", () => calls++);

        form.setFieldValue("name", "John");

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

        expect(form.getValidationMessage("items[0].name")?.text).toBe("Name is required");
    });

    it("should clear the item message when the edited item field is filled in", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.setFieldValue("items[0].name", "John");

        expect(form.getValidationMessage("items[0].name")).toBeUndefined();
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

        expect(form.getValidationMessage("items[0].name")?.text).toBe("Name is required");
    });
});

describe("KertyForm – fieldDriven revalidation of a rule on an ancestor of the changed field", () => {
    const checklistForm = () => {
        const form = new KertyForm<any>({
            data: { items: [{ checked: false }, { checked: false }] },
            validator: new Validator<any>({
                _items: new FieldValidations({
                    check: (ctx: any) => !ctx.value.some((item: any) => item.checked),
                    message: "Check one item",
                }),
            }),
        });
        form.addFieldListener("items", () => { });
        return form;
    };

    it("should clear the array message when an item field change makes the array valid", () => {
        const form = checklistForm();
        form.validate();

        form.setFieldValue("items[1].checked", true);

        expect(form.getValidationMessage("items")).toBeUndefined();
    });

    it("should make the form valid when an item field change makes the array valid", () => {
        const form = checklistForm();
        form.validate();

        form.setFieldValue("items[1].checked", true);

        expect(form.getState().isValid).toBe(true);
    });

    it("should report the array message when an item field change makes the array invalid", () => {
        const form = checklistForm();
        form.setFieldValue("items[0].checked", true);
        form.validate();

        form.setFieldValue("items[0].checked", false);

        expect(form.getValidationMessage("items")?.text).toBe("Check one item");
    });
});

// ─── validation of primitive array items ─────────────────────────────────────

describe("KertyForm – fieldDriven validation of primitive array items", () => {
    const numbersForm = (numbers: number[]) => {
        const form = new KertyForm<any>({
            data: { numbers },
            validator: new Validator<any>({
                numbers: [new FieldValidations({ check: (ctx: any) => ctx.value === 2, message: "number two is not allowed" })],
            }),
        });
        numbers.forEach((_, index) => form.addFieldListener(`numbers[${index}]`, () => { }));
        return form;
    };

    it("should report the message on the item when its value fails the rule", () => {
        const form = numbersForm([1, 2, 3]);

        form.validate();

        expect(form.getValidationMessage("numbers[1]")?.text).toBe("number two is not allowed");
    });

    it.each(["numbers[0]", "numbers[2]"])("should not report a message on %s when its value passes the rule", (fieldName) => {
        const form = numbersForm([1, 2, 3]);

        form.validate();

        expect(form.getValidationMessage(fieldName)).toBeUndefined();
    });

    it("should attach the message to the failing primitive item when the builder rule checks the item value", () => {
        const form = new KertyForm<{ numbers: number[] }>({
            data: { numbers: [1, 2, 3] },
            validator: new ValidatorBuilder<{ numbers: number[] }>()
                .setup((b) => b.validationFor("numbers[]").add({ check: (ctx) => ctx.value === 2, message: "number two is not allowed" }))
                .build(),
        });

        const result = form.validate();

        expect([...result.invalidFields]).toEqual(["numbers[1]"]);
        expect(form.getValidationMessage("numbers[1]")?.text).toBe("number two is not allowed");
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

        expect(form.getValidationMessage("items[1].name")?.text).toBe("Name is required");
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

        expect(form.getValidationMessage("items[1].name")?.text).toBe("Name is required");
    });

    it("should clear the message of the first item when a valid item is prepended before the failing one", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.prependItems("items", { name: "John" });

        expect(form.getValidationMessage("items[0].name")).toBeUndefined();
    });

    it("should report the message at the new index of the failing item when a valid item is prepended", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.prependItems("items", { name: "John" });

        expect(form.getValidationMessage("items[1].name")?.text).toBe("Name is required");
    });

    it("should report the message at the new index of the failing item when two items are swapped", () => {
        const form = gridForm([{ name: "John" }, { name: "" }]);
        form.validate();

        form.swapItem("items", 0, 1);

        expect(form.getValidationMessage("items[0].name")?.text).toBe("Name is required");
    });

    it("should clear the message of the swapped-away index when two items are swapped", () => {
        const form = gridForm([{ name: "John" }, { name: "" }]);
        form.validate();

        form.swapItem("items", 0, 1);

        expect(form.getValidationMessage("items[1].name")).toBeUndefined();
    });

    it("should clear the message of the removed item when the only failing item is removed", () => {
        const form = gridForm([{ name: "" }]);
        form.validate();

        form.removeItems("items", 0);

        expect(form.getValidationMessage("items[0].name")).toBeUndefined();
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

        expect(form.getValidationMessage("items[1].name")).toBeUndefined();
    });

    it("should keep the message of the remaining failing item when the last item is removed", () => {
        const form = gridForm([{ name: "" }, { name: "" }]);
        form.validate();

        form.removeItems("items", 1);

        expect(form.getValidationMessage("items[0].name")?.text).toBe("Name is required");
    });

    it("should report the message when an existing item is replaced by a failing one", () => {
        const form = gridForm([{ name: "John" }]);
        form.validate();

        form.updateItem("items", 0, { name: "" });

        expect(form.getValidationMessage("items[0].name")?.text).toBe("Name is required");
    });
});

// ─── orphaned item fields after removing earlier items ───────────────────────

/*
 * Regression tests for problems.md, C1. Removing an item shifts the data down, so
 * the validation state of the fields at the old last indexes must not stay behind:
 * the validator only returns results for items that still exist, and nothing else
 * would clear the orphaned error.
 */
describe("KertyForm – fieldDriven validation of orphaned item fields after removeItems", () => {
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

    it("should clear the message of the orphaned last index when an earlier item is removed", () => {
        const form = gridForm([{ name: "John" }, { name: "Jane" }, { name: "" }]);
        form.validate();

        form.removeItems("items", 0);

        expect(form.getValidationMessage("items[2].name")).toBeUndefined();
    });

    it("should mark the orphaned last index as valid when an earlier item is removed", () => {
        const form = gridForm([{ name: "John" }, { name: "Jane" }, { name: "" }]);
        form.validate();

        form.removeItems("items", 0);

        expect(form.getFieldState("items[2].name").isValid).toBe(true);
    });

    it.each([
        { label: "one earlier item", removed: 0, correctedField: "items[1].name" },
        { label: "two earlier items", removed: [0, 1], correctedField: "items[0].name" },
    ])("should make the form valid when the shifted failing item is corrected after removing $label", ({ removed, correctedField }) => {
        const form = gridForm([{ name: "John" }, { name: "Jane" }, { name: "" }]);
        form.validate();
        form.removeItems("items", removed);

        form.setFieldValue(correctedField, "Joe");

        expect(form.getState().isValid).toBe(true);
    });
});

describe("KertyForm – fieldDriven validation of orphaned item fields after setFieldValue shortens the array", () => {
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

    it("should make the form valid when the failing item is dropped from the array", () => {
        const form = gridForm([{ name: "John" }, { name: "" }]);
        form.validate();

        form.setFieldValue("items", [{ name: "John" }]);

        expect(form.getState().isValid).toBe(true);
    });

    it("should not report the dropped item field as invalid when the failing item is dropped from the array", () => {
        const form = gridForm([{ name: "John" }, { name: "" }]);
        form.validate();

        form.setFieldValue("items", [{ name: "John" }]);

        expect(form.getInvalidFields()).toEqual([]);
    });

    it("should clear the message of the dropped item field when the failing item is dropped from the array", () => {
        const form = gridForm([{ name: "John" }, { name: "" }]);
        form.validate();

        form.setFieldValue("items", [{ name: "John" }]);

        expect(form.getValidationMessage("items[1].name")).toBeUndefined();
    });

    it("should keep the message of a remaining item when the array is shortened", () => {
        const form = gridForm([{ name: "" }, { name: "" }]);
        form.validate();

        form.setFieldValue("items", [{ name: "" }]);

        expect(form.getValidationMessage("items[0].name")?.text).toBe("Name is required");
    });

    it("should make the form valid when the failing line is dropped from a nested array by replacing its parent array", () => {
        const form = new KertyForm<any>({
            data: { orders: [{ lines: [{ qty: "1" }, { qty: "" }] }] },
            validator: new Validator<any>({
                orders: [{ lines: [{ _qty: new FieldValidations({ check: isTextEmpty, message: "Qty is required" }) }] }],
            }),
        });
        form.validate();

        form.setFieldValue("orders", [{ lines: [{ qty: "1" }] }]);

        expect(form.getState().isValid).toBe(true);
    });

    it("should make the form valid when the failing cell is dropped from an array of arrays by replacing the outer array", () => {
        const form = new KertyForm<any>({
            data: { matrix: [["1", ""]] },
            validator: new Validator<any>({
                matrix: [[new FieldValidations({ check: isTextEmpty, message: "Cell is required" })]],
            }),
        });
        form.validate();

        form.setFieldValue("matrix", [["1"]]);

        expect(form.getState().isValid).toBe(true);
    });

    it("should not mark an appended item touched when the touched item was dropped from the array before", () => {
        const form = gridForm([{ name: "John" }, { name: "Jane" }]);
        form.touch("items[1].name");
        form.setFieldValue("items", [{ name: "John" }]);

        form.appendItems("items", { name: "" });

        expect(form.getFieldState("items[1].name").isTouched).toBe(false);
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

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should keep messages for the still-failing fields when one field is corrected", () => {
        const form = mountedForm(requiredLoginMessageValidator());
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getValidationMessage("password")?.text).toBe("Password is required");
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

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it.each([
        ["a warning", Severity.Warning],
        ["an info", Severity.Info],
    ] as const)("should clear %s message when the validator stops returning it after a change", (_, severity) => {
        const form = mountedForm(new SingleMessageDrivenValidator<Partial<LoginForm>>((result, { data }) => {
            if (!data.username) result.setFieldMessage("username", "Username is recommended", severity);
        }));
        form.validate();

        form.setFieldValue("username", "bob");

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should notify another field's listener when a change clears that field's message", () => {
        type PasswordForm = { password: string; confirmPassword: string };
        const form = new KertyForm<PasswordForm>({
            data: { password: "a", confirmPassword: "b" },
            validator: new SingleMessageDrivenValidator<PasswordForm>((result, { data }) => {
                if (data.password !== data.confirmPassword) result.setFieldMessage("confirmPassword", "Passwords don't match");
            }),
        });
        let confirmPasswordCalls = 0;
        form.addFieldListener("confirmPassword", () => { confirmPasswordCalls++; });
        form.validate();
        const before = confirmPasswordCalls;

        form.setFieldValue("password", "b");

        expect(confirmPasswordCalls).toBe(before + 1);
    });

    it("should not notify another field's listener when a change keeps that field's message", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator: requiredLoginMessageValidator() });
        let passwordCalls = 0;
        form.addFieldListener("username", () => { });
        form.addFieldListener("password", () => { passwordCalls++; });
        form.validate();
        const before = passwordCalls;

        form.setFieldValue("username", "bob");

        expect(passwordCalls).toBe(before);
    });

    it("should keep another field's snapshot when a change keeps that field's message", () => {
        const form = mountedForm(requiredLoginMessageValidator());
        const getPasswordSnapshot = form.getFieldSnapshot("password");
        form.validate();
        const before = getPasswordSnapshot();

        form.setFieldValue("username", "bob");

        expect(getPasswordSnapshot()).toBe(before);
    });

    it.each([
        ["text", "Password is too short", Severity.Error],
        ["severity", "Password is required", Severity.Warning],
    ] as const)("should notify another field's listener when a change alters that field's message %s", (_, text, severity) => {
        const form = new KertyForm<Partial<LoginForm>>({
            data: {},
            validator: new SingleMessageDrivenValidator<Partial<LoginForm>>((result, { data }) => {
                result.setFieldMessage("password", data.username ? text : "Password is required", data.username ? severity : Severity.Error);
            }),
        });
        let passwordCalls = 0;
        form.addFieldListener("username", () => { });
        form.addFieldListener("password", () => { passwordCalls++; });
        form.validate();
        const before = passwordCalls;

        form.setFieldValue("username", "bob");

        expect(passwordCalls).toBe(before + 1);
    });

    it("should notify a nested array item field's listener when a change clears that field's message", () => {
        type ItemsForm = { flag: string; items: { name: string }[] };
        const form = new KertyForm<ItemsForm>({
            data: { flag: "", items: [{ name: "" }, { name: "" }] },
            validator: new SingleMessageDrivenValidator<ItemsForm>((result, { data }) => {
                if (!data.flag) result.setFieldMessage("items[1].name", "Name is required");
            }),
        });
        let nameCalls = 0;
        form.addFieldListener("flag", () => { });
        form.addFieldListener("items[0].name", () => { });
        form.addFieldListener("items[1].name", () => { nameCalls++; });
        form.validate();
        const before = nameCalls;

        form.setFieldValue("flag", "on");

        expect(nameCalls).toBe(before + 1);
    });
});

describe("KertyForm – messageDriven validation of a field mounted after validate", () => {
    const countingMessageValidator = () => {
        const validator = requiredLoginMessageValidator();
        const counter = { calls: 0 };
        const validate = validator.validate.bind(validator);
        validator.validate = (ctx) => {
            counter.calls++;
            return validate(ctx);
        };
        return { validator, counter };
    };

    it("should not re-run the validator when a field gets its first listener", () => {
        const { validator, counter } = countingMessageValidator();
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator });
        form.addFieldListener("username", () => { });
        form.validate();
        const before = counter.calls;

        form.addFieldListener("password", () => { });

        expect(counter.calls).toBe(before);
    });

    it("should keep the message from the last validation for a newly mounted field", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator: requiredLoginMessageValidator() });
        form.addFieldListener("username", () => { });
        form.validate();

        form.addFieldListener("password", () => { });

        expect(form.getValidationMessage("password")?.text).toBe("Password is required");
    });

    it("should not notify another field with a message when a field gets its first listener", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator: requiredLoginMessageValidator() });
        let usernameCalls = 0;
        form.addFieldListener("username", () => { usernameCalls++; });
        form.validate();
        const before = usernameCalls;

        form.addFieldListener("password", () => { });

        expect(usernameCalls).toBe(before);
    });

    it("should restore the message of a remounted field when results are not kept without listeners", () => {
        const form = new KertyForm<Partial<LoginForm>>({
            data: {},
            validator: requiredLoginMessageValidator(),
            keepValidationResultsWithoutListeners: false,
        });
        form.addFieldListener("username", () => { });
        const unsubscribe = form.addFieldListener("password", () => { });
        form.validate();
        unsubscribe();

        form.addFieldListener("password", () => { });

        expect(form.getValidationMessage("password")?.text).toBe("Password is required");
    });
});

describe("KertyForm – validation after the last listener of a validated field unsubscribes", () => {
    const validatedLoginForm = (keepValidationResultsWithoutListeners: boolean) => {
        const form = new KertyForm<Partial<LoginForm>>({
            data: { password: "secret" },
            validator: requiredLoginValidator(),
            keepValidationResultsWithoutListeners,
        });
        const unsubscribe = form.addFieldListener("username", () => { });
        form.validate();
        return { form, unsubscribe };
    };

    it("should run the validator again when the results are not kept without listeners", () => {
        const validator = countingValidator();
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator, keepValidationResultsWithoutListeners: false });
        const unsubscribe = form.addFieldListener("username", () => { });
        form.validate();
        unsubscribe();

        form.validate();

        expect(validator.fullRuns).toBe(2);
    });

    it("should report the form invalid again when the failing field's results are not kept without listeners", () => {
        const { form, unsubscribe } = validatedLoginForm(false);
        unsubscribe();

        form.validate();

        expect(form.getState().isValid).toBe(false);
    });

    it("should report the failing field's message again when the results are not kept without listeners", () => {
        const { form, unsubscribe } = validatedLoginForm(false);
        unsubscribe();

        form.validate();

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should reuse the previous result when the results are kept without listeners", () => {
        const validator = countingValidator();
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator, keepValidationResultsWithoutListeners: true });
        const unsubscribe = form.addFieldListener("username", () => { });
        form.validate();
        unsubscribe();

        form.validate();

        expect(validator.fullRuns).toBe(1);
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

    it("should clear the form result when an empty result is applied in patch mode", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });
        form.applyValidationResult(error("Login failed"));

        form.applyValidationResult(new ValidationResult());

        expect(form.getValidationResult()).toBeUndefined();
    });

    it("should make the form valid when an empty result replaces a form error in patch mode", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });
        form.applyValidationResult(error("Login failed"));

        form.applyValidationResult(new ValidationResult());

        expect(form.getState().isValid).toBe(true);
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

        expect(form.getValidationMessage("username")?.text).toBe("Taken");
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

        expect(form.getValidationResult("username")?.messages.map(m => m.text)).toEqual(["First", "Second"]);
    });

    it("should clear a warning when an empty result is applied in patch mode", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", warning("Weak"));

        form.applyFieldValidationResult("username", new ValidationResult());

        expect(form.getValidationResult("username")).toBeUndefined();
    });
});

describe("KertyForm – externally applied field results without a validator", () => {
    it("should clear the field message when the field changes afterwards", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        form.setFieldValue("username", "alice");

        expect(form.getValidationMessage("username")).toBeUndefined();
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

        expect(form.getValidationMessage("password")?.text).toBe("Too short");
    });
});

describe("KertyForm – externally applied field results with a fieldDriven validator that has no rules for the field", () => {
    const passwordOnlyValidator = () => new Validator<Partial<LoginForm>>({
        _password: new FieldValidations({ check: isTextEmpty, message: "Password is required" }),
    });

    it.each([
        { label: "an error", severity: Severity.Error },
        { label: "a warning", severity: Severity.Warning },
        { label: "an info message", severity: Severity.Info },
        { label: "a success message", severity: Severity.Success },
    ])("should clear $label when the field changes afterwards", ({ severity }) => {
        const form = mountedForm(passwordOnlyValidator(), { password: "secret" });
        form.applyFieldValidationResult("username", new ValidationResult().add({ text: "Applied", severity }));

        form.setFieldValue("username", "alice");

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should leave a warning applied to a different field in place when one field changes", () => {
        const form = mountedForm(passwordOnlyValidator(), { password: "secret" });
        form.applyFieldValidationResult("password", warning("Weak password"));

        form.setFieldValue("username", "alice");

        expect(form.getValidationMessage("password")?.text).toBe("Weak password");
    });
});

describe("KertyForm.getValidationResult", () => {
    it("should return the form result when no name is passed", () => {
        const form = mountedForm();
        form.applyValidationResult(error("Login failed"));

        expect(form.getValidationResult()?.messages[0].text).toBe("Login failed");
    });

    it("should return the form result when the name is null", () => {
        const form = mountedForm();
        form.applyValidationResult(error("Login failed"));

        expect(form.getValidationResult(null)?.messages[0].text).toBe("Login failed");
    });

    it("should not return a field result when no name is passed", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        expect(form.getValidationResult()).toBeUndefined();
    });

    it("should not return the form result when a field name is passed", () => {
        const form = mountedForm();
        form.applyValidationResult(error("Login failed"));

        expect(form.getValidationResult("username")).toBeUndefined();
    });

    it("should return the first form message when the message is read with a null name", () => {
        const form = mountedForm();
        form.applyValidationResult(error("Login failed"));

        expect(form.getValidationMessage(null)?.text).toBe("Login failed");
    });

    it("should return undefined when the field was never registered", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: { username: "bob" } });

        expect(form.getValidationResult("username")).toBeUndefined();
    });

    it("should register the field when its validation result is read", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: { username: "bob" } });

        form.getValidationResult("username");

        expect(form.getFieldValue("username")).toBe("bob");
    });

    it("should not register the field when its validation message is read", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: { username: "bob" } });

        form.getValidationMessage("username");

        expect(form.getFieldState("username").isValidated).toBe(false);
    });

    it("should return undefined when the field name is not a valid path", () => {
        const form = new KertyForm<any>({ data: { username: "bob" } });

        expect(() => form.getValidationResult("not a path")).toThrowErrorMatchingSnapshot("Invalid field path: empty spaces are not allowed");
    });

    it("should return the result when the validator reported on a field with no listener", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, validator: requiredLoginValidator() });
        form.validate();

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should return the result when the field is registered", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        expect(form.getValidationMessage("username")?.text).toBe("Taken");
    });

    it("should stop returning the result once the field unsubscribes when field state is not kept without listeners", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, keepValidationResultsWithoutListeners: false });
        const unsubscribe = form.addFieldListener("username", () => { });
        form.applyFieldValidationResult("username", error("Taken"));

        unsubscribe();

        expect(form.getValidationMessage("username")).toBeUndefined();
    });
});

describe("KertyForm.applyValidationResults", () => {
    it("should apply each field result when a map is given", () => {
        const form = mountedForm();

        form.applyValidationResults(treeOf([["username", error("Taken")]]));

        expect(form.getValidationMessage("username")?.text).toBe("Taken");
    });

    it("should apply the form result when the map contains the empty key", () => {
        const form = mountedForm();

        form.applyValidationResults(treeOf([["", error("Login failed")]]));

        expect(form.getValidationMessage()?.text).toBe("Login failed");
    });

    it("should clear previous field results when applied in replace mode", () => {
        const form = mountedForm();
        form.applyValidationResults(treeOf([["username", error("Taken")]]), { mode: "replace" });

        form.applyValidationResults(treeOf([["password", error("Too short")]]), { mode: "replace" });

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should mark a registered field without results validated and valid when applied in replace mode", () => {
        const form = mountedForm();

        form.applyValidationResults(treeOf([["username", error("Taken")]]), { mode: "replace" });

        expect(form.getFieldState("password")).toMatchObject({ isValid: true, isValidated: true });
    });

    it("should mark every registered field validated when an empty map is applied in replace mode", () => {
        const form = mountedForm();

        form.applyValidationResults(treeOf(), { mode: "replace" });

        expect([form.getFieldState("username").isValidated, form.getFieldState("password").isValidated]).toEqual([true, true]);
    });

    it("should notify a registered field listener when its field becomes validated in replace mode", () => {
        const form = new KertyForm<Partial<LoginForm>>({});
        let calls = 0;
        form.addFieldListener("password", () => { calls++; });

        form.applyValidationResults(treeOf([["username", error("Taken")]]), { mode: "replace" });

        expect(calls).toBe(1);
    });

    it("should keep previous field results when applied in merge mode", () => {
        const form = mountedForm();
        form.applyValidationResults(treeOf([["username", error("Taken")]]));

        form.applyValidationResults(treeOf([["password", error("Too short")]]), { mode: "merge" });

        expect(form.getValidationMessage("username")?.text).toBe("Taken");
    });

    it("should keep a field result when the map holds an empty result for it in merge mode", () => {
        const form = mountedForm();
        form.applyValidationResults(treeOf([["username", error("Taken")]]));

        form.applyValidationResults(treeOf([["username", new ValidationResult()]]), { mode: "merge" });

        expect(form.getValidationMessage("username")?.text).toBe("Taken");
    });

    it("should keep the form invalid when an empty result is merged for the only invalid field", () => {
        const form = mountedForm();
        form.applyValidationResults(treeOf([["username", error("Taken")]]));

        form.applyValidationResults(treeOf([["username", new ValidationResult()]]), { mode: "merge" });

        expect(form.getState().isValid).toBe(false);
    });

    it("should leave the form untouched when an empty map is applied in merge mode", () => {
        const form = mountedForm();
        form.applyValidationResults(treeOf([["username", error("Taken")]]));

        form.applyValidationResults(treeOf(), { mode: "merge" });

        expect(form.getValidationMessage("username")?.text).toBe("Taken");
    });

    it("should clear the previous form result when applied in replace mode", () => {
        const form = mountedForm();
        form.applyValidationResult(error("Login failed"));

        form.applyValidationResults(treeOf([["username", error("Taken")]]), { mode: "replace" });

        expect(form.getValidationResult()).toBeUndefined();
    });

    it("should keep the field valid when only a warning is applied to it", () => {
        const form = mountedForm();

        form.applyValidationResults(treeOf([["username", warning("Weak")]]));

        expect(form.getFieldState("username")).toMatchObject({ isValid: true, isValidated: true });
    });

    it("should make the form valid again when a field error is patched with a warning", () => {
        const form = mountedForm();
        form.applyValidationResults(treeOf([["username", error("Taken")]]));

        form.applyValidationResults(treeOf([["username", warning("Weak")]]));

        expect(form.getState().isValid).toBe(true);
    });

    it("should notify a validation listener when only a field result changes", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", warning("Weak"));
        let calls = 0;
        form.addListener(() => { calls++; }, { listenDataChange: false, listenStateChange: false, listenValidationChange: true });

        form.applyFieldValidationResult("username", warning("Still weak"));

        expect(calls).toBe(1);
    });

    it.each(["patch", "merge"] as const)("should keep the form result reference when only field results are applied in %s mode", mode => {
        const form = mountedForm();
        form.applyValidationResult(error("Login failed"));
        const formResult = form.getValidationResult();

        form.applyFieldValidationResult("username", error("Taken"), { mode });

        expect(form.getValidationResult()).toBe(formResult);
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

        expect(form.getValidationMessage("username")).toBeUndefined();
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

        expect(form.getValidationMessage("password")?.text).toBe("Password is required");
    });

    it("should clear the named field when called with a field name", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.resetFieldValidationResults("username");

        expect(form.getValidationMessage("username")).toBeUndefined();
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

    it("should keep the form validated when only one field is reset", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.resetFieldValidationResults("username");

        expect(form.getState().isValidated).toBe(true);
    });

    it("should keep an unused field out of touch() when its validation results are reset before it is used", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });
        form.resetFieldValidationResults("username");

        form.touch();

        expect(form.getFieldState("username").isTouched).toBe(false);
    });

    it("should keep an unused field out of validate() when its validation results are reset before it is used", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {} });
        form.resetFieldValidationResults("username");

        form.validate();

        expect(form.getFieldState("username").isValidated).toBe(false);
    });

    it("should still validate a field that mounts after another field was reset", () => {
        const form = new KertyForm<any>({
            data: { items: [{ name: "a" }] },
            validator: new Validator<any>({
                items: [{ _name: new FieldValidations({ check: isTextEmpty, message: "Name is required" }) }],
            }),
        });
        form.addFieldListener("items[0].name", () => { });
        form.validate();
        form.resetFieldValidationResults("items[0].name");
        form.appendItems("items", { name: "" });

        form.addFieldListener("items[1].name", () => { });

        expect(form.getValidationMessage("items[1].name")?.text).toBe("Name is required");
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

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should make the form valid again when the form is reset", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.reset();

        expect(form.getState().isValid).toBe(true);
    });

    it("should not reuse the rule set of the last validate after the form is reset", () => {
        const ruleSets: (string | null | undefined)[] = [];
        const form = mountedForm({
            mode: "fieldDriven",
            validate: ({ ruleSet }: { ruleSet?: string | null }) => {
                ruleSets.push(ruleSet);
                return treeOf();
            },
        });
        form.validate("login");
        form.reset();
        form.applyFieldValidationResult("username", error("Taken"));

        form.setFieldValue("username", "bob");

        expect(ruleSets.at(-1)).toBeUndefined();
    });
});

// ─── setValidator ────────────────────────────────────────────────────────────

describe("KertyForm.setValidator", () => {
    it("should use the new validator when one is set after construction", () => {
        const form = mountedForm();

        form.setValidator(requiredLoginValidator());

        expect(form.validate().isValid).toBe(false);
    });

    it("should remove the validator when undefined is passed", () => {
        const form: IKertyForm<Partial<LoginForm>> = mountedForm(requiredLoginValidator());

        form.setValidator(undefined);

        expect(form.validate().isValid).toBe(true);
    });

    it("should keep the existing messages when the validator is removed", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.setValidator(undefined);

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
    });
});

type OrderForm = {
    items: { name: string }[];
};

const formWithFailingItemName = (registeredFields: FieldPath<OrderForm>[]) => {
    const form = new KertyForm<OrderForm>({ data: { items: [{ name: "" }] } });
    registeredFields.forEach((fieldName) => form.addFieldListener(fieldName, () => { }));
    form.applyFieldValidationResult("items[0].name", error("Name is required"));
    return form;
};

const clearingOperations = [
    { operation: "reset()", clear: (form: KertyForm<OrderForm>) => form.reset() },
    { operation: "resetValidationResults()", clear: (form: KertyForm<OrderForm>) => form.resetValidationResults() },
    {
        operation: "applyValidationResults() in replace mode",
        clear: (form: KertyForm<OrderForm>) => form.applyValidationResults(treeOf(), { mode: "replace" }),
    },
];

describe("KertyForm – clearing validation of fields inside an array item", () => {
    it.each(clearingOperations)("should clear the item field message when $operation runs and only the item field is registered", ({ clear }) => {
        const form = formWithFailingItemName(["items[0].name"]);

        clear(form);

        expect(form.getValidationMessage("items[0].name")).toBeUndefined();
    });

    it.each(clearingOperations)("should clear the item field message when $operation runs and the item itself is registered too", ({ clear }) => {
        const form = formWithFailingItemName(["items[0]", "items[0].name"]);

        clear(form);

        expect(form.getValidationMessage("items[0].name")).toBeUndefined();
    });
});

const registrationOrders: { order: string, registeredFields: FieldPath<OrderForm>[] }[] = [
    { order: "the item is registered before its field", registeredFields: ["items[0]", "items[0].name"] },
    { order: "the item is registered after its field", registeredFields: ["items[0].name", "items[0]"] },
];

const formWithRegisteredFields = (registeredFields: FieldPath<OrderForm>[]) => {
    const form = new KertyForm<OrderForm>({ data: { items: [{ name: "" }] } });
    registeredFields.forEach((fieldName) => form.addFieldListener(fieldName, () => { }));
    return form;
};

describe("KertyForm – registration order of an array item and its fields", () => {
    it.each(registrationOrders)("should mark the item as touched when $order", ({ registeredFields }) => {
        const form = formWithRegisteredFields(registeredFields);

        form.touch("items[0]");

        expect(form.getFieldState("items[0]").isTouched).toBe(true);
    });

    it.each(registrationOrders)("should clear the item message on reset when $order", ({ registeredFields }) => {
        const form = formWithRegisteredFields(registeredFields);
        form.applyFieldValidationResult("items[0]", error("Item is invalid"));

        form.reset();

        expect(form.getValidationMessage("items[0]")).toBeUndefined();
    });
});

type CatalogForm = {
    items: { name: string, address?: { city: string } }[];
    itemsArchive: string;
    matrix: string[][];
};

const catalogForm = (itemCount: number, failingFields: FieldPath<CatalogForm>[]) => {
    const form = new KertyForm<CatalogForm>({
        data: {
            items: Array.from({ length: itemCount }, () => ({ name: "", address: { city: "" } })),
            itemsArchive: "",
            matrix: [["", ""], ["", ""]],
        },
    });
    failingFields.forEach((fieldName) => form.applyFieldValidationResult(fieldName, error(`${fieldName} is invalid`)));
    return form;
};

describe("KertyForm.removeItems – clearing validation of removed items", () => {
    it("should keep the form invalid when a later item whose index starts with the removed index still fails", () => {
        const form = catalogForm(11, ["items[10].name"]);

        form.removeItems("items", 1);

        expect(form.getState().isValid).toBe(false);
    });

    it("should keep the message of a sibling field whose name starts with the array name when the last item is removed", () => {
        const form = catalogForm(1, ["itemsArchive"]);

        form.removeItems("items", 0);

        expect(form.getValidationMessage("itemsArchive")?.text).toBe("itemsArchive is invalid");
    });

    it("should clear the message of a nested field of the removed item when an item is removed", () => {
        const form = catalogForm(3, ["items[1].address.city"]);

        form.removeItems("items", 1);

        expect(form.getValidationMessage("items[1].address.city")).toBeUndefined();
    });

    it("should clear the message of the removed item when the item at the last index is removed", () => {
        const form = catalogForm(3, ["items[2].name"]);

        form.removeItems("items", 2);

        expect(form.getValidationMessage("items[2].name")).toBeUndefined();
    });

    it("should clear the message of every removed item when several items are removed", () => {
        const form = catalogForm(4, ["items[0].name", "items[2].name"]);

        form.removeItems("items", [0, 2]);

        expect([
            form.getValidationMessage("items[0].name"),
            form.getValidationMessage("items[2].name"),
        ]).toEqual([undefined, undefined]);
    });

    it("should clear the message of the array field when one of its items is removed", () => {
        const form = catalogForm(3, ["items"]);

        form.removeItems("items", 1);

        expect(form.getValidationMessage("items")).toBeUndefined();
    });

    it("should clear the message of the array field when its last item is removed", () => {
        const form = catalogForm(1, ["items"]);

        form.removeItems("items", 0);

        expect(form.getValidationMessage("items")).toBeUndefined();
    });

    it("should clear the message of a removed nested array item that has its own items registered", () => {
        const form = catalogForm(0, ["matrix[0]", "matrix[0][1]"]);

        form.removeItems("matrix", 0);

        expect(form.getValidationMessage("matrix[0]")).toBeUndefined();
    });

    it("should make the form valid when the removed item held the only failing field", () => {
        const form = catalogForm(3, ["items[1].address.city"]);

        form.removeItems("items", 1);

        expect(form.getState().isValid).toBe(true);
    });
});

/*
 * Field state is keyed by index, so removing an earlier item has to move a later
 * item's message down with the data instead of leaving it at the old index.
 */
describe("KertyForm.removeItems – moving validation of later items", () => {
    it("should move the message of a later item to its new index when an earlier item is removed", () => {
        const form = catalogForm(11, ["items[10].name"]);

        form.removeItems("items", 1);

        expect(form.getValidationMessage("items[9].name")?.text).toBe("items[10].name is invalid");
    });

    it("should clear the message at the old last index when an earlier item is removed", () => {
        const form = catalogForm(11, ["items[10].name"]);

        form.removeItems("items", 1);

        expect(form.getValidationMessage("items[10].name")).toBeUndefined();
    });

    it("should mark the moved field as invalid at its new index when an earlier item is removed", () => {
        const form = catalogForm(3, ["items[2].name"]);

        form.removeItems("items", 0);

        expect(form.getFieldState("items[1].name").isValid).toBe(false);
    });

    it("should move the message of a nested field to its new index when an earlier item is removed", () => {
        const form = catalogForm(3, ["items[2].address.city"]);

        form.removeItems("items", 0);

        expect(form.getValidationMessage("items[1].address.city")?.text).toBe("items[2].address.city is invalid");
    });

    it("should move the message to its new index when an earlier item is removed in silent mode", () => {
        const form = catalogForm(3, ["items[2].name"]);

        form.removeItems("items", 0, true);

        expect(form.getValidationMessage("items[1].name")?.text).toBe("items[2].name is invalid");
    });

    it("should clear the message at the old last index when that field still has a listener", () => {
        const form = catalogForm(3, ["items[2].name"]);
        form.addFieldListener("items[2].name", () => { });

        form.removeItems("items", 0);

        expect(form.getValidationMessage("items[2].name")).toBeUndefined();
    });
});

describe("KertyForm – silent changes", () => {
    it("should clear the field message when a validated field becomes valid", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();

        form.setFieldValue("username", "bob", true);

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should restore the field message when a validated field becomes invalid again", () => {
        const form = mountedForm(requiredLoginValidator());
        form.validate();
        form.setFieldValue("username", "bob");

        form.setFieldValue("username", "", true);

        expect(form.getValidationMessage("username")?.text).toBe("Username is required");
    });

    it("should clear an applied field message when the field changes without a validator", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        form.setFieldValue("username", "alice", true);

        expect(form.getValidationMessage("username")).toBeUndefined();
    });

    it("should make the form valid when the last invalid field changes without a validator", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        form.setFieldValue("username", "alice", true);

        expect(form.getState().isValid).toBe(true);
    });

    it("should clear the message of the array field when an item is removed", () => {
        const form = catalogForm(3, ["items"]);

        form.removeItems("items", 1, true);

        expect(form.getValidationMessage("items")).toBeUndefined();
    });
});

// ─── getInvalidFields ────────────────────────────────────────────────────────

describe("KertyForm.getInvalidFields", () => {
    it("should return an empty list when no field is invalid", () => {
        const form = mountedForm();

        expect(form.getInvalidFields()).toEqual([]);
    });

    it("should return the field when an applied result has an error", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        expect(form.getInvalidFields()).toEqual(["username"]);
    });

    it("should not return the field when an applied result has only a warning", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", warning("Weak"));

        expect(form.getInvalidFields()).toEqual([]);
    });

    it("should return the fields reported with errors when the form is validated", () => {
        const form = mountedForm(requiredLoginValidator(), { username: "bob" });
        form.validate();

        expect(form.getInvalidFields()).toEqual(["password"]);
    });

    it("should return array item fields in index order when they were invalidated out of order", () => {
        const form = new KertyForm<any>({ data: { rows: [{ a: 1 }, { a: 2 }, { a: 3 }] } });
        form.applyValidationResults(treeOf([["rows[2].a", error("x")], ["rows[0].a", error("x")], ["rows[1].a", error("x")]]));

        expect(form.getInvalidFields()).toEqual(["rows[0].a", "rows[1].a", "rows[2].a"]);
    });

    it("should return the array item itself when the item is invalid", () => {
        const form = new KertyForm<any>({ data: { rows: [{ a: 1 }, { a: 2 }] } });
        form.applyFieldValidationResult("rows[1]", error("x"));

        expect(form.getInvalidFields()).toEqual(["rows[1]"]);
    });

    it("should return a nested field of an array item when it is invalid", () => {
        const form = new KertyForm<any>({ data: { rows: [{ address: { city: "" } }] } });
        form.applyFieldValidationResult("rows[0].address.city", error("x"));

        expect(form.getInvalidFields()).toEqual(["rows[0].address.city"]);
    });

    it("should return the field at its new index when an item is inserted before it", () => {
        const form = new KertyForm<any>({ data: { rows: [{ a: 1 }, { a: 2 }] } });
        form.applyFieldValidationResult("rows[1].a", error("x"));

        form.insertItems("rows", 0, { a: 0 });

        expect(form.getInvalidFields()).toEqual(["rows[2].a"]);
    });

    it("should not return the field when its item is removed", () => {
        const form = new KertyForm<any>({ data: { rows: [{ a: 1 }, { a: 2 }] } });
        form.applyFieldValidationResult("rows[1].a", error("x"));

        form.removeItems("rows", 1);

        expect(form.getInvalidFields()).toEqual([]);
    });

    it("should not return the field when the validation results are reset", () => {
        const form = mountedForm();
        form.applyFieldValidationResult("username", error("Taken"));

        form.resetValidationResults();

        expect(form.getInvalidFields()).toEqual([]);
    });

    it("should not return the field once its listener unsubscribes when field state is not kept without listeners", () => {
        const form = new KertyForm<Partial<LoginForm>>({ data: {}, keepValidationResultsWithoutListeners: false });
        const unsubscribe = form.addFieldListener("username", () => { });
        form.applyFieldValidationResult("username", error("Taken"));

        unsubscribe();

        expect(form.getInvalidFields()).toEqual([]);
    });
});
