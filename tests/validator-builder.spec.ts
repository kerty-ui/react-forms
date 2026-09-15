import { describe, expect, it } from "vitest";
import { ValidationBuilder, ValidatorBuilder } from "../src/lib/validation/validatorBuilder";
import { Validations } from "../src/lib/validation/validations";
import { Severity, type IValidationResult } from "../src/lib/types";

// ─── shared models ───────────────────────────────────────────────────────────

type SimpleModel = {
    name: string;
    age: number;
};

type NestedModel = {
    value: string;
    person: {
        name: string;
        surname: string;
    };
};

type ArrayModel = {
    tags: string[];
    items: {
        brand: string;
        mark: string;
    }[];
};

type DeepModel = {
    matrix: string[][];
    nested: {
        items: {
            label: string;
        }[];
    };
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const textsFor = (result: Map<string, IValidationResult>, field: string) =>
    result.get(field)?.messages.map(m => m.text);

const firstTextFor = (result: Map<string, IValidationResult>, field: string) =>
    result.get(field)?.messages[0]?.text;

const isTextEmpty = (ctx: any) => Validations.IsTextEmpty(ctx.value);
const isUnderage = (ctx: any) => Validations.IsLessThan(ctx.value, 18);

// ─── builder API ─────────────────────────────────────────────────────────────

describe("ValidatorBuilder.validationFor", () => {
    it("should return a ValidationBuilder when a path is requested", () => {
        const builder = new ValidatorBuilder<SimpleModel>();

        const validationBuilder = builder.validationFor("name");

        expect(validationBuilder).toBeInstanceOf(ValidationBuilder);
    });

    it("should return the same builder when the same path is requested twice", () => {
        const builder = new ValidatorBuilder<SimpleModel>();

        const first = builder.validationFor("name");
        const second = builder.validationFor("name");

        expect(first).toBe(second);
    });

    it("should return distinct builders when different paths are requested", () => {
        const builder = new ValidatorBuilder<SimpleModel>();

        const nameBuilder = builder.validationFor("name");
        const ageBuilder = builder.validationFor("age");

        expect(nameBuilder).not.toBe(ageBuilder);
    });

    it("should accumulate rules when add is chained", () => {
        const builder = new ValidatorBuilder<SimpleModel>();
        const validationBuilder = builder.validationFor("name") as ValidationBuilder<SimpleModel, string>;

        validationBuilder
            .add({ check: () => true, message: "rule 1" })
            .add({ check: () => true, message: "rule 2" });

        expect(validationBuilder.validations).toHaveLength(2);
    });

    it("should accumulate rules when the same path is requested in separate calls", () => {
        const builder = new ValidatorBuilder<SimpleModel>();

        builder.validationFor("name").add({ check: () => true, message: "rule 1" });
        builder.validationFor("name").add({ check: () => true, message: "rule 2" });

        expect((builder.validationFor("name") as ValidationBuilder<SimpleModel, string>).validations).toHaveLength(2);
    });
});

describe("ValidatorBuilder.setup", () => {
    it("should pass itself to the callback when invoked", () => {
        const builder = new ValidatorBuilder<SimpleModel>();
        let received: unknown;

        builder.setup((b) => { received = b; });

        expect(received).toBe(builder);
    });

    it("should return itself when invoked so calls can be chained", () => {
        const builder = new ValidatorBuilder<SimpleModel>();

        const returned = builder.setup(() => { });

        expect(returned).toBe(builder);
    });

    it("should keep registrations from every call when setup runs more than once", () => {
        const builder = new ValidatorBuilder<SimpleModel>();
        builder.setup((b) => b.validationFor("name").add({ check: isTextEmpty, message: "Name is required" }));
        builder.setup((b) => b.validationFor("age").add({ check: isUnderage, message: "Must be adult" }));
        const validator = builder.build();

        const result = validator.validate({ data: { name: "", age: 10 } });

        expect([...result.keys()].sort()).toEqual(["age", "name"]);
    });
});

describe("ValidatorBuilder.build", () => {
    it("should produce a fieldDriven validator when built", () => {
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("name").add({ check: isTextEmpty, message: "Name is required" }))
            .build();

        expect(validator.mode).toBe("fieldDriven");
    });
});

// ─── path shapes ─────────────────────────────────────────────────────────────

