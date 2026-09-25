import { bench, describe } from "vitest";
import { getObjectValue } from "../../src/lib/utils/getObjectValue";
import { getFieldPath } from "../../src/lib/utils/getFieldPath";
import type { FieldPathPart } from "../../src/lib/types";
import { createBenchmarkData, SIZES } from "./benchmarkData";

const data = createBenchmarkData();

const createCachedReader = () => {
    const cache = new Map<string, FieldPathPart[]>();
    return <TValue,>(source: any, name: string): TValue | undefined => {
        let path = cache.get(name);
        if (path === undefined) {
            path = getFieldPath(name);
            cache.set(name, path);
        }
        return getObjectValue<TValue>(source, path);
    };
};

const PATHS = {
    flat: "profile.firstName",
    scalarRoot: "profile.lastName",
    nestedArrayProp: "profile.contacts",
    arrayRoot: "orders",
    deepArrayString: "orders[0].lines[2].sku",
    deepArrayNumber: "orders[5].lines[3].qty",
    missingKey: "profile.nonExistent",
    missingIndex: "orders[999].lines[0].sku",
} as const;

const parsed = Object.fromEntries(
    Object.entries(PATHS).map(([key, value]) => [key, getFieldPath(value)]),
) as Record<keyof typeof PATHS, FieldPathPart[]>;

describe("getObjectValue – pre-parsed path, by path shape", () => {
    bench("flat property (profile.firstName)", () => {
        getObjectValue(data, parsed.flat);
    });

    bench("flat property (profile.lastName)", () => {
        getObjectValue(data, parsed.scalarRoot);
    });

    bench("nested array property (profile.contacts)", () => {
        getObjectValue(data, parsed.nestedArrayProp);
    });

    bench("root array (orders)", () => {
        getObjectValue(data, parsed.arrayRoot);
    });

    bench("deep array item – string (orders[0].lines[2].sku)", () => {
        getObjectValue(data, parsed.deepArrayString);
    });

    bench("deep array item – number (orders[5].lines[3].qty)", () => {
        getObjectValue(data, parsed.deepArrayNumber);
    });

    bench("missing key (profile.nonExistent) → undefined", () => {
        getObjectValue(data, parsed.missingKey);
    });

    bench("missing array index (orders[999].lines[0].sku) → early exit", () => {
        getObjectValue(data, parsed.missingIndex);
    });
});

describe("getObjectValue – parse strategy (deep array item)", () => {
    const cachedRead = createCachedReader();

    bench("pre-parsed path (no lookup)", () => {
        getObjectValue(data, parsed.deepArrayString);
    });

    bench("cached parse (Map lookup, like KertyForm)", () => {
        cachedRead(data, PATHS.deepArrayString);
    });

    bench("cold parse (getFieldPath on every read)", () => {
        getObjectValue(data, getFieldPath(PATHS.deepArrayString));
    });
});

describe("getObjectValue – parse strategy (flat property)", () => {
    const cachedRead = createCachedReader();

    bench("pre-parsed path (no lookup)", () => {
        getObjectValue(data, parsed.flat);
    });

    bench("cached parse (Map lookup, like KertyForm)", () => {
        cachedRead(data, PATHS.flat);
    });

    bench("cold parse (getFieldPath on every read)", () => {
        getObjectValue(data, getFieldPath(PATHS.flat));
    });
});

describe("getObjectValue – data size (orders[0].lines[1].sku)", () => {
    const small = createBenchmarkData(SIZES.small);
    const medium = createBenchmarkData(SIZES.medium);
    const large = createBenchmarkData(SIZES.large);
    const path = getFieldPath("orders[0].lines[1].sku");

    bench("small data", () => {
        getObjectValue(small, path);
    });

    bench("medium data", () => {
        getObjectValue(medium, path);
    });

    bench("large data", () => {
        getObjectValue(large, path);
    });
});

describe("getObjectValue – guards", () => {
    const emptyPath: FieldPathPart[] = [];

    bench("null data", () => {
        getObjectValue(null, parsed.flat);
    });

    bench("empty path", () => {
        getObjectValue(data, emptyPath);
    });

    bench("baseline – valid flat read", () => {
        getObjectValue(data, parsed.flat);
    });
});
