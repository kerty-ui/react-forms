import { bench, describe } from "vitest";
import { isEqual } from "../../src/lib/utils/isEqual";
import { createBenchmarkData, SIZES } from "./benchmarkData";

describe("isEqual – primitives (fast paths)", () => {
    bench("same number reference", () => {
        isEqual(42, 42);
    });

    bench("same string reference", () => {
        isEqual("hello", "hello");
    });

    bench("same boolean reference", () => {
        isEqual(true, true);
    });

    bench("different numbers", () => {
        isEqual(42, 43);
    });

    bench("null/undefined comparison", () => {
        isEqual(null, undefined);
    });

    bench("NaN comparison", () => {
        isEqual(NaN, NaN);
    });

    bench("Infinity comparison", () => {
        isEqual(Infinity, Infinity);
    });
});

describe("isEqual – arrays (equal)", () => {
    const emptyArr: number[] = [];
    const emptyArr2: number[] = [];

    bench("empty arrays", () => {
        isEqual(emptyArr, emptyArr2);
    });

    const smallArr = [1, 2, 3, 4, 5];
    const smallArr2 = [1, 2, 3, 4, 5];

    bench("small primitive array (5 items)", () => {
        isEqual(smallArr, smallArr2);
    });

    const mediumArr = Array.from({ length: 100 }, (_, i) => i);
    const mediumArr2 = Array.from({ length: 100 }, (_, i) => i);

    bench("medium primitive array (100 items)", () => {
        isEqual(mediumArr, mediumArr2);
    });

    const largeArr = Array.from({ length: 1000 }, (_, i) => i);
    const largeArr2 = Array.from({ length: 1000 }, (_, i) => i);

    bench("large primitive array (1000 items)", () => {
        isEqual(largeArr, largeArr2);
    });

    const nestedArr = [[1, 2], [3, 4], [5, 6]];
    const nestedArr2 = [[1, 2], [3, 4], [5, 6]];

    bench("nested arrays (3x2)", () => {
        isEqual(nestedArr, nestedArr2);
    });

    const deepNestedArr = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]];
    const deepNestedArr2 = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]];

    bench("deeply nested arrays (2x2x2)", () => {
        isEqual(deepNestedArr, deepNestedArr2);
    });
});

describe("isEqual – arrays (not equal, early exit)", () => {
    const arr1 = [1, 2, 3, 4, 5];
    const arr2Different = [1, 2, 3, 4, 999];

    bench("different at end (length match, value mismatch)", () => {
        isEqual(arr1, arr2Different);
    });

    const arr3 = [1, 2, 3, 4];
    const arr4 = [1, 2, 3, 4, 5];

    bench("different length (early exit)", () => {
        isEqual(arr3, arr4);
    });

    const largeArr1 = Array.from({ length: 1000 }, (_, i) => i);
    const largeArr2 = Array.from({ length: 1000 }, (_, i) => (i === 999 ? 999 : i));

    bench("large array, difference at end", () => {
        isEqual(largeArr1, largeArr2);
    });

    const largeArr3 = Array.from({ length: 1000 }, (_, i) => i);
    const largeArr4 = Array.from({ length: 1000 }, (_, i) => (i === 0 ? 999 : i));

    bench("large array, difference at start", () => {
        isEqual(largeArr3, largeArr4);
    });
});

describe("isEqual – objects (equal, flat)", () => {
    const emptyObj = {};
    const emptyObj2 = {};

    bench("empty objects", () => {
        isEqual(emptyObj, emptyObj2);
    });

    const smallObj = { a: 1, b: 2, c: 3 };
    const smallObj2 = { a: 1, b: 2, c: 3 };

    bench("small flat object (3 properties)", () => {
        isEqual(smallObj, smallObj2);
    });

    const mediumObj: any = {};
    const mediumObj2: any = {};
    for (let i = 0; i < 50; i++) {
        mediumObj[`prop${i}`] = i;
        mediumObj2[`prop${i}`] = i;
    }

    bench("medium flat object (50 properties)", () => {
        isEqual(mediumObj, mediumObj2);
    });

    const largeObj: any = {};
    const largeObj2: any = {};
    for (let i = 0; i < 200; i++) {
        largeObj[`prop${i}`] = i;
        largeObj2[`prop${i}`] = i;
    }

    bench("large flat object (200 properties)", () => {
        isEqual(largeObj, largeObj2);
    });
});

