import { describe, expect, it } from "vitest";
import { getObjectValue as getObjectValueInternal } from "../src/lib/utils/getObjectValue";
import { getFieldPath } from "../src/lib/utils/getFieldPath";

const getObjectValue = (data: any, name: string) => {
    return getObjectValueInternal(data, getFieldPath(name));
}

// ─── shared test fixture ──────────────────────────────────────────────────────

const data = {
    name: "Alice",
    age: 30,
    active: true,
    score: 0,        // falsy number
    empty: "",       // falsy string
    flag: false,     // falsy boolean
    nullProp: null,
    address: {
        city: "London",
        zip: "EC1A",
        geo: {
            lat: 51.5,
            lng: -0.1,
        },
    },
    tags: ["ts", "js", "node"],
    orders: [
        {
            id: "ord-1",
            lines: [
                { sku: "A1", qty: 2 },
                { sku: "B2", qty: 5 },
            ],
        },
        {
            id: "ord-2",
            lines: [
                { sku: "C3", qty: 1 },
            ],
        },
    ],
    matrix: [[10, 20], [30, 40]],
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const get = <T = unknown>(path: string, obj: any = data) =>
    getObjectValue(obj, path) as T | undefined;

// ─── empty path ───────────────────────────────────────────────────────────────

describe("getObjectValue – empty path", () => {
    it("returns undefined for an empty FieldPath array", () => {
        expect(getObjectValue(data, "")).toBeUndefined();
    });
});

// ─── flat properties ──────────────────────────────────────────────────────────

describe("getObjectValue – flat properties", () => {
    it("reads a string property from the root", () => {
        expect(get<string>("name")).toBe("Alice");
    });

    it("reads a number property from the root", () => {
        expect(get<number>("age")).toBe(30);
    });

    it("reads a boolean property from the root", () => {
        expect(get<boolean>("active")).toBe(true);
    });

    it("returns undefined for a key that does not exist on the root", () => {
        expect(get("nonExistent")).toBeUndefined();
    });
});

// ─── falsy leaf values ────────────────────────────────────────────────────────

describe("getObjectValue – falsy leaf values", () => {
    it("returns 0 (not undefined)", () => {
        expect(get<number>("score")).toBe(0);
    });

    it("returns empty string (not undefined)", () => {
        expect(get<string>("empty")).toBe("");
    });

    it("returns false (not undefined)", () => {
        expect(get<boolean>("flag")).toBe(false);
    });

    it("returns null when the property holds null", () => {
        expect(get("nullProp")).toBeNull();
    });
});

// ─── nested objects ───────────────────────────────────────────────────────────

describe("getObjectValue – nested objects", () => {
    it("reads a property one level deep", () => {
        expect(get<string>("address.city")).toBe("London");
    });

    it("reads a property two levels deep", () => {
        expect(get<number>("address.geo.lat")).toBe(51.5);
    });

    it("reads a negative number two levels deep", () => {
        expect(get<number>("address.geo.lng")).toBe(-0.1);
    });
});

// ─── root array ───────────────────────────────────────────────────────────────

describe("getObjectValue – root array", () => {
    it("returns the entire array when the path resolves to an array", () => {
        expect(get("tags")).toEqual(["ts", "js", "node"]);
    });

    it("returns the entire orders array", () => {
        const result = get<typeof data.orders>("orders");
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
    });
});

// ─── array items ─────────────────────────────────────────────────────────────

describe("getObjectValue – array item access", () => {
    it("reads the first element of a primitive array", () => {
        expect(get<string>("tags[0]")).toBe("ts");
    });

    it("reads a middle element of a primitive array", () => {
        expect(get<string>("tags[1]")).toBe("js");
    });

    it("reads the last element of a primitive array", () => {
        expect(get<string>("tags[2]")).toBe("node");
    });

    it("reads an object element from an array by index", () => {
        expect(get("orders[0]")).toMatchObject({ id: "ord-1" });
    });

    it("reads a property of an array element (orders[0].id)", () => {
        expect(get<string>("orders[0].id")).toBe("ord-1");
    });

    it("reads a property of a second array element (orders[1].id)", () => {
        expect(get<string>("orders[1].id")).toBe("ord-2");
    });
});

// ─── deeply nested array paths ────────────────────────────────────────────────

describe("getObjectValue – deeply nested array paths", () => {
    it("reads orders[0].lines[0].sku", () => {
        expect(get<string>("orders[0].lines[0].sku")).toBe("A1");
    });

    it("reads orders[].lines[1].sku", () => {
        expect(get<string>("orders[].lines[1].sku")).toBe("B2");
    });

    it("reads orders[0].lines[0].qty", () => {
        expect(get<number>("orders[0].lines[0].qty")).toBe(2);
    });

    it("reads orders[1].lines[0].sku", () => {
        expect(get<string>("orders[1].lines[0].sku")).toBe("C3");
    });
});

// ─── multi-dimensional arrays ─────────────────────────────────────────────────

describe("getObjectValue – multi-dimensional arrays", () => {
    it("reads matrix[0][0]", () => {
        expect(get<number>("matrix[0][0]")).toBe(10);
    });

    it("reads matrix[0][1]", () => {
        expect(get<number>("matrix[0][1]")).toBe(20);
    });

    it("reads matrix[1][0]", () => {
        expect(get<number>("matrix[1][0]")).toBe(30);
    });

    it("reads matrix[1][1]", () => {
        expect(get<number>("matrix[1][1]")).toBe(40);
    });
});

// ─── missing / null intermediate nodes ───────────────────────────────────────

describe("getObjectValue – missing / null intermediates → undefined", () => {
    it("returns undefined when a nested key does not exist", () => {
        expect(get("address.nonExistent")).toBeUndefined();
    });

    it("returns undefined when the first intermediate key is missing", () => {
        expect(get("missing.city")).toBeUndefined();
    });

    it("returns undefined when a deep intermediate key is missing", () => {
        expect(get("address.geo.missing.deep")).toBeUndefined();
    });

    it("returns undefined for an out-of-range array index (intermediate)", () => {
        expect(get("orders[999].lines[0].sku")).toBeUndefined();
    });

    it("returns undefined for an out-of-range array index (leaf)", () => {
        expect(get("tags[99]")).toBeUndefined();
    });

    it("returns undefined when a null property is traversed as intermediate", () => {
        const obj = { a: { b: null as any } };
        expect(getObjectValue(obj, "a.b.c")).toBeUndefined();
    });
});

// ─── data edge cases ─────────────────────────────────────────────────────────

describe("getObjectValue – data edge cases", () => {
    it("returns undefined when data is null", () => {
        // null data: first parentObj[part.name] access on null returns undefined in JS
        // (no throw because path length 1 skips the loop and goes straight to leaf read)
        expect(getObjectValue(null, "name")).toBeUndefined();
    });

    it("reads a value from a plain array passed as data", () => {
        const arr = ["x", "y", "z"];
        expect(getObjectValue(arr, "[1]")).toBe("y");
    });
});
