import { describe, expect, it } from "vitest";
import { isEqual } from "../src/lib/utils/isEqual";

describe("isEqual - primitives", () => {
    it("should return true for identical numbers", () => {
        expect(isEqual(42, 42)).toBe(true);
        expect(isEqual(0, 0)).toBe(true);
        expect(isEqual(-1, -1)).toBe(true);
        expect(isEqual(3.14, 3.14)).toBe(true);
    });

    it("should return false for different numbers", () => {
        expect(isEqual(42, 43)).toBe(false);
        expect(isEqual(0, 1)).toBe(false);
        expect(isEqual(3.14, 3.15)).toBe(false);
    });

    it("should return true for identical strings", () => {
        expect(isEqual("hello", "hello")).toBe(true);
        expect(isEqual("", "")).toBe(true);
    });

    it("should return false for different strings", () => {
        expect(isEqual("hello", "world")).toBe(false);
        expect(isEqual("", "a")).toBe(false);
    });

    it("should return true for identical booleans", () => {
        expect(isEqual(true, true)).toBe(true);
        expect(isEqual(false, false)).toBe(true);
    });

    it("should return false for different booleans", () => {
        expect(isEqual(true, false)).toBe(false);
        expect(isEqual(false, true)).toBe(false);
    });

    it("should handle NaN", () => {
        // NaN !== NaN in JavaScript (standard behavior)
        expect(isEqual(NaN, NaN)).toBe(false);
    });

    it("should handle Infinity", () => {
        expect(isEqual(Infinity, Infinity)).toBe(true);
        expect(isEqual(-Infinity, -Infinity)).toBe(true);
        expect(isEqual(Infinity, -Infinity)).toBe(false);
    });
});

describe("isEqual - null and undefined", () => {
    it("should return true when both are null", () => {
        expect(isEqual(null, null)).toBe(true);
    });

    it("should return true when both are undefined", () => {
        expect(isEqual(undefined, undefined)).toBe(true);
    });

    it("should return true when both are null or undefined", () => {
        expect(isEqual(null, undefined)).toBe(true);
        expect(isEqual(undefined, null)).toBe(true);
    });

    it("should return false when only one is null", () => {
        expect(isEqual(null, 0)).toBe(false);
        expect(isEqual(0, null)).toBe(false);
    });

    it("should return false when only one is undefined", () => {
        expect(isEqual(undefined, 0)).toBe(false);
        expect(isEqual(0, undefined)).toBe(false);
    });

    it("should return false when comparing null/undefined to objects", () => {
        expect(isEqual(null, {})).toBe(false);
        expect(isEqual(undefined, {})).toBe(false);
        expect(isEqual(null, [])).toBe(false);
        expect(isEqual(undefined, [])).toBe(false);
    });
});

describe("isEqual - type mismatches", () => {
    it("should return false for different types", () => {
        expect(isEqual(42, "42")).toBe(false);
        expect(isEqual(true, 1)).toBe(false);
        expect(isEqual("0", 0)).toBe(false);
        expect(isEqual({}, [])).toBe(false);
    });
});

