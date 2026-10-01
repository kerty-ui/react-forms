import { describe, expect, it } from "vitest";
import { removeObjectValue } from "../src/lib/utils/removeObjectValue";
import { getFieldPath } from "../src/lib/utils/getFieldPath";

describe("removeObjectValue", () => {
    it("should delete the property when the last part is a property", () => {
        const data: any = { person: { name: "Carol", age: 30 } };

        removeObjectValue(data, getFieldPath("person.name"));

        expect(data.person).toEqual({ age: 30 });
    });

    it("should splice the item out when the last part is an array item", () => {
        const data: any = { items: ["a", "b", "c"] };

        removeObjectValue(data, getFieldPath("items[1]"));

        expect(data.items).toEqual(["a", "c"]);
    });

    it("should leave the data unchanged when a parent of the path is missing", () => {
        const data: any = {};

        removeObjectValue(data, getFieldPath("person.name"));

        expect(data).toEqual({});
    });
});

describe("removeObjectValue - internal name", () => {
    const removeInternal = (data: any, path: string) => removeObjectValue(data, getFieldPath(path, true), true);

    it("should delete the internal name of the last part when the last part is a property", () => {
        const data: any = { person: { name: "Carol", "#name": "field" } };

        removeInternal(data, "person.name");

        expect(data.person).toEqual({ name: "Carol" });
    });

    it("should keep the other array items at their index when an array item is removed", () => {
        const data: any = { items: [{ "#": "first" }, { "#": "second" }] };

        removeInternal(data, "items[0]");

        expect(data.items).toEqual([{}, { "#": "second" }]);
    });

    it("should keep the item fields when the array item is removed", () => {
        const data: any = { items: [{ "#": "item", "#name": "field" }] };

        removeInternal(data, "items[0]");

        expect(data.items[0]).toEqual({ "#name": "field" });
    });

    it("should leave the data unchanged when a parent of the path is missing", () => {
        const data: any = {};

        removeInternal(data, "items[0].name");

        expect(data).toEqual({});
    });
});
