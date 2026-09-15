import { describe, expect, it } from "vitest";
import { FieldValidations, Validator } from "../src/lib/validation/validator";
import { Validations } from "../src/lib/validation/validations";
import { Severity, type IValidationResult } from "../src/lib/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

const textsFor = (result: Map<string, IValidationResult>, field: string) =>
    result.get(field)?.messages.map(m => m.text);

const firstTextFor = (result: Map<string, IValidationResult>, field: string) =>
    result.get(field)?.messages[0]?.text;

const hasErrorFor = (result: Map<string, IValidationResult>, field: string) =>
    result.get(field)?.has(Severity.Error);

const required = (message: string) => ({
    check: (ctx: any) => Validations.IsTextEmpty(ctx.value),
    message,
});

// ─── mode ────────────────────────────────────────────────────────────────────

describe("Validator", () => {
    it("should report fieldDriven mode when constructed", () => {
        const validator = new Validator<{ name: string }>({});

        expect(validator.mode).toBe("fieldDriven");
    });
});

// ─── full form validation ────────────────────────────────────────────────────

describe("Validator.validate – full form", () => {
    it("should return a result for the failing field when a rule fires", () => {
        const validator = new Validator<{ name: string }>({
            _name: new FieldValidations(required("Name is required")),
        });

        const result = validator.validate({ data: { name: "" } });

        expect(firstTextFor(result, "name")).toBe("Name is required");
    });

    it("should omit the field from the result when no rule fires", () => {
        const validator = new Validator<{ name: string }>({
            _name: new FieldValidations(required("Name is required")),
        });

        const result = validator.validate({ data: { name: "John" } });

        expect(result.has("name")).toBe(false);
    });

    it("should validate every registered field when called without a field name", () => {
        const validator = new Validator<{ name: string; surname: string }>({
            _name: new FieldValidations(required("Name is required")),
            _surname: new FieldValidations(required("Surname is required")),
        });

        const result = validator.validate({ data: { name: "", surname: "" } });

        expect([...result.keys()].sort()).toEqual(["name", "surname"]);
    });

    it("should skip a whole nested branch when its parent value is null", () => {
        const validator = new Validator<any>({
            person: {
                _name: new FieldValidations(required("Name is required")),
            },
        });

        const result = validator.validate({ data: { person: null } });

        expect(result.size).toBe(0);
    });

    it("should skip array item rules when the value is not an array", () => {
        const validator = new Validator<any>({
            items: [new FieldValidations({ check: () => true, message: "item is invalid" })],
        });

        const result = validator.validate({ data: { items: { value: "value" } } });

        expect(result.size).toBe(0);
    });
});

// ─── validation context ──────────────────────────────────────────────────────

describe("Validator – validation context", () => {
    it("should expose the form data as parent when the field is at the root", () => {
        const data = { value: "root" };
        let captured: any;
        const validator = new Validator<typeof data>({
            _value: new FieldValidations({
                check: (ctx) => { captured = ctx; return false; },
                message: "never",
            }),
        });

        validator.validate({ data });

        expect(captured).toMatchObject({ data, parent: data, value: "root", fieldName: "value" });
    });

    it("should expose the owning object as parent when the field is nested", () => {
        const data = { person: { name: "John", surname: "Doe" } };
        let captured: any;
        const validator = new Validator<typeof data>({
            person: {
                _name: new FieldValidations({
                    check: (ctx) => { captured = ctx; return false; },
                    message: "never",
                }),
            },
        });

        validator.validate({ data });

        expect(captured).toMatchObject({
            data,
            parent: data.person,
            value: "John",
            fieldName: "person.name",
        });
    });

    it("should expose an indexed field name when the field belongs to an array item", () => {
        const data = { items: [{ name: "a" }, { name: "b" }] };
        const seen: string[] = [];
        const validator = new Validator<typeof data>({
            items: [{
                _name: new FieldValidations({
                    check: (ctx) => { seen.push(ctx.fieldName); return false; },
                    message: "never",
                }),
            }],
        });

        validator.validate({ data });

        expect(seen).toEqual(["items[0].name", "items[1].name"]);
    });

    it("should expose the array item as value when the rule is registered on the array itself", () => {
        const data = { tags: ["ts", "js"] };
        const seen: unknown[] = [];
        const validator = new Validator<typeof data>({
            tags: [new FieldValidations({
                check: (ctx) => { seen.push(ctx.value); return false; },
                message: "never",
            })],
        });

        validator.validate({ data });

        expect(seen).toEqual(["ts", "js"]);
    });
});

// ─── nested structures ───────────────────────────────────────────────────────