describe("ValidatorBuilder – root level paths", () => {
    it("should report the failure under the field name when a root field fails", () => {
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("name").add({ check: isTextEmpty, message: "Name is required" }))
            .build();

        const result = validator.validate({ data: { name: "", age: 25 } });

        expect(firstTextFor(result, "name")).toBe("Name is required");
    });

    it("should return no results when the root field passes", () => {
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("name").add({ check: isTextEmpty, message: "Name is required" }))
            .build();

        const result = validator.validate({ data: { name: "John", age: 25 } });

        expect(result.size).toBe(0);
    });

    it("should expose the form data as both data and parent when the field is at the root", () => {
        const data: SimpleModel = { name: "John", age: 30 };
        let captured: any;
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("name").add({
                check: (ctx) => { captured = ctx; return false; },
                message: "never",
            }))
            .build();

        validator.validate({ data });

        expect(captured).toMatchObject({ data, parent: data, value: "John", fieldName: "name" });
    });
});

describe("ValidatorBuilder – nested object paths", () => {
    it("should report the failure under the dotted path when a nested field fails", () => {
        const validator = new ValidatorBuilder<NestedModel>()
            .setup((b) => b.validationFor("person.name").add({ check: isTextEmpty, message: "Name is required" }))
            .build();

        const result = validator.validate({ data: { value: "v", person: { name: "", surname: "Doe" } } });

        expect(firstTextFor(result, "person.name")).toBe("Name is required");
    });

    it("should expose the owning object as parent when the field is nested", () => {
        const data: NestedModel = { value: "v", person: { name: "John", surname: "Doe" } };
        let captured: any;
        const validator = new ValidatorBuilder<NestedModel>()
            .setup((b) => b.validationFor("person.name").add({
                check: (ctx) => { captured = ctx; return false; },
                message: "never",
            }))
            .build();

        validator.validate({ data });

        expect(captured.parent).toBe(data.person);
    });
});

describe("ValidatorBuilder – array paths", () => {
    it("should report every failing item when the rule targets primitive array items", () => {
        const validator = new ValidatorBuilder<ArrayModel>()
            .setup((b) => b.validationFor("tags[]").add({ check: isTextEmpty, message: "Tag is required" }))
            .build();

        const result = validator.validate({ data: { tags: ["ts", "", ""], items: [] } });

        expect([...result.keys()]).toEqual(["tags[1]", "tags[2]"]);
    });

    it("should report the failure under the indexed property path when the rule targets an item field", () => {
        const validator = new ValidatorBuilder<ArrayModel>()
            .setup((b) => b.validationFor("items[].brand").add({ check: isTextEmpty, message: "Brand is required" }))
            .build();

        const result = validator.validate({ data: { tags: [], items: [{ brand: "BMW", mark: "m" }, { brand: "", mark: "m" }] } });

        expect([...result.keys()]).toEqual(["items[1].brand"]);
    });

    it("should register both rules when two fields of the same array item are configured", () => {
        const validator = new ValidatorBuilder<ArrayModel>()
            .setup((b) => {
                b.validationFor("items[].brand").add({ check: isTextEmpty, message: "Brand is required" });
                b.validationFor("items[].mark").add({ check: isTextEmpty, message: "Mark is required" });
            })
            .build();

        const result = validator.validate({ data: { tags: [], items: [{ brand: "", mark: "" }] } });

        expect([...result.keys()].sort()).toEqual(["items[0].brand", "items[0].mark"]);
    });

    it("should expose the item as parent when the rule targets an item field", () => {
        const data: ArrayModel = { tags: [], items: [{ brand: "BMW", mark: "m" }] };
        let captured: any;
        const validator = new ValidatorBuilder<ArrayModel>()
            .setup((b) => b.validationFor("items[].brand").add({
                check: (ctx) => { captured = ctx; return false; },
                message: "never",
            }))
            .build();

        validator.validate({ data });

        expect(captured.parent).toBe(data.items[0]);
    });

    it("should report the failure under both indices when the rule targets a nested array item", () => {
        const validator = new ValidatorBuilder<DeepModel>()
            .setup((b) => b.validationFor("matrix[][]").add({ check: isTextEmpty, message: "Cell is required" }))
            .build();

        const result = validator.validate({ data: { matrix: [["a", ""]], nested: { items: [] } } });

        expect([...result.keys()]).toEqual(["matrix[0][1]"]);
    });

    it("should report the failure under the full path when the array is nested inside an object", () => {
        const validator = new ValidatorBuilder<DeepModel>()
            .setup((b) => b.validationFor("nested.items[].label").add({ check: isTextEmpty, message: "Label is required" }))
            .build();

        const result = validator.validate({ data: { matrix: [], nested: { items: [{ label: "" }] } } });

        expect([...result.keys()]).toEqual(["nested.items[0].label"]);
    });
});

