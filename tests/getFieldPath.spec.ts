import { describe, expect, it } from "vitest";
import { getFieldPath } from "../src/lib/utils/getFieldPath";
import type { FieldPathPart } from "../src/lib/types";

const expectPath = (fieldName: string, expected: FieldPathPart[]) => {
    const result = getFieldPath(fieldName);
    expect(result).toEqual(expected);
};

describe("getFieldPath – null and undefined", () => {
    it("returns an empty path for null", () => {
        expectPath(null as any, []);
    });

    it("returns an empty path for undefined", () => {
        expectPath(undefined as any, []);
    });
});

describe("getFieldPath – empty string", () => {
    it("returns an empty path for an empty string", () => {
        expectPath("", []);
    });
});

describe("getFieldPath – simple flat properties", () => {
    it("parses a single character property name", () => {
        expectPath("a", [
            { name: "a" },
        ]);
    });

    it("parses a single property name", () => {
        expectPath("firstName", [
            { name: "firstName" },
        ]);
    });


    it("parses a property name with numbers", () => {
        expectPath("field123", [
            { name: "field123" },
        ]);
        expectPath("123field", [
            { name: "123field" },
        ]);
        expectPath("1.22.333", [
            { name: "1" },
            { name: "22" },
            { name: "333" },
        ]);
    });

    it("parses a property name with underscores", () => {
        expectPath("first_name", [
            { name: "first_name" },
        ]);
    });

    it("parses a property name with camelCase", () => {
        expectPath("firstName", [
            { name: "firstName" },
        ]);
    });
});

describe("getFieldPath – dot notation (nested objects)", () => {
    it("parses two levels with dot notation", () => {
        expectPath("profile.firstName", [
            { name: "profile" },
            { name: "firstName" },
        ]);
    });

    it("parses three levels with dot notation", () => {
        expectPath("profile.address.city", [
            { name: "profile" },
            { name: "address" },
            { name: "city" },
        ]);
    });

    it("parses deeply nested path", () => {
        expectPath("a.b.c.d.e.f", [
            { name: "a" },
            { name: "b" },
            { name: "c" },
            { name: "d" },
            { name: "e" },
            { name: "f" }
        ]);
    });

    it("parses moderately nested path", () => {
        expectPath("a.b.c", [
            { name: "a" },
            { name: "b" },
            { name: "c" },
        ]);
    });

    it("parses dot notation with trailing dot (ignores trailing dot)", () => {
        expectPath("profile.firstName.", [
            { name: "profile" },
            { name: "firstName" },
        ]);
    });

    it("parses dot notation with multiple dots in a row (ignores trailing dots)", () => {
        expectPath("profile...firstName...", [
            { name: "profile" },
            { name: "firstName" },
        ]);
    });
});

describe("getFieldPath – bracket notation (array access)", () => {
    it("parses a single array index", () => {
        expectPath("items[0]", [
            { name: "items", isArray: true },
            { name: "0", isArrayItem: true },
        ]);
    });

    it("parses an array index with multi-digit number", () => {
        expectPath("orders[42]", [
            { name: "orders", isArray: true },
            { name: "42", isArrayItem: true },
        ]);
    });

    it("parses an empty array", () => {
        expectPath("items[]", [
            { name: "items", isArray: true },
        ]);
    });
    it("parses an empty array index for nested arrays", () => {
        expectPath("items[][]", [
            { name: "items", isArray: true },
            { name: "0", isArray: true, isArrayItem: true },
        ]);
    });

    it("parses multiple nested bracket notation formats consistently", () => {
        const expected = [
            { name: 'items', isArray: true },
            { name: '0', isArrayItem: true, isArray: true },
            { name: '0', isArrayItem: true },
            { name: 'test' }
        ];
        expectPath("items[[]].test", expected);
        expectPath("items[[0]].test", expected);
        expectPath("items[][].test", expected);
        expectPath("items[0][0].test", expected);
    });

    it("parses consecutive empty or nested bracket indices", () => {
        const expected = [
            { name: 'items', isArray: true },
            { name: '0', isArrayItem: true, isArray: true },
        ];
        expectPath("items[[]]", expected);
        expectPath("items[][]", expected);
        expectPath("items[0][]", expected);
    });
});

