import { describe, expect, it } from "vitest";
import { deepEqual } from "../src/lib";

describe("deepEqual", () => {
    it.each<[string, unknown, unknown]>([
        ["both are the same number", 42, 42],
        ["comparing null and undefined", null, undefined],
        ["flat objects have the same values", { a: 1, b: "x" }, { a: 1, b: "x" }],
        ["nested objects are equal by value but different references", { nested: { x: 1 } }, { nested: { x: 1 } }],
        ["nested arrays are equal by value but different references", [[1, 2], [3]], [[1, 2], [3]]],
        ["dates have the same time", new Date("2024-01-01"), new Date("2024-01-01")],
        ["nested dates have the same time but are different references", { d: new Date("2024-01-01") }, { d: new Date("2024-01-01") }],
        ["arrays of objects are equal by value", [{ id: 1, tags: ["a"] }], [{ id: 1, tags: ["a"] }]],
    ])("should return true when %s", (_, a, b) => {
        const result = deepEqual(a, b);

        expect(result).toBe(true);
    });

    it.each<[string, unknown, unknown]>([
        ["numbers differ", 1, 2],
        ["comparing an object and an array", {}, []],
        ["a nested value differs", { nested: { x: 1 } }, { nested: { x: 2 } }],
        ["a nested array item differs", [[1, 2]], [[1, 3]]],
        ["dates have different times", new Date("2024-01-01"), new Date("2024-01-02")],
        ["nested dates have different times", { d: new Date("2024-01-01") }, { d: new Date("2024-01-02") }],
        ["comparing an empty string and null", "", null],
        ["comparing an empty array and null", [], null],
    ])("should return false when %s", (_, a, b) => {
        const result = deepEqual(a, b);

        expect(result).toBe(false);
    });
});