describe("isEqual – objects (equal, nested)", () => {
    const nestedObj = {
        level1: {
            level2: {
                value: "deep",
            },
        },
    };
    const nestedObj2 = {
        level1: {
            level2: {
                value: "deep",
            },
        },
    };

    bench("nested object (3 levels)", () => {
        isEqual(nestedObj, nestedObj2);
    });

    const deepObj = {
        l1: { l2: { l3: { l4: { l5: { value: "very deep" } } } } },
    };
    const deepObj2 = {
        l1: { l2: { l3: { l4: { l5: { value: "very deep" } } } } },
    };

    bench("deeply nested object (5 levels)", () => {
        isEqual(deepObj, deepObj2);
    });

    const complexObj = {
        user: {
            name: "John",
            age: 30,
            email: "john@example.com",
        },
        address: {
            street: "Main St",
            city: "NYC",
            country: "USA",
        },
        preferences: {
            notifications: true,
            theme: "dark",
        },
    };
    const complexObj2 = {
        user: {
            name: "John",
            age: 30,
            email: "john@example.com",
        },
        address: {
            street: "Main St",
            city: "NYC",
            country: "USA",
        },
        preferences: {
            notifications: true,
            theme: "dark",
        },
    };

    bench("complex nested object with multiple branches", () => {
        isEqual(complexObj, complexObj2);
    });
});

describe("isEqual – objects (not equal)", () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { a: 1, b: 2, c: 999 };

    bench("objects differ in value (property mismatch)", () => {
        isEqual(obj1, obj2);
    });

    const obj3 = { a: 1, b: 2 };
    const obj4 = { a: 1, b: 2, c: 3 };

    bench("objects differ in property count", () => {
        isEqual(obj3, obj4);
    });

    const nestedObj1 = {
        level1: {
            level2: {
                value: "deep",
            },
        },
    };
    const nestedObj2 = {
        level1: {
            level2: {
                value: "different",
            },
        },
    };

    bench("nested objects differ at deep level", () => {
        isEqual(nestedObj1, nestedObj2);
    });
});

describe("isEqual – complex mixed structures (equal)", () => {
    const data1 = createBenchmarkData({ contacts: 10, tagsPerContact: 3, orders: 20, linesPerOrder: 3 });
    const data2 = createBenchmarkData({ contacts: 10, tagsPerContact: 3, orders: 20, linesPerOrder: 3 });

    bench("benchmark data structure (small)", () => {
        isEqual(data1, data2);
    });

    const dataMedium1 = createBenchmarkData(SIZES.medium);
    const dataMedium2 = createBenchmarkData(SIZES.medium);

    bench("benchmark data structure (medium)", () => {
        isEqual(dataMedium1, dataMedium2);
    });

    const dataLarge1 = createBenchmarkData({ contacts: 50, tagsPerContact: 10, orders: 200, linesPerOrder: 5 });
    const dataLarge2 = createBenchmarkData({ contacts: 50, tagsPerContact: 10, orders: 200, linesPerOrder: 5 });

    bench("benchmark data structure (large)", () => {
        isEqual(dataLarge1, dataLarge2);
    });
});

describe("isEqual – complex mixed structures (not equal, early detection)", () => {
    const data1 = createBenchmarkData({ contacts: 10, tagsPerContact: 3, orders: 20, linesPerOrder: 3 });
    const data2 = createBenchmarkData({ contacts: 10, tagsPerContact: 3, orders: 20, linesPerOrder: 3 });

    // Modify at top level
    const dataModified1: any = { ...data1, modifiedFlag: true };

    bench("structure differs at root level", () => {
        isEqual(data1, dataModified1);
    });

    // Modify at shallow level
    const dataModified2: any = { ...data2, profile: { ...data2.profile, firstName: "Jane" } };

    bench("structure differs in shallow property", () => {
        isEqual(data1, dataModified2);
    });

    // Modify deeply nested
    const dataModified3: any = JSON.parse(JSON.stringify(data1));
    if (dataModified3.orders.length > 0 && dataModified3.orders[0].lines.length > 0) {
        dataModified3.orders[0].lines[0].qty = 999;
    }

    bench("structure differs in deep nested property", () => {
        isEqual(data1, dataModified3);
    });
});

describe("isEqual – arrays of objects (equal)", () => {
    const arrayOfObjects1 = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 100,
    }));
    const arrayOfObjects2 = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 100,
    }));

    bench("array of 10 objects", () => {
        isEqual(arrayOfObjects1, arrayOfObjects2);
    });

    const arrayOfObjects3 = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        metadata: {
            created: "2024-01-01",
            tags: ["a", "b", "c"],
        },
    }));
    const arrayOfObjects4 = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        metadata: {
            created: "2024-01-01",
            tags: ["a", "b", "c"],
        },
    }));

    bench("array of 100 complex objects with nested properties", () => {
        isEqual(arrayOfObjects3, arrayOfObjects4);
    });
});