describe("getFieldPath – mixed dot and bracket notation", () => {
    it("parses object.array[index] pattern", () => {
        expectPath("orders[0].id", [
            { name: "orders", isArray: true },
            { name: "0", isArrayItem: true },
            { name: "id" },
        ]);
    });

    it("parses object.array[index].nested.property pattern", () => {
        expectPath("orders[0].lines[2].sku", [
            { name: "orders", isArray: true },
            { name: "0", isArrayItem: true },
            { name: "lines", isArray: true },
            { name: "2", isArrayItem: true },
            { name: "sku" },
        ]);
    });

    it("parses deeply nested array and object combination", () => {
        expectPath("a[0].b", [
            { name: "a", isArray: true },
            { name: "0", isArrayItem: true },
            { name: "b" },
        ]);
    });

    it("parses array after dot notation", () => {
        expectPath("profile.tags[0]", [
            { name: "profile" },
            { name: "tags", isArray: true },
            { name: "0", isArrayItem: true },
        ]);
    });
});

describe("getFieldPath – multiple consecutive array indices", () => {
    it("parses matrix[0][1] notation", () => {
        expectPath("matrix[0][1]", [
            { name: "matrix", isArray: true },
            { name: "0", isArrayItem: true, isArray: true },
            { name: "1", isArrayItem: true },
        ]);
    });

    it("parses triple array indices matrix[0][1][2]", () => {
        expectPath("matrix[0][1][2]", [
            { name: "matrix", isArray: true },
            { name: "0", isArrayItem: true, isArray: true },
            { name: "1", isArrayItem: true, isArray: true },
            { name: "2", isArrayItem: true },
        ]);
    });

    it("parses root.a[0][1].b[2][3]", () => {
        expectPath("root.a[0][1]", [
            { name: "root" },
            { name: "a", isArray: true },
            { name: "0", isArrayItem: true, isArray: true },
            { name: "1", isArrayItem: true },
        ]);
    });
});

describe("getFieldPath – whitespace handling", () => {
    it("throws error for whitespace characters in name", () => {
        expect(() => getFieldPath(" a.b")).toThrow(
            "Invalid field path: empty spaces are not allowed"
        );
        expect(() => getFieldPath("a.b ")).toThrow(
            "Invalid field path: empty spaces are not allowed"
        );
        expect(() => getFieldPath("a .b")).toThrow(
            "Invalid field path: empty spaces are not allowed"
        );
        expect(() => getFieldPath("a. b")).toThrow(
            "Invalid field path: empty spaces are not allowed"
        );
    });
});

describe("getFieldPath – tab handling", () => {
    it("handles tab characters - they are included in names like spaces", () => {
        expectPath("a\t.\tb", [
            { name: "a\t" },
            { name: "\tb" },
        ]);
    });
});

describe("getFieldPath – error cases", () => {
    it("throws error for non-numeric array index", () => {
        expect(() => getFieldPath("items[abc]")).toThrow(
            "Invalid field path: array index must be numeric"
        );
    });

    it("throws error for non-numeric multi-character index", () => {
        expect(() => getFieldPath("orders[invalid]")).toThrow(
            "Invalid field path: array index must be numeric"
        );
    });

    it("throws error for alphabetic character in array index", () => {
        expect(() => getFieldPath("array[0a]")).toThrow(
            "Invalid field path: array index must be numeric"
        );
    });

    it("throws error for special characters in array index", () => {
        expect(() => getFieldPath("array[!]")).toThrow(
            "Invalid field path: array index must be numeric"
        );
    });

    it("throws error for mixed numeric and alphabetic in array index", () => {
        expect(() => getFieldPath("items[1a2]")).toThrow(
            "Invalid field path: array index must be numeric"
        );
    });
});

describe("getFieldPath – edge cases", () => {
    it("handles consecutive dots (treats as separate separators)", () => {
        expectPath("a..b", [
            { name: "a" },
            { name: "b" },
        ]);
    });

    it("handles dot followed by bracket", () => {
        expectPath("a.[0]", [
            { name: "a", isArray: true },
            { name: "0", isArrayItem: true },
        ]);
    });

    it("handles bracket followed by dot", () => {
        expectPath("a[0].b", [
            { name: "a", isArray: true },
            { name: "0", isArrayItem: true },
            { name: "b" },
        ]);
    });

    it("handles just a dot", () => {
        expectPath(".", []);
    });

    it("handles just brackets", () => {
        expectPath("[]", []);
    });

    it("handles just brackets with index", () => {
        expectPath("[5]", [
            { name: "5", isArrayItem: true },
        ]);
    });

    it("parses numeric property names in bracket notation", () => {
        expectPath("items[123]", [
            { name: "items", isArray: true },
            { name: "123", isArrayItem: true },
        ]);
    });

    it("parses zero as array index", () => {
        expectPath("items[0]", [
            { name: "items", isArray: true },
            { name: "0", isArrayItem: true },
        ]);
    });

    it("parses large array indices", () => {
        expectPath("items[999999]", [
            { name: "items", isArray: true },
            { name: "999999", isArrayItem: true },
        ]);
    });
});

