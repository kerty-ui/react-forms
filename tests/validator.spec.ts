import { describe, expect, it } from "vitest";
import { FieldValidations, Validator, Validations, Severity, type IValidationResult } from "../src/lib";

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

describe("Validator", () => {
    it("should report fieldDriven mode when constructed", () => {
        const validator = new Validator<{ name: string }>({});

        expect(validator.mode).toBe("fieldDriven");
    });
});

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

    it("should run a nested branch rule when its parent value is null", () => {
        const validator = new Validator<any>({
            person: {
                _name: new FieldValidations(required("Name is required")),
            },
        });

        const result = validator.validate({ data: { person: null } });

        expect(firstTextFor(result, "person.name")).toBe("Name is required");
    });

    it("should run a nested branch rule when its parent is absent from the data", () => {
        const validator = new Validator<any>({
            person: {
                _name: new FieldValidations(required("Name is required")),
            },
        });

        const result = validator.validate({ data: {} });

        expect(firstTextFor(result, "person.name")).toBe("Name is required");
    });

    it("should run a deeply nested rule when an intermediate object is missing", () => {
        const validator = new Validator<any>({
            person: {
                address: {
                    _city: new FieldValidations(required("City is required")),
                },
            },
        });

        const result = validator.validate({ data: {} });

        expect(firstTextFor(result, "person.address.city")).toBe("City is required");
    });

    it("should skip array item rules when the value is not an array", () => {
        const validator = new Validator<any>({
            items: [new FieldValidations({ check: () => true, message: "item is invalid" })],
        });

        const result = validator.validate({ data: { items: { value: "value" } } });

        expect(result.size).toBe(0);
    });

    it("should skip array item rules when the array is absent from the data", () => {
        const validator = new Validator<any>({
            items: [new FieldValidations({ check: () => true, message: "item is invalid" })],
        });

        const result = validator.validate({ data: {} });

        expect(result.size).toBe(0);
    });

    it("should skip nested array item rules when the array is absent from the data", () => {
        const validator = new Validator<any>({
            items: [
                {
                    _name: new FieldValidations(required("Name is required")),
                },
            ],
        });

        const result = validator.validate({ data: {} });

        expect(result.size).toBe(0);
    });
});