describe("isEqual – arrays of objects (not equal)", () => {
    const arrayOfObjects1 = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 100,
    }));
    const arrayOfObjects2 = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i === 50 ? 999 : i * 100,
    }));

    bench("array of 100 objects, middle item differs", () => {
        isEqual(arrayOfObjects1, arrayOfObjects2);
    });

    const arrayOfObjects3 = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 100,
    }));
    const arrayOfObjects4 = Array.from({ length: 99 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 100,
    }));

    bench("arrays of different lengths (100 vs 99)", () => {
        isEqual(arrayOfObjects3, arrayOfObjects4);
    });
});

describe("isEqual – Date objects", () => {
    const date1 = new Date("2024-01-01");
    const date2 = new Date("2024-01-01");

    bench("identical Date objects", () => {
        isEqual(date1, date2);
    });

    const date3 = new Date("2024-01-01");
    const date4 = new Date("2024-01-02");

    bench("different Date objects", () => {
        isEqual(date3, date4);
    });

    const objWithDates1 = {
        created: new Date("2024-01-01"),
        modified: new Date("2024-01-15"),
        scheduled: new Date("2024-02-01"),
    };
    const objWithDates2 = {
        created: new Date("2024-01-01"),
        modified: new Date("2024-01-15"),
        scheduled: new Date("2024-02-01"),
    };

    bench("objects with multiple Date properties", () => {
        isEqual(objWithDates1, objWithDates2);
    });

    const arrayWithDates1 = [
        new Date("2024-01-01"),
        new Date("2024-01-02"),
        new Date("2024-01-03"),
    ];
    const arrayWithDates2 = [
        new Date("2024-01-01"),
        new Date("2024-01-02"),
        new Date("2024-01-03"),
    ];

    bench("arrays of Date objects", () => {
        isEqual(arrayWithDates1, arrayWithDates2);
    });
});

describe("isEqual – same reference (optimization)", () => {
    const obj = { a: 1, b: 2, c: 3 };

    bench("same object reference", () => {
        isEqual(obj, obj);
    });

    const largeObj: any = {};
    for (let i = 0; i < 500; i++) {
        largeObj[`prop${i}`] = i;
    }

    bench("same large object reference (500 properties)", () => {
        isEqual(largeObj, largeObj);
    });

    const arr = Array.from({ length: 1000 }, (_, i) => i);

    bench("same large array reference (1000 items)", () => {
        isEqual(arr, arr);
    });
});

describe("isEqual – type mismatches (fast fails)", () => {
    bench("number vs string", () => {
        isEqual(42, "42");
    });

    bench("object vs array", () => {
        isEqual({ 0: 1, 1: 2 }, [1, 2]);
    });

    bench("null vs object", () => {
        isEqual(null, {});
    });

    bench("undefined vs false", () => {
        isEqual(undefined, false);
    });

    bench("array vs string", () => {
        isEqual([1, 2, 3], "1,2,3");
    });
});

describe("isEqual – real-world form validation scenarios", () => {
    const formData1 = {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        address: {
            street: "123 Main St",
            city: "New York",
            state: "NY",
            zip: "10001",
            country: "USA",
        },
        preferences: {
            newsletter: true,
            notifications: false,
            theme: "dark",
            languages: ["en", "fr", "es"],
        },
        items: [
            { id: 1, name: "Item 1", quantity: 5, price: 29.99 },
            { id: 2, name: "Item 2", quantity: 3, price: 49.99 },
            { id: 3, name: "Item 3", quantity: 1, price: 99.99 },
        ],
    };

    const formData2 = {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        address: {
            street: "123 Main St",
            city: "New York",
            state: "NY",
            zip: "10001",
            country: "USA",
        },
        preferences: {
            newsletter: true,
            notifications: false,
            theme: "dark",
            languages: ["en", "fr", "es"],
        },
        items: [
            { id: 1, name: "Item 1", quantity: 5, price: 29.99 },
            { id: 2, name: "Item 2", quantity: 3, price: 49.99 },
            { id: 3, name: "Item 3", quantity: 1, price: 99.99 },
        ],
    };

    bench("form validation - identical form data", () => {
        isEqual(formData1, formData2);
    });

    const formDataModified: any = JSON.parse(JSON.stringify(formData1));
    formDataModified.items[1].quantity = 5;

    bench("form validation - single item quantity changed", () => {
        isEqual(formData1, formDataModified);
    });

    const formDataPartiallyFilled = {
        name: "John",
        email: "",
        address: {
            street: "123 Main St",
            city: "",
            zip: "10001",
        },
    };

    const formDataPartiallyFilled2 = {
        name: "John",
        email: "",
        address: {
            street: "123 Main St",
            city: "",
            zip: "10001",
        },
    };

    bench("form validation - partially filled form", () => {
        isEqual(formDataPartiallyFilled, formDataPartiallyFilled2);
    });
});