describe("getFieldPath – complex real-world examples", () => {
    it("parses orders[0].id pattern", () => {
        expectPath("orders[0].id", [
            { name: "orders", isArray: true },
            { name: "0", isArrayItem: true },
            { name: "id" },
        ]);
    });

    it("parses nested property: user.profile.name", () => {
        expectPath("user.profile.name", [
            { name: "user" },
            { name: "profile" },
            { name: "name" },
        ]);
    });

    it("parses array of objects with property: employees[0].department", () => {
        expectPath("employees[0].department", [
            { name: "employees", isArray: true },
            { name: "0", isArrayItem: true },
            { name: "department" },
        ]);
    });


    it("parses nested arrays: data[0][1][2]", () => {
        expectPath("data[0][1][2]", [
            { name: "data", isArray: true },
            { name: "0", isArrayItem: true, isArray: true },
            { name: "1", isArrayItem: true, isArray: true },
            { name: "2", isArrayItem: true },
        ]);
    });

    it("parses simple form field: form.name", () => {
        expectPath("form.name", [
            { name: "form" },
            { name: "name" },
        ]);
    });

    it("parses form array items: form[0]", () => {
        expectPath("form[0]", [
            { name: "form", isArray: true },
            { name: "0", isArrayItem: true },
        ]);
    });

    it("parses graph traversal: graph.node", () => {
        expectPath("graph.node", [
            { name: "graph" },
            { name: "node" },
        ]);
    });

    describe("getFieldPath – property names with special characters", () => {
        it("parses property names with hyphens", () => {
            expectPath("data-key.sub-field", [
                { name: "data-key" },
                { name: "sub-field" },
            ]);
        });

        it("parses property names with numbers and letters mixed", () => {
            expectPath("field1Name2.sub3Name4", [
                { name: "field1Name2" },
                { name: "sub3Name4" },
            ]);
        });

        it("parses property names starting with underscore", () => {
            expectPath("_private._nested", [
                { name: "_private" },
                { name: "_nested" },
            ]);
        });

        it("parses property names with dollar sign", () => {
            expectPath("$state.$value", [
                { name: "$state" },
                { name: "$value" },
            ]);
        });
    });

    describe("getFieldPath – array marking behavior", () => {
        it("marks property as array when followed by bracket notation", () => {
            const result = getFieldPath("items[0]");
            expect(result[0].isArray).toBe(true);
            expect(result[0].isArrayItem).toBeUndefined();
        });

        it("marks item with isArrayItem when inside brackets", () => {
            const result = getFieldPath("items[5]");
            expect(result[1].isArrayItem).toBe(true);
            expect(result[1].isArray).toBeUndefined();
        });

        it("marks properties correctly in simple notation", () => {
            const result = getFieldPath("a.b[0].c");
            expect(result[0].isArray).toBeUndefined(); // a
            expect(result[1].isArray).toBe(true); // b
            expect(result[2].isArrayItem).toBe(true); // [0]
            expect(result[3].isArray).toBeUndefined(); // c
        });

        it("handles array properties correctly when followed by dot", () => {
            const result = getFieldPath("items[0].name");
            expect(result[0].isArray).toBe(true);
            expect(result[1].isArrayItem).toBe(true);
            expect(result[2].isArray).toBeUndefined();
        });
    });

    describe("getFieldPath – return type validation", () => {
        it("always returns an array", () => {
            const result = getFieldPath("test");
            expect(Array.isArray(result)).toBe(true);
        });

        it("returns FieldPathPart objects with correct structure", () => {
            const result = getFieldPath("a.b[0]");
            for (const part of result) {
                expect(typeof part.name).toBe("string");
                if (part.isArray != null) expect(typeof part.isArray).toBe("boolean");
                if (part.isArrayItem != null) expect(typeof part.isArrayItem).toBe("boolean");
            }
        });

        it("does not mutate input string", () => {
            const input = "profile.name";
            const originalInput = input;
            getFieldPath(input);
            expect(input).toBe(originalInput);
        });
    });
});