describe("isEqual - arrays", () => {
    it("should return true for empty arrays", () => {
        expect(isEqual([], [])).toBe(true);
    });

    it("should return true for identical primitive arrays", () => {
        expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
        expect(isEqual(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
        expect(isEqual([true, false], [true, false])).toBe(true);
    });

    it("should return false for different primitive arrays", () => {
        expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false);
        expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
        expect(isEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    });

    it("should handle arrays with mixed types", () => {
        expect(isEqual([1, "a", true, null], [1, "a", true, null])).toBe(true);
        expect(isEqual([1, "a", true], [1, "a", false])).toBe(false);
    });

    it("should handle nested arrays", () => {
        expect(isEqual([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true);
        expect(isEqual([[1, 2], [3, 4]], [[1, 2], [3, 5]])).toBe(false);
        expect(isEqual([[[1]]], [[[1]]])).toBe(true);
        expect(isEqual([[[1]]], [[[2]]])).toBe(false);
    });

    it("should handle arrays with objects", () => {
        expect(isEqual(
            [{ id: 1 }, { id: 2 }],
            [{ id: 1 }, { id: 2 }]
        )).toBe(true);

        expect(isEqual(
            [{ id: 1 }, { id: 2 }],
            [{ id: 1 }, { id: 3 }]
        )).toBe(false);
    });

    it("should handle arrays with different lengths", () => {
        expect(isEqual([1, 2, 3], [1, 2])).toBe(false);
        expect(isEqual([], [1])).toBe(false);
    });

    it("should return false when comparing array to non-array", () => {
        expect(isEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
        expect(isEqual([], {})).toBe(false);
    });
});

describe("isEqual - objects", () => {
    it("should return true for empty objects", () => {
        expect(isEqual({}, {})).toBe(true);
    });

    it("should return true for identical flat objects", () => {
        expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
        expect(isEqual({ name: "John", age: 30 }, { name: "John", age: 30 })).toBe(true);
    });

    it("should return false for different flat objects", () => {
        expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
        expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
        expect(isEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it("should handle object key order differences", () => {
        // Object.keys() returns keys in insertion order for string keys
        // So if objects have same keys in different insertion order, they'll differ
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1, b: 2 };
        expect(isEqual(obj1, obj2)).toBe(true);

        // Different insertion order may result in different key order
        const obj3: any = {};
        obj3.b = 2;
        obj3.a = 1;
        // This will be false because Object.keys differs
        expect(isEqual(obj1, obj3)).toBe(false);
    });

    it("should handle nested objects", () => {
        expect(isEqual(
            { user: { name: "John", age: 30 } },
            { user: { name: "John", age: 30 } }
        )).toBe(true);

        expect(isEqual(
            { user: { name: "John", age: 30 } },
            { user: { name: "John", age: 31 } }
        )).toBe(false);
    });

    it("should handle deeply nested objects", () => {
        const nested1 = {
            level1: {
                level2: {
                    level3: {
                        value: "deep"
                    }
                }
            }
        };

        const nested2 = {
            level1: {
                level2: {
                    level3: {
                        value: "deep"
                    }
                }
            }
        };

        const nested3 = {
            level1: {
                level2: {
                    level3: {
                        value: "not deep"
                    }
                }
            }
        };

        expect(isEqual(nested1, nested2)).toBe(true);
        expect(isEqual(nested1, nested3)).toBe(false);
    });

    it("should handle objects with array values", () => {
        expect(isEqual(
            { items: [1, 2, 3] },
            { items: [1, 2, 3] }
        )).toBe(true);

        expect(isEqual(
            { items: [1, 2, 3] },
            { items: [1, 2, 4] }
        )).toBe(false);
    });

    it("should handle objects with null/undefined values", () => {
        expect(isEqual(
            { a: null, b: undefined },
            { a: null, b: undefined }
        )).toBe(true);

        expect(isEqual(
            { a: null },
            { a: undefined }
        )).toBe(true);
    });
});

describe("isEqual - complex nested structures", () => {
    it("should handle complex form data structures", () => {
        const formData1 = {
            name: "John",
            email: "john@example.com",
            address: {
                street: "Main St",
                city: "NYC",
                zip: "10001"
            },
            hobbies: ["reading", "gaming", "coding"],
            preferences: {
                notifications: true,
                theme: "dark",
                languages: ["en", "fr"]
            }
        };

        const formData2 = {
            name: "John",
            email: "john@example.com",
            address: {
                street: "Main St",
                city: "NYC",
                zip: "10001"
            },
            hobbies: ["reading", "gaming", "coding"],
            preferences: {
                notifications: true,
                theme: "dark",
                languages: ["en", "fr"]
            }
        };

        expect(isEqual(formData1, formData2)).toBe(true);
    });

    it("should handle arrays of objects with nested properties", () => {
        const data1 = [
            {
                id: 1,
                name: "Item 1",
                metadata: {
                    created: "2024-01-01",
                    tags: ["a", "b"]
                }
            },
            {
                id: 2,
                name: "Item 2",
                metadata: {
                    created: "2024-01-02",
                    tags: ["c", "d"]
                }
            }
        ];

        const data2 = [
            {
                id: 1,
                name: "Item 1",
                metadata: {
                    created: "2024-01-01",
                    tags: ["a", "b"]
                }
            },
            {
                id: 2,
                name: "Item 2",
                metadata: {
                    created: "2024-01-02",
                    tags: ["c", "d"]
                }
            }
        ];

        expect(isEqual(data1, data2)).toBe(true);
    });

    it("should return false for complex structures with single difference", () => {
        const data1 = {
            items: [
                { id: 1, values: [1, 2, 3] },
                { id: 2, values: [4, 5, 6] }
            ]
        };

        const data2 = {
            items: [
                { id: 1, values: [1, 2, 3] },
                { id: 2, values: [4, 5, 7] }  // Different value
            ]
        };

        expect(isEqual(data1, data2)).toBe(false);
    });
});

describe("isEqual - Date objects", () => {
    it("should return true for identical Date objects", () => {
        const date = new Date("2024-01-01");
        expect(isEqual(date, new Date("2024-01-01"))).toBe(true);
    });

    it("should return false for different Date objects", () => {
        expect(isEqual(new Date("2024-01-01"), new Date("2024-01-02"))).toBe(false);
    });

    it("should handle Date objects within nested structures", () => {
        const data1 = { date: new Date("2024-01-01"), value: 1 };
        const data2 = { date: new Date("2024-01-01"), value: 1 };
        expect(isEqual(data1, data2)).toBe(true);

        const data3 = { date: new Date("2024-01-02"), value: 1 };
        expect(isEqual(data1, data3)).toBe(false);
    });

    it("should handle Date objects in arrays", () => {
        const dates1 = [new Date("2024-01-01"), new Date("2024-01-02")];
        const dates2 = [new Date("2024-01-01"), new Date("2024-01-02")];
        expect(isEqual(dates1, dates2)).toBe(true);

        const dates3 = [new Date("2024-01-01"), new Date("2024-01-03")];
        expect(isEqual(dates1, dates3)).toBe(false);
    });
});

describe("isEqual - same reference optimization", () => {
    it("should return true for same reference", () => {
        const obj = { a: 1 };
        expect(isEqual(obj, obj)).toBe(true);

        const arr = [1, 2, 3];
        expect(isEqual(arr, arr)).toBe(true);
    });
});

describe("isEqual - circular reference handling", () => {
    it("should handle circular references gracefully", () => {
        const obj1: any = { a: 1 };
        obj1.self = obj1;

        const obj2: any = { a: 1 };
        obj2.self = obj2;

        // This should not throw and handle circular references
        expect(isEqual(obj1, obj2)).toBe(true);
    });

    it("should detect circular reference differences", () => {
        const obj1: any = { a: 1 };
        obj1.self = obj1;

        const obj2: any = { a: 1 };
        obj2.self = { a: 2 };  // Different circular content

        expect(isEqual(obj1, obj2)).toBe(false);
    });

    it("should treat a shared reference as equal when only one side reuses it", () => {
        const shared = { x: 1 };

        expect(isEqual({ p: shared, q: shared }, { p: { x: 1 }, q: { x: 1 } })).toBe(true);
    });

    it("should still compare the second occurrence when only one side reuses a reference", () => {
        const shared = { x: 1 };

        expect(isEqual({ p: shared, q: shared }, { p: { x: 1 }, q: { x: 2 } })).toBe(false);
    });

    it("should treat a shared reference in an array as equal when only one side reuses it", () => {
        const shared = { x: 1 };

        expect(isEqual([shared, shared], [{ x: 1 }, { x: 1 }])).toBe(true);
    });

    it("should detect a difference in an array when only one side reuses a reference", () => {
        const shared = { x: 1 };

        expect(isEqual([shared, shared], [{ x: 1 }, { x: 9 }])).toBe(false);
    });

    it("should treat a shared reference as equal when both sides reuse their own", () => {
        const left = { x: 1 };
        const right = { x: 1 };

        expect(isEqual({ p: left, q: left }, { p: right, q: right })).toBe(true);
    });

    it("should treat a shared reference as equal when a nested branch reuses an outer one", () => {
        const shared = { x: 1 };

        expect(isEqual(
            { p: shared, nested: { q: shared } },
            { p: { x: 1 }, nested: { q: { x: 1 } } },
        )).toBe(true);
    });

    it("should handle a self reference when empty strings are normalized", () => {
        const obj1: any = { a: "" };
        obj1.self = obj1;

        const obj2: any = { a: null };
        obj2.self = obj2;

        expect(isEqual(obj1, obj2, true)).toBe(true);
    });

    it("should treat a shared reference as equal when empty strings are normalized", () => {
        const shared = { x: 1 };

        expect(isEqual({ p: shared, q: shared }, { p: { x: 1 }, q: { x: 1 } }, true)).toBe(true);
    });

    it("should handle a self reference when empty arrays are normalized", () => {
        const obj1: any = { a: [] };
        obj1.self = obj1;

        const obj2: any = { a: null };
        obj2.self = obj2;

        expect(isEqual(obj1, obj2, true)).toBe(true);
    });

    it("should handle mutually circular references", () => {
        const obj1: any = { a: 1 };
        const obj1b: any = { b: 2 };
        obj1.ref = obj1b;
        obj1b.ref = obj1;

        const obj2: any = { a: 1 };
        const obj2b: any = { b: 2 };
        obj2.ref = obj2b;
        obj2b.ref = obj2;

        expect(isEqual(obj1, obj2)).toBe(true);
    });
});

describe("isEqual - edge cases", () => {
    it("should handle empty nested structures", () => {
        expect(isEqual({ a: {} }, { a: {} })).toBe(true);
        expect(isEqual({ a: [] }, { a: [] })).toBe(true);
        expect(isEqual([[], []], [[], []])).toBe(true);
    });

    it("should handle strings with special characters", () => {
        expect(isEqual("hello\nworld", "hello\nworld")).toBe(true);
        expect(isEqual("hello\tworld", "hello\tworld")).toBe(true);
        expect(isEqual("hello\nworld", "hello world")).toBe(false);
    });

    it("should handle very large numbers", () => {
        expect(isEqual(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toBe(true);
        expect(isEqual(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER)).toBe(true);
    });

    it("should handle objects with many properties", () => {
        const obj1: any = {};
        const obj2: any = {};

        for (let i = 0; i < 100; i++) {
            obj1[`prop${i}`] = i;
            obj2[`prop${i}`] = i;
        }

        expect(isEqual(obj1, obj2)).toBe(true);

        obj2.prop50 = 999;
        expect(isEqual(obj1, obj2)).toBe(false);
    });

    it("should handle arrays with many items", () => {
        const arr1 = Array.from({ length: 1000 }, (_, i) => i);
        const arr2 = Array.from({ length: 1000 }, (_, i) => i);
        const arr3 = Array.from({ length: 1000 }, (_, i) => i);
        arr3[500] = 999;

        expect(isEqual(arr1, arr2)).toBe(true);
        expect(isEqual(arr1, arr3)).toBe(false);
    });
});

describe("isEqual - treatNullAsDefault", () => {
    it("should treat an empty string as equal to null at the top level", () => {
        expect(isEqual("", null, true)).toBe(true);
        expect(isEqual(null, "", true)).toBe(true);
    });

    it("should treat an empty array as equal to null at the top level", () => {
        expect(isEqual([], null, true)).toBe(true);
        expect(isEqual(null, [], true)).toBe(true);
    });

    it("should treat an empty array as equal to undefined at the top level", () => {
        expect(isEqual([], undefined, true)).toBe(true);
        expect(isEqual(undefined, [], true)).toBe(true);
    });

    it("should treat an empty array as equal to null or undefined within object properties", () => {
        expect(isEqual({ a: [] }, { a: null }, true)).toBe(true);
        expect(isEqual({ a: [] }, { a: undefined }, true)).toBe(true);
        expect(isEqual({ a: null }, { a: [] }, true)).toBe(true);
        expect(isEqual({ a: undefined }, { a: [] }, true)).toBe(true);
    });

    it("should treat an empty array as equal to null or undefined within array items", () => {
        expect(isEqual([[], "b"], [null, "b"], true)).toBe(true);
        expect(isEqual([[], "b"], [undefined, "b"], true)).toBe(true);
    });

    it("should not treat an empty array as equal to null or undefined when the flag is not set", () => {
        expect(isEqual([], null)).toBe(false);
        expect(isEqual([], undefined)).toBe(false);
    });

    it("should not treat a non-empty array as equal to null", () => {
        expect(isEqual([1], null, true)).toBe(false);
    });

    it("should not normalize empty string or empty array when the flag is not set", () => {
        expect(isEqual("", null)).toBe(false);
        expect(isEqual([], null)).toBe(false);
    });

    it("should treat an empty string as equal to null within object properties", () => {
        expect(isEqual({ a: "" }, { a: null }, true)).toBe(true);
        expect(isEqual({ a: "" }, { a: undefined }, true)).toBe(true);
    });

    it("should treat an empty string as equal to null within array items", () => {
        expect(isEqual(["", "b"], [null, "b"], true)).toBe(true);
    });

    it("should still detect real differences alongside normalized values", () => {
        expect(isEqual({ a: "", b: 1 }, { a: null, b: 2 }, true)).toBe(false);
        expect(isEqual({ a: [], b: [1] }, { a: null, b: [2] }, true)).toBe(false);
    });

    it("should treat nested empty arrays as equal to null", () => {
        expect(isEqual(
            { items: [], tags: [] },
            { items: null, tags: null },
            true
        )).toBe(true);
    });
});

describe("isEqual - constructor comparison", () => {
    it("should handle objects with same structure but different constructors", () => {
        class User {
            constructor(public name: string) {}
        }

        const user1 = new User("John");
        const user2 = new User("John");
        const user3 = { name: "John" };

        expect(isEqual(user1, user2)).toBe(true);
        // Plain objects and class instances are compared by properties if constructors match
        // User instance has User constructor, plain object has Object constructor
        expect(isEqual(user1, user3)).toBe(true);  // Currently treats them equal if properties match
    });
});
