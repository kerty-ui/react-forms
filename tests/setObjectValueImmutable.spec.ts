import { describe, expect, it } from "vitest";
import { setObjectValueImmutable } from "../src/lib/utils/setObjectValueImmutable";
import { getFieldPath } from "../src/lib/utils/getFieldPath";

const set = <T,>(data: any, name: string, value: T) =>
    setObjectValueImmutable(data, getFieldPath(name), value);

// ─── guards ──────────────────────────────────────────────────────────────────

describe("setObjectValueImmutable – guards", () => {
    it("should return the input unchanged when data is null", () => {
        const result = set(null, "name", "Jane");

        expect(result).toBeNull();
    });

    it("should return the input unchanged when data is undefined", () => {
        const result = set(undefined, "name", "Jane");

        expect(result).toBeUndefined();
    });

    it("should return the same reference when the path is empty", () => {
        const data = { name: "John" };

        const result = set(data, "", "Jane");

        expect(result).toBe(data);
    });
});

// ─── flat properties ─────────────────────────────────────────────────────────

describe("setObjectValueImmutable – flat properties", () => {
    it("should return a new root object when a property is set", () => {
        const data = { name: "John" };

        const result = set(data, "name", "Jane");

        expect(result).not.toBe(data);
    });

    it("should leave the original object untouched when a property is set", () => {
        const data = { name: "John" };

        set(data, "name", "Jane");

        expect(data.name).toBe("John");
    });

    it("should write the value on the returned object when a property is set", () => {
        const data = { name: "John" };

        const result = set(data, "name", "Jane");

        expect(result.name).toBe("Jane");
    });

    it("should add the property when it does not exist yet", () => {
        const data: any = {};

        const result = set(data, "name", "Jane");

        expect(result.name).toBe("Jane");
    });

    it("should keep untouched siblings by reference when a property is set", () => {
        const address = { city: "London" };
        const data = { name: "John", address };

        const result = set(data, "name", "Jane");

        expect(result.address).toBe(address);
    });
});

// ─── nested objects ──────────────────────────────────────────────────────────

describe("setObjectValueImmutable – nested objects", () => {
    it("should clone every object along the path when a nested property is set", () => {
        const profile = { firstName: "John" };
        const data = { profile };

        const result = set(data, "profile.firstName", "Jane");

        expect(result.profile).not.toBe(profile);
    });

    it("should leave the original nested object untouched when a nested property is set", () => {
        const profile = { firstName: "John" };
        const data = { profile };

        set(data, "profile.firstName", "Jane");

        expect(profile.firstName).toBe("John");
    });

    it("should write the value at the nested path when a nested property is set", () => {
        const data = { profile: { firstName: "John" } };

        const result = set(data, "profile.firstName", "Jane");

        expect(result.profile.firstName).toBe("Jane");
    });

    it("should create the missing intermediate object when the path does not exist", () => {
        const data: any = {};

        const result = set(data, "profile.address.city", "London");

        expect(result.profile.address.city).toBe("London");
    });

    it("should keep sibling branches by reference when a deep property is set", () => {
        const other = { keep: true };
        const data = { profile: { firstName: "John" }, other };

        const result = set(data, "profile.firstName", "Jane");

        expect(result.other).toBe(other);
    });
});

// ─── arrays ──────────────────────────────────────────────────────────────────

describe("setObjectValueImmutable – arrays", () => {
    it("should clone the array when an item is set by index", () => {
        const tags = ["ts", "js"];
        const data = { tags };

        const result = set(data, "tags[1]", "node");

        expect(result.tags).not.toBe(tags);
    });

    it("should leave the original array untouched when an item is set by index", () => {
        const tags = ["ts", "js"];
        const data = { tags };

        set(data, "tags[1]", "node");

        expect(tags).toEqual(["ts", "js"]);
    });

    it("should write the item at the given index when an item is set", () => {
        const data = { tags: ["ts", "js"] };

        const result = set(data, "tags[1]", "node");

        expect(result.tags[1]).toBe("node");
    });

    it("should create the array when the array property is missing", () => {
        const data: any = {};

        const result = set(data, "tags[0]", "ts");

        expect(Array.isArray(result.tags)).toBe(true);
    });

    it("should replace a non-array value with an array when the path marks it as an array", () => {
        const data: any = { tags: { notAnArray: true } };

        const result = set(data, "tags[0].name", "ts");

        expect(Array.isArray(result.tags)).toBe(true);
    });

    it("should clone both the array and the item when an item property is set", () => {
        const item = { name: "a" };
        const data = { items: [item] };

        const result = set(data, "items[0].name", "b");

        expect(result.items[0]).not.toBe(item);
    });

    it("should keep untouched array items by reference when one item property is set", () => {
        const kept = { name: "b" };
        const data = { items: [{ name: "a" }, kept] };

        const result = set(data, "items[0].name", "changed");

        expect(result.items[1]).toBe(kept);
    });

    it("should write the value in the inner array when a nested array item is set", () => {
        const data = { matrix: [["a", "b"]] };

        const result = set(data, "matrix[0][1]", "c");

        expect(result.matrix[0][1]).toBe("c");
    });

    it("should clone the inner array when a nested array item is set", () => {
        const inner = ["a", "b"];
        const data = { matrix: [inner] };

        set(data, "matrix[0][1]", "c");

        expect(inner).toEqual(["a", "b"]);
    });
});
