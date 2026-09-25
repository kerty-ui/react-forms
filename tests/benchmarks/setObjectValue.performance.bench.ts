import { bench, describe } from "vitest";
import { setObjectValue } from "../../src/lib/utils/setObjectValue";
import { setObjectValueImmutable } from "../../src/lib/utils/setObjectValueImmutable";
import { getObjectValue } from "../../src/lib/utils/getObjectValue";
import { getFieldPath } from "../../src/lib/utils/getFieldPath";
import { isEqual } from "../../src/lib/utils/isEqual";
import { type FieldPathPart } from "../../src/lib";
import { createBenchmarkData, SIZES } from "./benchmarkData";

const PATHS = {
    flat: "profile.firstName",
    nestedArrayProp: "profile.contacts",
    arrayRoot: "orders",
    deepArrayString: "orders[0].lines[2].sku",
    deepArrayNumber: "orders[5].lines[3].qty",
    missingIntermediates: "profile.address.city",
} as const;

const parsed = Object.fromEntries(
    Object.entries(PATHS).map(([key, value]) => [key, getFieldPath(value)]),
) as Record<keyof typeof PATHS, FieldPathPart[]>;

describe("set flat scalar (profile.firstName)", () => {
    const mutableData = createBenchmarkData();
    const immutableData = createBenchmarkData();

    bench("setObjectValue (mutable)", () => {
        setObjectValue(mutableData, parsed.flat, "Steve");
    });

    bench("setObjectValueImmutable", () => {
        setObjectValueImmutable(immutableData, parsed.flat, "Steve");
    });
});

describe("set deep array item – string (orders[0].lines[2].sku)", () => {
    const mutableData = createBenchmarkData();
    const immutableData = createBenchmarkData();

    bench("setObjectValue (mutable)", () => {
        setObjectValue(mutableData, parsed.deepArrayString, "NEW-SKU-001");
    });

    bench("setObjectValueImmutable", () => {
        setObjectValueImmutable(immutableData, parsed.deepArrayString, "NEW-SKU-001");
    });
});

describe("set deep array item – number (orders[5].lines[3].qty)", () => {
    const mutableData = createBenchmarkData();
    const immutableData = createBenchmarkData();

    bench("setObjectValue (mutable)", () => {
        setObjectValue(mutableData, parsed.deepArrayNumber, 999);
    });

    bench("setObjectValueImmutable", () => {
        setObjectValueImmutable(immutableData, parsed.deepArrayNumber, 999);
    });
});

describe("replace nested array (profile.contacts)", () => {
    const mutableData = createBenchmarkData();
    const immutableData = createBenchmarkData();
    const replacement = createBenchmarkData().profile.contacts;

    bench("setObjectValue (mutable)", () => {
        setObjectValue(mutableData, parsed.nestedArrayProp, replacement);
    });

    bench("setObjectValueImmutable", () => {
        setObjectValueImmutable(immutableData, parsed.nestedArrayProp, replacement);
    });
});

describe("replace root array (orders)", () => {
    const mutableData = createBenchmarkData();
    const immutableData = createBenchmarkData();
    const replacement = createBenchmarkData().orders;

    bench("setObjectValue (mutable)", () => {
        setObjectValue(mutableData, parsed.arrayRoot, replacement);
    });

    bench("setObjectValueImmutable", () => {
        setObjectValueImmutable(immutableData, parsed.arrayRoot, replacement);
    });
});

describe("create missing intermediates (profile.address.city on empty object)", () => {
    bench("setObjectValue (mutable)", () => {
        const target: any = {};
        setObjectValue(target, parsed.missingIntermediates, "London");
    });

    bench("setObjectValueImmutable", () => {
        const target: any = {};
        setObjectValueImmutable(target, parsed.missingIntermediates, "London");
    });
});

describe("data size – mutable set (orders[0].lines[1].sku)", () => {
    const path = getFieldPath("orders[0].lines[1].sku");
    const small = createBenchmarkData(SIZES.small);
    const medium = createBenchmarkData(SIZES.medium);
    const large = createBenchmarkData(SIZES.large);

    bench("small data", () => {
        setObjectValue(small, path, "NEW-SKU");
    });

    bench("medium data", () => {
        setObjectValue(medium, path, "NEW-SKU");
    });

    bench("large data", () => {
        setObjectValue(large, path, "NEW-SKU");
    });
});

describe("data size – immutable set (orders[0].lines[1].sku)", () => {
    const path = getFieldPath("orders[0].lines[1].sku");
    const small = createBenchmarkData(SIZES.small);
    const medium = createBenchmarkData(SIZES.medium);
    const large = createBenchmarkData(SIZES.large);

    bench("small data", () => {
        setObjectValueImmutable(small, path, "NEW-SKU");
    });

    bench("medium data", () => {
        setObjectValueImmutable(medium, path, "NEW-SKU");
    });

    bench("large data", () => {
        setObjectValueImmutable(large, path, "NEW-SKU");
    });
});

const SEQUENCE: Array<{ path: FieldPathPart[]; value: unknown }> = [
    { path: getFieldPath("profile.firstName"), value: "Steve" },
    { path: getFieldPath("profile.lastName"), value: "Kerr" },
    { path: getFieldPath("profile.contacts[0].email"), value: "steve@example.com" },
    { path: getFieldPath("orders[0].id"), value: "ORD-X" },
    { path: getFieldPath("orders[1].lines[0].qty"), value: 5 },
];

describe("5 sequential field updates", () => {
    const mutableData = createBenchmarkData();
    const immutableData = createBenchmarkData();

    bench("setObjectValue (mutable)", () => {
        for (let i = 0; i < SEQUENCE.length; i++) {
            setObjectValue(mutableData, SEQUENCE[i].path, SEQUENCE[i].value);
        }
    });

    bench("setObjectValueImmutable", () => {
        let root = immutableData;
        for (let i = 0; i < SEQUENCE.length; i++) {
            root = setObjectValueImmutable(root, SEQUENCE[i].path, SEQUENCE[i].value);
        }
    });
});

describe("10 redundant writes of the same value (orders[0].lines[2].sku)", () => {
    const immutableData = createBenchmarkData();
    const currentValue = getObjectValue<string>(immutableData, parsed.deepArrayString);

    bench("unguarded immutable set", () => {
        let root = immutableData;
        for (let i = 0; i < 10; i++) {
            root = setObjectValueImmutable(root, parsed.deepArrayString, currentValue);
        }
    });

    bench("guarded by isEqual (skips the clone)", () => {
        let root = immutableData;
        for (let i = 0; i < 10; i++) {
            const existing = getObjectValue<string>(root, parsed.deepArrayString);
            if (isEqual(existing, currentValue)) {
                continue;
            }
            root = setObjectValueImmutable(root, parsed.deepArrayString, currentValue);
        }
    });
});

describe("10 writes of a changing value (orders[0].lines[2].sku)", () => {
    const immutableData = createBenchmarkData();
    const values = Array.from({ length: 10 }, (_, i) => "SKU-" + i);

    bench("unguarded immutable set", () => {
        let root = immutableData;
        for (let i = 0; i < 10; i++) {
            root = setObjectValueImmutable(root, parsed.deepArrayString, values[i]);
        }
    });

    bench("guarded by isEqual (guard never hits)", () => {
        let root = immutableData;
        for (let i = 0; i < 10; i++) {
            const existing = getObjectValue<string>(root, parsed.deepArrayString);
            if (isEqual(existing, values[i])) {
                continue;
            }
            root = setObjectValueImmutable(root, parsed.deepArrayString, values[i]);
        }
    });
});
