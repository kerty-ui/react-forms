import { describe, expect, it } from "vitest";
import {
    ValidationResult,
    SingleMessageResult,
    SingleMessageResults,
    MultiMessageResults,
    SingleMessageDrivenValidator,
    MultiMessageDrivenValidator,
    Severity
} from "../src/lib";

const texts = (result: { messages: readonly { text: string }[] } | undefined) =>
    result?.messages.map(m => m.text);

describe("ValidationResult", () => {
    it("should report no messages when newly created", () => {
        const result = new ValidationResult();

        expect(result.messages).toEqual([]);
    });

    it("should report severity None when newly created", () => {
        const result = new ValidationResult();

        expect(result.has(Severity.None)).toBe(true);
    });

    it("should not share the message array between instances when one instance adds a message", () => {
        const untouched = new ValidationResult();

        new ValidationResult().add({ text: "one" });

        expect(untouched.messages).toHaveLength(0);
    });

    it("should default to Error severity when a message is added without one", () => {
        const result = new ValidationResult().add({ text: "boom" });

        expect(result.has(Severity.Error)).toBe(true);
    });

    it("should keep every added message when add is called repeatedly", () => {
        const result = new ValidationResult()
            .add({ text: "first" })
            .add({ text: "second" });

        expect(texts(result)).toEqual(["first", "second"]);
    });

    it("should accumulate severities when messages of different severities are added", () => {
        const result = new ValidationResult()
            .add({ text: "warn", severity: Severity.Warning })
            .add({ text: "err", severity: Severity.Error });

        expect(result.has(Severity.Warning) && result.has(Severity.Error)).toBe(true);
    });

    it("should not report a severity that was never added when other severities exist", () => {
        const result = new ValidationResult().add({ text: "warn", severity: Severity.Warning });

        expect(result.has(Severity.Error)).toBe(false);
    });

    it("should replace all previous messages when set is called", () => {
        const result = new ValidationResult()
            .add({ text: "first" })
            .set({ text: "only", severity: Severity.Success });

        expect(texts(result)).toEqual(["only"]);
    });

    it("should replace the accumulated severity when set is called", () => {
        const result = new ValidationResult()
            .add({ text: "first", severity: Severity.Error })
            .set({ text: "only", severity: Severity.Success });

        expect(result.has(Severity.Error)).toBe(false);
    });

    it("should append the other result's messages when merge is called", () => {
        const other = new ValidationResult().add({ text: "b" }).add({ text: "c" });

        const result = new ValidationResult().add({ text: "a" }).merge(other);

        expect(texts(result)).toEqual(["a", "b", "c"]);
    });

    it("should leave the target unchanged when merging an empty result", () => {
        const result = new ValidationResult().add({ text: "a" }).merge(new ValidationResult());

        expect(texts(result)).toEqual(["a"]);
    });

    it("should return itself when merge is called so calls can be chained", () => {
        const result = new ValidationResult();

        expect(result.merge(new ValidationResult().add({ text: "a" }))).toBe(result);
    });
});

describe("SingleMessageResult", () => {
    it("should hold exactly the given message when constructed", () => {
        const result = new SingleMessageResult("Required");

        expect(texts(result)).toEqual(["Required"]);
    });

    it("should default to Error severity when no severity is given", () => {
        const result = new SingleMessageResult("Required");

        expect(result.has(Severity.Error)).toBe(true);
    });

    it("should use the given severity when one is provided", () => {
        const result = new SingleMessageResult("Looks good", Severity.Success);

        expect(result.has(Severity.Success)).toBe(true);
    });

    it("should not report Error when constructed with a non-error severity", () => {
        const result = new SingleMessageResult("Heads up", Severity.Warning);

        expect(result.has(Severity.Error)).toBe(false);
    });
});

