import { describe, expect, it } from "vitest";
import { removeObjectValueImmutable } from "../src/lib/utils/removeObjectValueImmutable";
import { getFieldPath } from "../src/lib/utils/getFieldPath";

const remove = (data: any, name: string) =>
    removeObjectValueImmutable(data, getFieldPath(name));

describe("removeObjectValueImmutable – guards", () => {
    it("should return the input unchanged when data is null", () => {
        const result = remove(null, "name");

        expect(result).toBeNull();
    });

    it("should return the input unchanged when data is undefined", () => {
        const result = remove(undefined, "name");

        expect(result).toBeUndefined();
    });

    it("should return the same reference when the path is empty", () => {
        const data = { name: "John" };

        const result = remove(data, "");

        expect(result).toBe(data);
    });
});

describe("removeObjectValueImmutable – flat properties", () => {
    it("should return a new root object when a property is removed", () => {
        const data = { name: "John" };

        const result = remove(data, "name");

        expect(result).not.toBe(data);
    });

    it("should leave the original object untouched when a property is removed", () => {
        const data = { name: "John" };

        remove(data, "name");

        expect(data).toEqual({ name: "John" });
    });

    it("should drop the key from the returned object when a property is removed", () => {
        const data = { name: "John", age: 30 };

        const result = remove(data, "name");

        expect(Object.keys(result)).toEqual(["age"]);
    });

    it("should return an equal copy when the property does not exist", () => {
        const data = { name: "John" };

        const result = remove(data, "missing");

        expect(result).toEqual({ name: "John" });
    });

    it("should keep untouched siblings by reference when a property is removed", () => {
        const address = { city: "London" };
        const data = { name: "John", address };

        const result = remove(data, "name");

        expect(result.address).toBe(address);
    });
});

describe("removeObjectValueImmutable – nested objects", () => {
    it("should clone every object along the path when a nested property is removed", () => {
        const data = { profile: { address: { city: "London", zip: "N1" } } };

        const result = remove(data, "profile.address.city");

        expect(result.profile).not.toBe(data.profile);
        expect(result.profile.address).not.toBe(data.profile.address);
    });

    it("should leave the original nested object untouched when a nested property is removed", () => {
        const data = { profile: { address: { city: "London", zip: "N1" } } };

        remove(data, "profile.address.city");

        expect(data.profile.address).toEqual({ city: "London", zip: "N1" });
    });

    it("should drop only the leaf key when a nested property is removed", () => {
        const data = { profile: { address: { city: "London", zip: "N1" } } };

        const result = remove(data, "profile.address.city");

        expect(result.profile.address).toEqual({ zip: "N1" });
    });

    it("should remove the whole subtree when an intermediate object is removed", () => {
        const data = { profile: { address: { city: "London" }, name: "John" } };

        const result = remove(data, "profile.address");

        expect(result.profile).toEqual({ name: "John" });
    });

    it("should keep sibling branches by reference when a deep property is removed", () => {
        const settings = { theme: "dark" };
        const data = { profile: { address: { city: "London" } }, settings };

        const result = remove(data, "profile.address.city");

        expect(result.settings).toBe(settings);
    });
});

describe("removeObjectValueImmutable – arrays", () => {
    it("should clone the array when an item is removed by index", () => {
        const data = { tags: ["a", "b", "c"] };

        const result = remove(data, "tags[1]");

        expect(result.tags).not.toBe(data.tags);
    });

    it("should leave the original array untouched when an item is removed by index", () => {
        const data = { tags: ["a", "b", "c"] };

        remove(data, "tags[1]");

        expect(data.tags).toEqual(["a", "b", "c"]);
    });

    it.each([
        { name: "tags[0]", expected: ["b", "c"] },
        { name: "tags[1]", expected: ["a", "c"] },
        { name: "tags[2]", expected: ["a", "b"] },
    ])("should splice out the item and shift the rest when $name is removed", ({ name, expected }) => {
        const data = { tags: ["a", "b", "c"] };

        const result = remove(data, name);

        expect(result.tags).toEqual(expected);
    });

    it("should leave the array contents unchanged when the index is out of range", () => {
        const data = { tags: ["a", "b"] };

        const result = remove(data, "tags[5]");

        expect(result.tags).toEqual(["a", "b"]);
    });

    it("should remove the whole array when the array property itself is removed", () => {
        const data = { tags: ["a", "b"], name: "John" };

        const result = remove(data, "tags");

        expect(result).toEqual({ name: "John" });
    });

    it("should clone both the array and the item when an item property is removed", () => {
        const data = { contacts: [{ email: "a@mail.com", phone: "1" }] };

        const result = remove(data, "contacts[0].email");

        expect(result.contacts).not.toBe(data.contacts);
        expect(result.contacts[0]).not.toBe(data.contacts[0]);
    });

    it("should drop only the item property when an item property is removed", () => {
        const data = { contacts: [{ email: "a@mail.com", phone: "1" }] };

        const result = remove(data, "contacts[0].email");

        expect(result.contacts[0]).toEqual({ phone: "1" });
    });

    it("should keep untouched array items by reference when one item property is removed", () => {
        const second = { email: "b@mail.com" };
        const data = { contacts: [{ email: "a@mail.com" }, second] };

        const result = remove(data, "contacts[0].email");

        expect(result.contacts[1]).toBe(second);
    });

    it("should remove the item from the inner array when a nested array item is removed", () => {
        const data = { orders: [{ lines: [{ sku: "A" }, { sku: "B" }] }] };

        const result = remove(data, "orders[0].lines[0]");

        expect(result.orders[0].lines).toEqual([{ sku: "B" }]);
    });

    it("should leave the original inner array untouched when a nested array item is removed", () => {
        const data = { orders: [{ lines: [{ sku: "A" }, { sku: "B" }] }] };

        remove(data, "orders[0].lines[0]");

        expect(data.orders[0].lines).toEqual([{ sku: "A" }, { sku: "B" }]);
    });
});