describe("Validator – nested structures", () => {
    it("should key the result by the full dotted path when a nested field fails", () => {
        const validator = new Validator<any>({
            person: {
                address: {
                    _city: new FieldValidations(required("City is required")),
                },
            },
        });

        const result = validator.validate({ data: { person: { address: { city: "" } } } });

        expect(firstTextFor(result, "person.address.city")).toBe("City is required");
    });

    it("should key the result by index when a primitive array item fails", () => {
        const validator = new Validator<any>({
            tags: [new FieldValidations(required("Tag is required"))],
        });

        const result = validator.validate({ data: { tags: ["ts", "", "js"] } });

        expect([...result.keys()]).toEqual(["tags[1]"]);
    });

    it("should key the result by index and property when an array object field fails", () => {
        const validator = new Validator<any>({
            items: [{
                _name: new FieldValidations(required("Name is required")),
            }],
        });

        const result = validator.validate({ data: { items: [{ name: "a" }, { name: "" }] } });

        expect([...result.keys()]).toEqual(["items[1].name"]);
    });

    it("should key the result by both indices when an inner array item fails", () => {
        const validator = new Validator<any>({
            matrix: [[new FieldValidations(required("Cell is required"))]],
        });

        const result = validator.validate({ data: { matrix: [["a", ""], [""]] } });

        expect([...result.keys()].sort()).toEqual(["matrix[0][1]", "matrix[1][0]"]);
    });
});

// ─── rule options ────────────────────────────────────────────────────────────

describe("Validator – rule options", () => {
    it("should not run the check when the when predicate returns false", () => {
        let checkCalled = false;
        const validator = new Validator<{ value: string }>({
            _value: new FieldValidations({
                when: () => false,
                check: () => { checkCalled = true; return true; },
                message: "never",
            }),
        });

        validator.validate({ data: { value: "x" } });

        expect(checkCalled).toBe(false);
    });

    it("should run the check when the when predicate returns true", () => {
        const validator = new Validator<{ age: number; license: boolean }>({
            _license: new FieldValidations({
                when: (ctx) => ctx.parent.age >= 18,
                check: (ctx) => ctx.value === false,
                message: "Driving licence is required",
            }),
        });

        const result = validator.validate({ data: { age: 18, license: false } });

        expect(firstTextFor(result, "license")).toBe("Driving licence is required");
    });

    it("should skip rules of other rule sets when no rule set is active", () => {
        const validator = new Validator<{ age: number | null }>({
            _age: new FieldValidations({
                ruleSet: "submit",
                check: (ctx) => ctx.value == null,
                message: "Age is required",
            }),
        });

        const result = validator.validate({ data: { age: null } });

        expect(result.size).toBe(0);
    });

    it("should run only the matching rule set when a rule set is active", () => {
        const validator = new Validator<{ age: number | null }>({
            _age: new FieldValidations<{ age: number | null }, number | null>()
                .add({ ruleSet: "submit", check: (ctx) => ctx.value == null, message: "Age is required" })
                .add({ check: (ctx) => ctx.value != null && ctx.value < 18, message: "Must be adult" }),
        });

        const result = validator.validate({ data: { age: null }, ruleSet: "submit" });

        expect(textsFor(result, "age")).toEqual(["Age is required"]);
    });

    it("should stop evaluating later rules when a fired rule sets stop", () => {
        let secondCheckCalled = false;
        const validator = new Validator<{ value: string }>({
            _value: new FieldValidations([
                { check: () => true, message: "First failure", stop: true },
                { check: () => { secondCheckCalled = true; return true; }, message: "Second failure" },
            ]),
        });

        validator.validate({ data: { value: "" } });

        expect(secondCheckCalled).toBe(false);
    });

    it("should keep messages in declaration order when several rules fire", () => {
        const validator = new Validator<{ value: string }>({
            _value: new FieldValidations<{ value: string }, string>()
                .add({ check: () => true, message: "First" })
                .add({ check: () => true, message: "Second" })
                .add({ check: () => true, message: "Third" }),
        });

        const result = validator.validate({ data: { value: "" } });

        expect(textsFor(result, "value")).toEqual(["First", "Second", "Third"]);
    });

    it("should resolve the message from the context when message is a function", () => {
        const validator = new Validator<{ name: string }>({
            _name: new FieldValidations({
                check: () => true,
                message: (ctx) => `${ctx.fieldName} is "${ctx.value}"`,
            }),
        });

        const result = validator.validate({ data: { name: "John" } });

        expect(firstTextFor(result, "name")).toBe('name is "John"');
    });

    it("should default the message severity to Error when no severity is given", () => {
        const validator = new Validator<{ name: string }>({
            _name: new FieldValidations(required("Name is required")),
        });

        const result = validator.validate({ data: { name: "" } });

        expect(hasErrorFor(result, "name")).toBe(true);
    });

    it("should not mark the field as errored when only non-error severities fire", () => {
        const validator = new Validator<{ score: number }>({
            _score: new FieldValidations<{ score: number }, number>()
                .add({ check: () => true, severity: Severity.Warning, message: "Score is suspicious" })
                .add({ check: () => true, severity: Severity.Info, message: "Score is informative" }),
        });

        const result = validator.validate({ data: { score: 10 } });

        expect(hasErrorFor(result, "score")).toBe(false);
    });

    it("should add the message when the check returns false and addMessageWhenCheckIs is false", () => {
        const validator = new Validator<{ name: string }>(
            { _name: new FieldValidations({ check: (ctx) => Validations.IsTextNotEmpty(ctx.value), message: "Name is required" }) },
            { addMessageWhenCheckIs: false },
        );

        const result = validator.validate({ data: { name: "" } });

        expect(firstTextFor(result, "name")).toBe("Name is required");
    });

    it("should not add the message when the check returns true and addMessageWhenCheckIs is false", () => {
        const validator = new Validator<{ name: string }>(
            { _name: new FieldValidations({ check: (ctx) => Validations.IsTextNotEmpty(ctx.value), message: "Name is required" }) },
            { addMessageWhenCheckIs: false },
        );

        const result = validator.validate({ data: { name: "John" } });

        expect(result.size).toBe(0);
    });
});