describe("SingleMessageResults", () => {
    it("should be valid when no messages were added", () => {
        const results = new SingleMessageResults<any>();

        expect(results.isValid).toBe(true);
    });

    it("should store the form message under the empty key when setFormMessage is called", () => {
        const results = new SingleMessageResults<any>().setFormMessage("Form failed");

        expect(texts(results.get(""))).toEqual(["Form failed"]);
    });

    it("should become invalid when an error-severity form message is added", () => {
        const results = new SingleMessageResults<any>().setFormMessage("Form failed");

        expect(results.isValid).toBe(false);
    });

    it("should stay valid when a non-error form message is added", () => {
        const results = new SingleMessageResults<any>().setFormMessage("Heads up", Severity.Warning);

        expect(results.isValid).toBe(true);
    });

    it("should store the field message under the field key when setFieldMessage is called", () => {
        const results = new SingleMessageResults<any>().setFieldMessage("name", "Name is required");

        expect(texts(results.get("name"))).toEqual(["Name is required"]);
    });

    it("should keep only the last message when setFieldMessage is called twice for one field", () => {
        const results = new SingleMessageResults<any>()
            .setFieldMessage("name", "First")
            .setFieldMessage("name", "Second");

        expect(texts(results.get("name"))).toEqual(["Second"]);
    });

    it("should become invalid when an error-severity field message is added", () => {
        const results = new SingleMessageResults<any>().setFieldMessage("name", "Name is required");

        expect(results.isValid).toBe(false);
    });
});

describe("MultiMessageResults", () => {
    it("should be valid when no messages were added", () => {
        const results = new MultiMessageResults<any>();

        expect(results.isValid).toBe(true);
    });

    it("should store the message once when addFormMessage is called", () => {
        const results = new MultiMessageResults<any>().addFormMessage("Form failed");

        expect(texts(results.get(""))).toEqual(["Form failed"]);
    });

    it("should keep every message when addFormMessage is called twice", () => {
        const results = new MultiMessageResults<any>()
            .addFormMessage("First")
            .addFormMessage("Second");

        expect(texts(results.get(""))).toEqual(["First", "Second"]);
    });

    it("should stay valid when only non-error form messages are added", () => {
        const results = new MultiMessageResults<any>().addFormMessage("Heads up", Severity.Warning);

        expect(results.isValid).toBe(true);
    });

    it("should carry the severity through when a non-error form message is added", () => {
        const results = new MultiMessageResults<any>().addFormMessage("Heads up", Severity.Warning);

        expect(results.get("")?.has(Severity.Error)).toBe(false);
    });

    it("should become invalid when an error joins earlier non-error form messages", () => {
        const results = new MultiMessageResults<any>()
            .addFormMessage("Heads up", Severity.Warning)
            .addFormMessage("Form failed");

        expect(results.isValid).toBe(false);
    });

    it("should keep form and field messages apart when both are added", () => {
        const results = new MultiMessageResults<any>()
            .addFormMessage("Form first")
            .addFieldMessage("name", "Field first")
            .addFormMessage("Form second")
            .addFieldMessage("name", "Field second");

        expect([texts(results.get("")), texts(results.get("name"))]).toEqual([
            ["Form first", "Form second"],
            ["Field first", "Field second"],
        ]);
    });

    it("should return itself when addFormMessage is called so calls can be chained", () => {
        const results = new MultiMessageResults<any>();

        expect(results.addFormMessage("Form failed")).toBe(results);
    });

    it("should return itself when addFieldMessage is called so calls can be chained", () => {
        const results = new MultiMessageResults<any>();

        expect(results.addFieldMessage("name", "Required")).toBe(results);
    });

    it("should keep every message when addFieldMessage is called twice for one field", () => {
        const results = new MultiMessageResults<any>()
            .addFieldMessage("name", "First")
            .addFieldMessage("name", "Second");

        expect(texts(results.get("name"))).toEqual(["First", "Second"]);
    });

    it("should become invalid when an error-severity field message is added", () => {
        const results = new MultiMessageResults<any>().addFieldMessage("name", "Name is required");

        expect(results.isValid).toBe(false);
    });

    it("should stay valid when only non-error field messages are added", () => {
        const results = new MultiMessageResults<any>().addFieldMessage("name", "Heads up", Severity.Warning);

        expect(results.isValid).toBe(true);
    });

    it("should become invalid when an error-severity form message is added", () => {
        const results = new MultiMessageResults<any>().addFormMessage("Form failed");

        expect(results.isValid).toBe(false);
    });
});

