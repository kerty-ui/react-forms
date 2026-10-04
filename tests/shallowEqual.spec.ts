import { describe, expect, it } from "vitest";
import { shallowEqual } from "../src/lib";

class Point {
    constructor(public x: number, public y: number) { }
}

const shared = { x: 1 };

describe("shallowEqual", () => {
    it.each<[string, unknown, unknown]>([
        ["both are the same number", 42, 42],
        ["both are the same string", "a", "a"],
        ["both are NaN", NaN, NaN],
        ["both are null", null, null],
        ["both are the same object reference", shared, shared],
        ["flat objects have the same values", { a: 1, b: "x" }, { a: 1, b: "x" }],
        ["objects have the same values in a different key order", { a: 1, b: 2 }, { b: 2, a: 1 }],
        ["objects hold the same nested reference", { nested: shared }, { nested: shared }],
        ["both objects are empty", {}, {}],
        ["arrays have the same items", [1, "a", shared], [1, "a", shared]],
        ["both arrays are empty", [], []],
        ["dates have the same time", new Date("2024-01-01"), new Date("2024-01-01")],
        ["maps have the same entries", new Map([["a", 1], ["b", shared]]), new Map([["a", 1], ["b", shared]])],
        ["maps have the same entries in a different order", new Map([["a", 1], ["b", 2]]), new Map([["b", 2], ["a", 1]])],
        ["sets have the same items in the same order", new Set([1, shared]), new Set([1, shared])],
        ["class instances have the same values", new Point(1, 2), new Point(1, 2)],
    ])("should return true when %s", (_, a, b) => {
        const result = shallowEqual(a, b);

        expect(result).toBe(true);
    });

    it.each<[string, unknown, unknown]>([
        ["numbers differ", 1, 2],
        ["comparing +0 and -0", 0, -0],
        ["comparing null and undefined", null, undefined],
        ["comparing null and an object", null, {}],
        ["comparing a number and a string", 1, "1"],
        ["comparing an object and an array", {}, []],
        ["comparing a plain object and a class instance", { x: 1, y: 2 }, new Point(1, 2)],
        ["object values differ", { a: 1 }, { a: 2 }],
        ["one object has an extra key", { a: 1 }, { a: 1, b: 2 }],
        ["objects have different keys holding undefined", { a: undefined }, { b: undefined }],
        ["nested objects are equal by value but different references", { nested: { x: 1 } }, { nested: { x: 1 } }],
        ["nested dates have the same time but are different references", { d: new Date("2024-01-01") }, { d: new Date("2024-01-01") }],
        ["arrays have different lengths", [1, 2], [1, 2, 3]],
        ["arrays have the same items in a different order", [1, 2], [2, 1]],
        ["nested arrays are equal by value but different references", [[1]], [[1]]],
        ["dates have different times", new Date("2024-01-01"), new Date("2024-01-02")],
        ["map values differ", new Map([["a", 1]]), new Map([["a", 2]])],
        ["maps have different keys holding undefined", new Map([["a", undefined]]), new Map([["b", undefined]])],
        ["maps have different sizes", new Map([["a", 1]]), new Map([["a", 1], ["b", 2]])],
        ["sets have different items", new Set([1, 2]), new Set([1, 3])],
        ["sets have different sizes", new Set([1]), new Set([1, 2])],
        ["sets have the same items in a different order", new Set([1, 2]), new Set([2, 1])],
        ["comparing a map and a set", new Map(), new Set()],
    ])("should return false when %s", (_, a, b) => {
        const result = shallowEqual(a, b);

        expect(result).toBe(false);
    });
});
