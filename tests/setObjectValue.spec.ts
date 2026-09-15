import { describe, expect, it } from "vitest";
import { setObjectValue } from "../src/lib/utils/setObjectValue";
import { getFieldPath } from "../src/lib/utils/getFieldPath";

describe("setObjectValue", () => {

    describe("basic functionality", () => {
        it("should set a simple property on an object", () => {
            const data = { name: "John" };
            setObjectValue(data, getFieldPath("name"), "Jane");

            expect(data.name).toBe("Jane");
        });

        it("should set multiple properties", () => {
            const data = { firstName: "John", lastName: "Doe" };
            setObjectValue(data, getFieldPath("firstName"), "Jane");
            setObjectValue(data, getFieldPath("lastName"), "Smith");

            expect(data.firstName).toBe("Jane");
            expect(data.lastName).toBe("Smith");
        });

        it("should set different value types", () => {
            const data: any = {};
            setObjectValue(data, getFieldPath("str"), "hello");
            setObjectValue(data, getFieldPath("num"), 42);
            setObjectValue(data, getFieldPath("bool"), true);
            setObjectValue(data, getFieldPath("nil"), null);
            
            expect(data.str).toBe("hello");
            expect(data.num).toBe(42);
            expect(data.bool).toBe(true);
            expect(data.nil).toBeNull();
        });

        it("should overwrite existing values", () => {
            const data = { value: "original" };
            setObjectValue(data, getFieldPath("value"), "updated");

            expect(data.value).toBe("updated");
        });
    });

    describe("nested objects", () => {
        it("should set values in nested objects", () => {
            const profile = { firstName: "John" }
            const data = { profile: profile };
            setObjectValue(data, getFieldPath("profile.firstName"), "Jane");

            expect(data.profile).toBe(profile);
            expect(data.profile.firstName).toBe("Jane");
        });

        it("should create missing intermediate objects", () => {
            const data: any = {};
            setObjectValue(data, getFieldPath("profile.firstName"), "John");
            
            expect(data.profile).toBeDefined();
            expect(data.profile.firstName).toBe("John");
        });

        it("should not destroy existing sibling properties when creating new paths", () => {
            const data = { profile: { firstName: "John", email: "john@example.com", lastName: "" } };
            setObjectValue(data, getFieldPath("profile.lastName"), "Doe");

            expect(data.profile.firstName).toBe("John");
            expect(data.profile.email).toBe("john@example.com");
            expect(data.profile.lastName).toBe("Doe");
        });
    });

    describe("arrays", () => {
        it("should set array items by index", () => {
            const data = { items: ["a", "b", "c"] };
            setObjectValue(data, getFieldPath("items[1]"), "B");
            
            expect(data.items[1]).toBe("B");
            expect(data.items).toEqual(["a", "B", "c"]);
        });

        it("should create array if missing", () => {
            const data: any = {};
            setObjectValue(data, getFieldPath("items[0]"), "first");
            
            expect(Array.isArray(data.items)).toBe(true);
            expect(data.items[0]).toBe("first");
        });

        it("should handle nested arrays", () => {
            const data = { matrix: [[1, 2], [3, 4]] };
            setObjectValue(data, getFieldPath("matrix[0][1]"), 20);
            
            expect(data.matrix[0][1]).toBe(20);
            expect(data.matrix).toEqual([[1, 20], [3, 4]]);
        });

        it("should handle arrays in nested objects", () => {
            const data = { profile: { contacts: ["email@example.com"] } };
            setObjectValue(data, getFieldPath("profile.contacts[0]"), "newemail@example.com");
            
            expect(data.profile.contacts[0]).toBe("newemail@example.com");
        });

        it("should create arrays with complex objects", () => {
            const data: any = {};
            setObjectValue(data, getFieldPath("orders[0].id"), 123);
            
            expect(Array.isArray(data.orders)).toBe(true);
            expect(data.orders[0]).toBeDefined();
            expect(data.orders[0].id).toBe(123);
        });

        it("should handle sparse array indices", () => {
            const data: any = {};
            setObjectValue(data, getFieldPath("items[5]"), "five");
            
            expect(data.items).toBeDefined();
            expect(data.items[5]).toBe("five");
        });

        it("should replace entire array reference", () => {
            const data = { items: ["a", "b"] };
            const newArray = ["x", "y", "z"];
            setObjectValue(data, getFieldPath("items"), newArray);
            
            expect(data.items).toBe(newArray);
            expect(data.items).toEqual(["x", "y", "z"]);
        });
    });

    describe("edge cases", () => {
        it("should return early if data is null", () => {
            // Should not throw, just return
            expect(() => setObjectValue(null, getFieldPath("prop"), "value")).not.toThrow();
        });

        it("should return early if data is undefined", () => {
            expect(() => setObjectValue(undefined, getFieldPath("prop"), "value")).not.toThrow();
        });

        it("should handle empty path", () => {
            const data = { name: "John" };
            setObjectValue(data, [], "Jane");
            
            // Empty path should do nothing
            expect(data.name).toBe("John");
        });

        it("should set property to undefined", () => {
            const data = { value: "something" };
            setObjectValue(data, getFieldPath("value"), undefined);
            
            expect(data.value).toBeUndefined();
        });

        it("should set property to null", () => {
            const data = { value: "something" };
            setObjectValue(data, getFieldPath("value"), null);
            
            expect(data.value).toBeNull();
        });

        it("should set property to 0", () => {
            const data: any = { value: 1 };
            setObjectValue(data, getFieldPath("value"), 0);
            
            expect(data.value).toBe(0);
        });

        it("should set property to empty string", () => {
            const data: any = { value: "something" };
            setObjectValue(data, getFieldPath("value"), "");
            
            expect(data.value).toBe("");
        });

        it("should set property to false", () => {
            const data: any = { value: true };
            setObjectValue(data, getFieldPath("value"), false);
            
            expect(data.value).toBe(false);
        });

        it("should mutate data directly (no cloning)", () => {
            const data = { value: "original" };
            const originalReference = data;
            setObjectValue(data, getFieldPath("value"), "updated");
            
            expect(data).toBe(originalReference);
            expect(originalReference.value).toBe("updated");
        });
    });


    describe("object replacement", () => {
        it("should replace entire objects", () => {
            const data = { profile: { firstName: "John" } };
            const newProfile = { firstName: "Jane", age: 30 };
            setObjectValue(data, getFieldPath("profile"), newProfile);
            
            expect(data.profile).toBe(newProfile);
            expect(data.profile).toEqual({ firstName: "Jane", age: 30 });
        });
    });

    describe("real-world scenarios", () => {
        it("should handle form-like data structure", () => {
            const formData: any = {
                profile: {
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                },
                orders: [
                    { id: 1, status: "pending" },
                    { id: 2, status: "shipped" },
                ],
            };
            setObjectValue(formData, getFieldPath("profile.firstName"), "Jane");
            setObjectValue(formData, getFieldPath("orders[0].status"), "completed");

            expect(formData.profile.firstName).toBe("Jane");
            expect(formData.orders[0].status).toBe("completed");
        });

        it("should handle e-commerce order structure", () => {
            const order: any = {
                items: [
                    { sku: "ABC-001", qty: 5 },
                    { sku: "XYZ-002", qty: 3 },
                ],
            };
            setObjectValue(order, getFieldPath("items[0].qty"), 10);

            expect(order.items[0].qty).toBe(10);
        });

        it("should handle deeply nested config structures", () => {
            const config: any = {};
            setObjectValue(config, getFieldPath("settings.display.theme.primary.color"), "#FF5733");
            
            expect(config.settings.display.theme.primary.color).toBe("#FF5733");
        });

        it("should support rapid successive updates", () => {
            const data: any = { profile: {} };
            setObjectValue(data, getFieldPath("profile.firstName"), "John");
            setObjectValue(data, getFieldPath("profile.lastName"), "Doe");
            setObjectValue(data, getFieldPath("profile.email"), "john@example.com");
            setObjectValue(data, getFieldPath("profile.age"), 30);
            
            expect(data.profile).toEqual({
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com",
                age: 30,
            });
        });
    });

    describe("type safety scenarios", () => {
        it("should work with generic type parameters", () => {
            const data: any = {};
            setObjectValue(data, getFieldPath("profile.name"), "John");
            setObjectValue(data, getFieldPath("profile.age"), 30);

            expect(data.profile.name).toBe("John");
            expect(data.profile.age).toBe(30);
        });
    });

});