describe("SingleMessageDrivenValidator", () => {
    it("should report messageDriven mode when constructed", () => {
        const validator = new SingleMessageDrivenValidator<any>(() => { });

        expect(validator.mode).toBe("messageDriven");
    });

    it("should pass the form data to the callback when validate is called", () => {
        let received: unknown;
        const validator = new SingleMessageDrivenValidator<any>((_, ctx) => { received = ctx.data; });
        const data = { name: "John" };

        validator.validate({ data });

        expect(received).toBe(data);
    });

    it("should pass the active rule set to the callback when validate is called", () => {
        let received: unknown;
        const validator = new SingleMessageDrivenValidator<any>((_, ctx) => { received = ctx.ruleSet; });

        validator.validate({ data: {}, ruleSet: "submit" });

        expect(received).toBe("submit");
    });

    it("should return the field message keyed by field when the callback sets one", () => {
        const validator = new SingleMessageDrivenValidator<any>((result) => {
            result.setFieldMessage("name", "Name is required");
        });

        const result = validator.validate({ data: {} });

        expect(texts(result.get("name"))).toEqual(["Name is required"]);
    });

    it("should keep only the last message when the callback sets a field twice", () => {
        const validator = new SingleMessageDrivenValidator<any>((result) => {
            result.setFieldMessage("name", "First");
            result.setFieldMessage("name", "Second");
        });

        const result = validator.validate({ data: {} });

        expect(texts(result.get("name"))).toEqual(["Second"]);
    });

    it("should ignore the message when the callback passes an empty field name", () => {
        const validator = new SingleMessageDrivenValidator<any>((result) => {
            result.setFieldMessage("" as any, "Nowhere");
        });

        const result = validator.validate({ data: {} });

        expect(result.size).toBe(0);
    });

    it("should return an empty map when the callback adds nothing", () => {
        const validator = new SingleMessageDrivenValidator<any>(() => { });

        const result = validator.validate({ data: {} });

        expect(result.size).toBe(0);
    });
});

describe("MultiMessageDrivenValidator", () => {
    it("should report messageDriven mode when constructed", () => {
        const validator = new MultiMessageDrivenValidator<any>(() => { });

        expect(validator.mode).toBe("messageDriven");
    });

    it("should keep every message when the callback adds two to one field", () => {
        const validator = new MultiMessageDrivenValidator<any>((result) => {
            result.addFieldMessage("name", "First").addFieldMessage("name", "Second");
        });

        const result = validator.validate({ data: {} });

        expect(texts(result.get("name"))).toEqual(["First", "Second"]);
    });

    it("should use the given severity when the callback provides one", () => {
        const validator = new MultiMessageDrivenValidator<any>((result) => {
            result.addFieldMessage("name", "Heads up", Severity.Warning);
        });

        const result = validator.validate({ data: {} });

        expect(result.get("name")?.has(Severity.Error)).toBe(false);
    });

    it("should ignore the message when the callback passes an empty field name", () => {
        const validator = new MultiMessageDrivenValidator<any>((result) => {
            result.addFieldMessage("" as any, "Nowhere");
        });

        const result = validator.validate({ data: {} });

        expect(result.size).toBe(0);
    });

    it("should build an independent result when validate is called twice", () => {
        const validator = new MultiMessageDrivenValidator<any>((result) => {
            result.addFieldMessage("name", "Required");
        });

        validator.validate({ data: {} });
        const second = validator.validate({ data: {} });

        expect(texts(second.get("name"))).toEqual(["Required"]);
    });
});