describe("isEqual – circular references", () => {
    const circularObj1: any = { a: 1, b: 2 };
    circularObj1.self = circularObj1;

    const circularObj2: any = { a: 1, b: 2 };
    circularObj2.self = circularObj2;

    bench("self-referencing objects (equal)", () => {
        isEqual(circularObj1, circularObj2);
    });

    const mutualA1: any = { name: "A" };
    const mutualB1: any = { name: "B" };
    mutualA1.ref = mutualB1;
    mutualB1.ref = mutualA1;

    const mutualA2: any = { name: "A" };
    const mutualB2: any = { name: "B" };
    mutualA2.ref = mutualB2;
    mutualB2.ref = mutualA2;

    bench("mutually circular references (equal)", () => {
        isEqual(mutualA1, mutualA2);
    });
});

describe("isEqual – stress tests", () => {
    const deeplyNested = { level: 0 } as any;
    let current = deeplyNested;
    for (let i = 1; i < 50; i++) {
        current.next = { level: i };
        current = current.next;
    }

    const deeplyNested2 = { level: 0 } as any;
    let current2 = deeplyNested2;
    for (let i = 1; i < 50; i++) {
        current2.next = { level: i };
        current2 = current2.next;
    }

    bench("very deeply nested objects (50 levels)", () => {
        isEqual(deeplyNested, deeplyNested2);
    });

    const wideArray = Array.from({ length: 10000 }, (_, i) => ({ index: i, value: i * 2 }));
    const wideArray2 = Array.from({ length: 10000 }, (_, i) => ({ index: i, value: i * 2 }));

    bench("very large array (10000 items)", () => {
        isEqual(wideArray, wideArray2);
    });

    const wideObject: any = {};
    for (let i = 0; i < 1000; i++) {
        wideObject[`prop${i}`] = { nested: i, data: `value${i}` };
    }

    const wideObject2: any = {};
    for (let i = 0; i < 1000; i++) {
        wideObject2[`prop${i}`] = { nested: i, data: `value${i}` };
    }

    bench("very wide object (1000 properties)", () => {
        isEqual(wideObject, wideObject2);
    });
});

// ─── treatEmptyStringAsNull ───────────────────────────────────────────────────
// KertyForm passes this flag from `dirtyCheckEmptyStringAsNull` on every field
// change, and it selects a completely separate implementation inside isEqual.
// These groups compare the two branches on identical inputs.

describe("isEqual – treatEmptyStringAsNull vs default (primitives)", () => {
    bench("default – empty string vs null", () => {
        isEqual("", null);
    });

    bench("normalized – empty string vs null", () => {
        isEqual("", null, true);
    });

    bench("default – equal strings", () => {
        isEqual("hello", "hello");
    });

    bench("normalized – equal strings", () => {
        isEqual("hello", "hello", true);
    });
});

describe("isEqual – treatEmptyStringAsNull vs default (form data)", () => {
    // The benchmark data deliberately contains empty strings and zeroes, so the
    // normalizing branch has real work to do on every leaf.
    const data1 = createBenchmarkData(SIZES.small);
    const data2 = createBenchmarkData(SIZES.small);

    bench("default – equal structures", () => {
        isEqual(data1, data2);
    });

    bench("normalized – equal structures", () => {
        isEqual(data1, data2, true);
    });
});

describe("isEqual – treatEmptyStringAsNull (empty vs nullish leaves)", () => {
    const withEmptyStrings = {
        firstName: "",
        lastName: "Doe",
        address: { city: "", zip: "" },
        tags: ["", "a", ""],
    };
    const withNulls = {
        firstName: null,
        lastName: "Doe",
        address: { city: null, zip: null },
        tags: [null, "a", null],
    };

    bench("default – reports not equal", () => {
        isEqual(withEmptyStrings, withNulls);
    });

    bench("normalized – reports equal (walks the whole tree)", () => {
        isEqual(withEmptyStrings, withNulls, true);
    });
});