// ─── on-change (field scoped) validation ─────────────────────────────────────

describe("Validator.validate – scoped to a changed field", () => {
    it("should validate the changed field when a field name is given", () => {
        const validator = new Validator<{ name: string; surname: string }>({
            _name: new FieldValidations(required("Name is required")),
            _surname: new FieldValidations(required("Surname is required")),
        });

        const result = validator.validate({ data: { name: "", surname: "" }, fieldName: "name" });

        expect(firstTextFor(result, "name")).toBe("Name is required");
    });

    it("should skip unrelated fields when a field name is given", () => {
        const validator = new Validator<{ name: string; surname: string }>({
            _name: new FieldValidations(required("Name is required")),
            _surname: new FieldValidations(required("Surname is required")),
        });

        const result = validator.validate({ data: { name: "", surname: "" }, fieldName: "name" });

        expect(result.has("surname")).toBe(false);
    });

    it("should include a field marked hasDependency when another field changes", () => {
        const validator = new Validator<any>({
            _password: new FieldValidations(required("Password is required")),
            _confirmPassword: new FieldValidations({
                check: (ctx) => ctx.value !== ctx.parent.password,
                message: "Passwords must match",
                hasDependency: true,
            }),
        });

        const result = validator.validate({
            data: { password: "abc", confirmPassword: "xyz" },
            fieldName: "password",
        });

        expect(firstTextFor(result, "confirmPassword")).toBe("Passwords must match");
    });

    it("should include a field carrying a when condition when another field changes", () => {
        const validator = new Validator<any>({
            _age: new FieldValidations({ check: (ctx) => ctx.value < 18, message: "Must be adult" }),
            _license: new FieldValidations({
                when: (ctx) => ctx.parent.age >= 18,
                check: (ctx) => ctx.value === false,
                message: "Driving licence is required",
            }),
        });

        const result = validator.validate({
            data: { age: 18, license: false },
            fieldName: "age",
        });

        expect(firstTextFor(result, "license")).toBe("Driving licence is required");
    });

    it("should emit an empty result for a revalidated field when its rules no longer fire", () => {
        const validator = new Validator<{ name: string }>({
            _name: new FieldValidations(required("Name is required")),
        });

        const result = validator.validate({ data: { name: "John" }, fieldName: "name" });

        expect(textsFor(result, "name")).toEqual([]);
    });

    it("should revalidate every item when a rule is registered on the array itself", () => {
        const validator = new Validator<any>({
            items: [new FieldValidations(required("Item is required"))],
        });

        const result = validator.validate({ data: { items: ["", "b", ""] }, fieldName: "items[1]" });

        expect([...result.keys()]).toEqual(["items[0]", "items[1]", "items[2]"]);
    });

    it("should return no results when the changed field has no registered rules", () => {
        const validator = new Validator<{ name: string }>({
            _name: new FieldValidations(required("Name is required")),
        });

        const result = validator.validate({ data: { name: "" }, fieldName: "unknownField" });

        expect(result.size).toBe(0);
    });
});