describe("Validator – parent context chain", () => {
    const capturedContext = (schema: any, data: any) => {
        let captured: any;
        const capture = new FieldValidations({ check: (ctx: any) => { captured = ctx; return false; }, message: "never" });
        new Validator<any>(schema(capture)).validate({ data });
        return captured;
    };

    const ancestorValues = (ctx: any) => {
        const values: any[] = [];
        for(let parentContext = ctx.parentContext; parentContext != null; parentContext = parentContext.parentContext) {
            values.push(parentContext.value);
        }
        return values;
    };

    it("should end the chain at the form data when the field is at the root", () => {
        const data = { name: "John" };

        const ctx = capturedContext((rule: any) => ({ _name: rule }), data);

        expect(ancestorValues(ctx)).toEqual([data]);
    });

    it("should chain the owning object and the form data when the field is nested", () => {
        const data = { person: { name: "John" } };

        const ctx = capturedContext((rule: any) => ({ person: { _name: rule } }), data);

        expect(ancestorValues(ctx)).toEqual([data.person, data]);
    });

    it("should chain the array and its owner when the field is an array item", () => {
        const data = { tags: ["a"] };

        const ctx = capturedContext((rule: any) => ({ tags: [rule] }), data);

        expect(ancestorValues(ctx)).toEqual([data.tags, data]);
    });

    it("should keep the owner of the array as parent when the field is an array item", () => {
        const data = { tags: ["a"] };

        const ctx = capturedContext((rule: any) => ({ tags: [rule] }), data);

        expect(ctx.parent).toBe(data);
    });

    it("should chain the item, the array and its owner when the field belongs to an array item", () => {
        const data = { items: [{ name: "a" }] };

        const ctx = capturedContext((rule: any) => ({ items: [{ _name: rule }] }), data);

        expect(ancestorValues(ctx)).toEqual([data.items[0], data.items, data]);
    });

    it("should chain the inner array, the outer array and its owner when the field is an item of a nested array", () => {
        const data = { matrix: [["a"]] };

        const ctx = capturedContext((rule: any) => ({ matrix: [[rule]] }), data);

        expect(ancestorValues(ctx)).toEqual([data.matrix[0], data.matrix, data]);
    });

    it("should reach the same ancestor objects as the data holds", () => {
        const data = { items: [{ name: "a" }] };

        const ctx = capturedContext((rule: any) => ({ items: [{ _name: rule }] }), data);

        expect(ctx.parentContext.parentContext.value).toBe(data.items);
    });
});

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

    it("should expose an undefined value and parent when the owning object is missing", () => {
        let captured: any;
        const validator = new Validator<any>({
            person: {
                _name: new FieldValidations({
                    check: (ctx) => { captured = ctx; return false; },
                    message: "never",
                }),
            },
        });

        validator.validate({ data: {} });

        expect(captured).toMatchObject({ value: undefined, fieldName: "person.name" });
        expect(captured.parent).toBeUndefined();
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

describe("Validator.validate – scoped to a changed field", () => {
    it("should validate the changed field when a field name is given", () => {
        const validator = new Validator<{ name: string; surname: string }>({
            _name: new FieldValidations(required("Name is required")),
            _surname: new FieldValidations(required("Surname is required")),
        });

        const result = validator.validate({ data: { name: "", surname: "" }, fieldName: "name" });

        expect(firstTextFor(result, "name")).toBe("Name is required");
    });

    it("should validate a nested changed field when its owning object is missing", () => {
        const validator = new Validator<any>({
            bank: {
                _iban: new FieldValidations(required("IBAN is required")),
            },
        });

        const result = validator.validate({ data: {}, fieldName: "bank.iban" });

        expect(firstTextFor(result, "bank.iban")).toBe("IBAN is required");
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

    it("should revalidate only the changed item when a rule is registered on the array itself", () => {
        const validator = new Validator<any>({
            items: [new FieldValidations(required("Item is required"))],
        });

        const result = validator.validate({ data: { items: ["", "b", ""] }, fieldName: "items[1]" });

        expect([...result.keys()]).toEqual(["items[1]"]);
    });

    it("should revalidate every item when the array rule carries a when condition", () => {
        const validator = new Validator<any>({
            items: [new FieldValidations({
                when: () => true,
                check: (ctx: any) => Validations.IsTextEmpty(ctx.value),
                message: "Item is required",
            })],
        });

        const result = validator.validate({ data: { items: ["", "b", ""] }, fieldName: "items[1]" });

        expect([...result.keys()]).toEqual(["items[0]", "items[1]", "items[2]"]);
    });

    it("should revalidate every item when the array rule is marked hasDependency", () => {
        const validator = new Validator<any>({
            items: [new FieldValidations({
                check: (ctx: any) => Validations.IsTextEmpty(ctx.value),
                message: "Item is required",
                hasDependency: true,
            })],
        });

        const result = validator.validate({ data: { items: ["", "b", ""] }, fieldName: "items[1]" });

        expect([...result.keys()]).toEqual(["items[0]", "items[1]", "items[2]"]);
    });

    it("should revalidate the array item field when that field changes", () => {
        const validator = new Validator<any>({
            items: [{ _name: new FieldValidations(required("Name is required")) }],
        });

        const result = validator.validate({
            data: { items: [{ name: "" }] },
            fieldName: "items[0].name",
        });

        expect(textsFor(result, "items[0].name")).toEqual(["Name is required"]);
    });

    it("should revalidate the changed item field only when one item field changes", () => {
        const validator = new Validator<any>({
            items: [{ _name: new FieldValidations(required("Name is required")) }],
        });

        const result = validator.validate({
            data: { items: [{ name: "a" }, { name: "b" }] },
            fieldName: "items[1].name",
        });

        expect([...result.keys()]).toEqual(["items[1].name"]);
    });

    it("should revalidate the item field at every index when it carries a when condition", () => {
        const validator = new Validator<any>({
            items: [{
                _name: new FieldValidations({
                    when: () => true,
                    check: (ctx: any) => Validations.IsTextEmpty(ctx.value),
                    message: "Name is required",
                }),
            }],
        });

        const result = validator.validate({
            data: { items: [{ name: "a" }, { name: "b" }] },
            fieldName: "items[1].name",
        });

        expect([...result.keys()].sort()).toEqual(["items[0].name", "items[1].name"]);
    });

    it("should revalidate the inner array item when a nested array item changes", () => {
        const validator = new Validator<any>({
            matrix: [[new FieldValidations(required("Cell is required"))]],
        });

        const result = validator.validate({
            data: { matrix: [["", "b"]] },
            fieldName: "matrix[0][0]",
        });

        expect(textsFor(result, "matrix[0][0]")).toEqual(["Cell is required"]);
    });

    it("should revalidate the field when it sits under two levels of arrays", () => {
        const validator = new Validator<any>({
            orders: [{ lines: [{ _sku: new FieldValidations(required("Sku is required")) }] }],
        });

        const result = validator.validate({
            data: { orders: [{ lines: [{ sku: "" }] }] },
            fieldName: "orders[0].lines[0].sku",
        });

        expect(textsFor(result, "orders[0].lines[0].sku")).toEqual(["Sku is required"]);
    });

    it("should revalidate the field when an array is nested inside an object", () => {
        const validator = new Validator<any>({
            nested: { items: [{ _label: new FieldValidations(required("Label is required")) }] },
        });

        const result = validator.validate({
            data: { nested: { items: [{ label: "" }] } },
            fieldName: "nested.items[0].label",
        });

        expect(textsFor(result, "nested.items[0].label")).toEqual(["Label is required"]);
    });

    it("should skip an unrelated array item field when a sibling array's field changes", () => {
        const validator = new Validator<any>({
            items: [{ _name: new FieldValidations(required("Name is required")) }],
            others: [{ _name: new FieldValidations(required("Other name is required")) }],
        });

        const result = validator.validate({
            data: { items: [{ name: "" }], others: [{ name: "" }] },
            fieldName: "items[0].name",
        });

        expect([...result.keys()]).toEqual(["items[0].name"]);
    });

    it("should skip a sibling field of the same array item when one field changes", () => {
        const validator = new Validator<any>({
            items: [{
                _name: new FieldValidations(required("Name is required")),
                _code: new FieldValidations(required("Code is required")),
            }],
        });

        const result = validator.validate({
            data: { items: [{ name: "", code: "" }] },
            fieldName: "items[0].name",
        });

        expect([...result.keys()]).toEqual(["items[0].name"]);
    });

    it("should return no results when the changed field has no registered rules", () => {
        const validator = new Validator<{ name: string }>({
            _name: new FieldValidations(required("Name is required")),
        });

        const result = validator.validate({ data: { name: "" }, fieldName: "unknownField" });

        expect(result.size).toBe(0);
    });

    it("should skip a field whose name extends the changed field name when that field changes", () => {
        const validator = new Validator<{ name: string; nameExtra: string }>({
            _name: new FieldValidations(required("Name is required")),
            _nameExtra: new FieldValidations(required("Name extra is required")),
        });

        const result = validator.validate({ data: { name: "", nameExtra: "" }, fieldName: "name" });

        expect([...result.keys()]).toEqual(["name"]);
    });

    it("should skip an item field whose name extends the changed item field name when that field changes", () => {
        const validator = new Validator<any>({
            items: [{
                _name: new FieldValidations(required("Name is required")),
                _nameExtra: new FieldValidations(required("Name extra is required")),
            }],
        });

        const result = validator.validate({
            data: { items: [{ name: "", nameExtra: "" }] },
            fieldName: "items[0].name",
        });

        expect([...result.keys()]).toEqual(["items[0].name"]);
    });

    it("should skip items whose index starts with the changed index when an array item changes", () => {
        const validator = new Validator<any>({
            items: [new FieldValidations(required("Item is required"))],
        });

        const result = validator.validate({
            data: { items: Array.from({ length: 12 }, () => "") },
            fieldName: "items[1]",
        });

        expect([...result.keys()]).toEqual(["items[1]"]);
    });

    it("should revalidate every item when the whole primitive array changes", () => {
        const validator = new Validator<any>({
            tags: [new FieldValidations(required("Tag is required"))],
        });

        const result = validator.validate({ data: { tags: ["", "b"] }, fieldName: "tags" });

        expect([...result.keys()]).toEqual(["tags[0]", "tags[1]"]);
    });

    it("should revalidate every item when the object owning a primitive array changes", () => {
        const validator = new Validator<any>({
            post: { tags: [new FieldValidations(required("Tag is required"))] },
        });

        const result = validator.validate({ data: { post: { tags: ["", "b"] } }, fieldName: "post" });

        expect([...result.keys()]).toEqual(["post.tags[0]", "post.tags[1]"]);
    });

    it("should revalidate only the inner items of the changed row when a nested array row changes", () => {
        const validator = new Validator<any>({
            matrix: [[new FieldValidations(required("Cell is required"))]],
        });

        const result = validator.validate({
            data: { matrix: [["", "b"], ["", "d"]] },
            fieldName: "matrix[1]",
        });

        expect([...result.keys()]).toEqual(["matrix[1][0]", "matrix[1][1]"]);
    });

    it("should revalidate a when rule in every item of another array when an unrelated field changes", () => {
        const validator = new Validator<any>({
            _title: new FieldValidations(required("Title is required")),
            rows: [{
                _name: new FieldValidations({
                    when: () => true,
                    check: (ctx: any) => Validations.IsTextEmpty(ctx.value),
                    message: "Name is required",
                }),
            }],
        });

        const result = validator.validate({
            data: { title: "", rows: [{ name: "" }, { name: "b" }] },
            fieldName: "title",
        });

        expect([...result.keys()].sort()).toEqual(["rows[0].name", "rows[1].name", "title"]);
    });

    it("should revalidate only rules that run for any change when the changed index is outside the array", () => {
        const validator = new Validator<any>({
            _title: new FieldValidations({ check: () => true, message: "Title", hasDependency: true }),
            items: [new FieldValidations(required("Item is required"))],
        });

        const result = validator.validate({ data: { title: "", items: ["", ""] }, fieldName: "items[5]" });

        expect([...result.keys()]).toEqual(["title"]);
    });

    it("should revalidate the field rules when a path below that field changes", () => {
        const validator = new Validator<any>({
            _name: new FieldValidations(required("Name is required")),
        });

        const result = validator.validate({ data: { name: "" }, fieldName: "name.first" });

        expect(textsFor(result, "name")).toEqual(["Name is required"]);
    });

    it("should revalidate the object rule when a field of that object changes", () => {
        const validator = new Validator<any>({
            _address: new FieldValidations({ check: (ctx: any) => !ctx.value.city || !ctx.value.zip, message: "City and zip are required" }),
        });

        const result = validator.validate({ data: { address: { city: "Riga", zip: "" } }, fieldName: "address.city" });

        expect(textsFor(result, "address")).toEqual(["City and zip are required"]);
    });

    it("should revalidate the array rule when a field of one of its items changes", () => {
        const validator = new Validator<any>({
            _items: new FieldValidations({ check: (ctx: any) => !ctx.value.some((item: any) => item.checked), message: "Check one item" }),
        });

        const result = validator.validate({ data: { items: [{ checked: true }] }, fieldName: "items[0].checked" });

        expect(textsFor(result, "items")).toEqual([]);
    });

    it("should revalidate the item rule of the changed item only when a field of that item changes", () => {
        const validator = new Validator<any>({
            items: [
                new FieldValidations({ check: (ctx: any) => ctx.value.from > ctx.value.to, message: "From must not exceed to" }),
                { _from: new FieldValidations(required("From is required")) },
            ],
        });

        const result = validator.validate({
            data: { items: [{ from: "1", to: "2" }, { from: "3", to: "2" }] },
            fieldName: "items[1].from",
        });

        expect([...result.keys()].sort()).toEqual(["items[1]", "items[1].from"]);
    });

    it("should revalidate the rules of every ancestor when a deeply nested field changes", () => {
        const validator = new Validator<any>({
            _orders: new FieldValidations({ check: () => true, message: "Orders" }),
            orders: [{
                lines: [new FieldValidations({ check: () => true, message: "Line" })],
            }],
        });

        const result = validator.validate({
            data: { orders: [{ lines: [{ qty: 1 }] }] },
            fieldName: "orders[0].lines[0].qty",
        });

        expect([...result.keys()].sort()).toEqual(["orders", "orders[0].lines[0]"]);
    });
});

describe("Validator – schema captured at construction", () => {
    it("should ignore a rule added to field validations when the validator is already constructed", () => {
        const nameValidations = new FieldValidations(required("Name is required"));
        const validator = new Validator<{ name: string }>({ _name: nameValidations });
        nameValidations.add({ check: () => true, message: "Added later" });

        const result = validator.validate({ data: { name: "" } });

        expect(textsFor(result, "name")).toEqual(["Name is required"]);
    });

    it("should ignore a when condition added to field validations when the validator is already constructed", () => {
        const surnameValidations = new FieldValidations(required("Surname is required"));
        const validator = new Validator<{ name: string; surname: string }>({
            _name: new FieldValidations(required("Name is required")),
            _surname: surnameValidations,
        });
        surnameValidations.add({ when: () => true, check: () => false, message: "Added later" });

        const result = validator.validate({ data: { name: "", surname: "" }, fieldName: "name" });

        expect(result.has("surname")).toBe(false);
    });

    it("should ignore a field added to the schema when the validator is already constructed", () => {
        const schema: any = { _name: new FieldValidations(required("Name is required")) };
        const validator = new Validator<any>(schema);
        schema._surname = new FieldValidations(required("Surname is required"));

        const result = validator.validate({ data: { name: "", surname: "" } });

        expect([...result.keys()]).toEqual(["name"]);
    });
});