// ─── rule options pass-through ───────────────────────────────────────────────

describe("ValidatorBuilder – rule options", () => {
    it("should skip the rule when its when predicate returns false", () => {
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("name").add({
                when: () => false,
                check: () => true,
                message: "Name is required",
            }))
            .build();

        const result = validator.validate({ data: { name: "", age: 20 } });

        expect(result.size).toBe(0);
    });

    it("should include the rule set rule alongside unscoped rules when its rule set is active", () => {
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("name")
                .add({ ruleSet: "submit", check: isTextEmpty, message: "Name is required" })
                .add({ check: () => true, message: "Always" }))
            .build();

        const result = validator.validate({ data: { name: "", age: 20 }, ruleSet: "submit" });

        expect(textsFor(result, "name")).toEqual(["Name is required", "Always"]);
    });

    it("should run only the unscoped rules when no rule set is active", () => {
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("name")
                .add({ ruleSet: "submit", check: isTextEmpty, message: "Name is required" })
                .add({ check: () => true, message: "Always" }))
            .build();

        const result = validator.validate({ data: { name: "", age: 20 } });

        expect(textsFor(result, "name")).toEqual(["Always"]);
    });

    it("should carry the severity through to the result when a rule declares one", () => {
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("age").add({
                check: () => true,
                severity: Severity.Warning,
                message: "Age looks unusual",
            }))
            .build();

        const result = validator.validate({ data: { name: "n", age: 200 } });

        expect(result.get("age")?.has(Severity.Warning)).toBe(true);
    });

    it("should preserve declaration order when several rules on a field fire", () => {
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("name")
                .add({ check: () => true, message: "First" })
                .add({ check: () => true, message: "Second" }))
            .build();

        const result = validator.validate({ data: { name: "", age: 20 } });

        expect(textsFor(result, "name")).toEqual(["First", "Second"]);
    });

    it("should stop evaluating later rules when a fired rule sets stop", () => {
        let secondCheckCalled = false;
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => b.validationFor("name")
                .add({ check: () => true, message: "First", stop: true })
                .add({ check: () => { secondCheckCalled = true; return true; }, message: "Second" }))
            .build();

        validator.validate({ data: { name: "", age: 20 } });

        expect(secondCheckCalled).toBe(false);
    });

    it("should add the message on a false check when addMessageWhenCheckIs is false", () => {
        const validator = new ValidatorBuilder<SimpleModel>({ addMessageWhenCheckIs: false })
            .setup((b) => b.validationFor("name").add({
                check: (ctx) => Validations.IsTextNotEmpty(ctx.value),
                message: "Name is required",
            }))
            .build();

        const result = validator.validate({ data: { name: "", age: 20 } });

        expect(firstTextFor(result, "name")).toBe("Name is required");
    });
});

// ─── on-change scoping ───────────────────────────────────────────────────────

describe("ValidatorBuilder – scoped to a changed field", () => {
    it("should validate only the changed field when a field name is given", () => {
        const validator = new ValidatorBuilder<SimpleModel>()
            .setup((b) => {
                b.validationFor("name").add({ check: isTextEmpty, message: "Name is required" });
                b.validationFor("age").add({ check: isUnderage, message: "Must be adult" });
            })
            .build();

        const result = validator.validate({ data: { name: "", age: 10 }, fieldName: "name" });

        expect([...result.keys()]).toEqual(["name"]);
    });

    it("should also validate a dependent field when another field changes", () => {
        const validator = new ValidatorBuilder<{ password: string; confirmPassword: string }>()
            .setup((b) => b.validationFor("confirmPassword").add({
                check: (ctx) => ctx.value !== ctx.parent.password,
                message: "Passwords must match",
                hasDependency: true,
            }))
            .build();

        const result = validator.validate({
            data: { password: "abc", confirmPassword: "xyz" },
            fieldName: "password",
        });

        expect(firstTextFor(result, "confirmPassword")).toBe("Passwords must match");
    });

    it("should revalidate every item when the rule targets primitive array items", () => {
        const validator = new ValidatorBuilder<ArrayModel>()
            .setup((b) => b.validationFor("tags[]").add({ check: isTextEmpty, message: "Tag is required" }))
            .build();

        const result = validator.validate({ data: { tags: ["", "b"], items: [] }, fieldName: "tags[1]" });

        expect([...result.keys()]).toEqual(["tags[0]", "tags[1]"]);
    });
});
