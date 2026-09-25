import { bench, describe } from "vitest";
import { removeObjectValueImmutable } from "../../src/lib/utils/removeObjectValueImmutable";
import { setObjectValueImmutable } from "../../src/lib/utils/setObjectValueImmutable";
import { getFieldPath } from "../../src/lib/utils/getFieldPath";
import { type FieldPathPart } from "../../src/lib";
import { createBenchmarkData, SIZES } from "./benchmarkData";

const PATHS = {
    flat: "profile.firstName",
    nestedArrayProp: "profile.contacts",
    arrayRoot: "orders",
    deepArrayString: "orders[0].lines[2].sku",
    firstOrder: "orders[0]",
    middleOrder: "orders[60]",
    lastOrder: "orders[119]",
    outOfRangeOrder: "orders[9999]",
    missingIntermediates: "profile.address.city",
} as const;

const SEQUENCE: FieldPathPart[][] = [
    getFieldPath("profile.firstName"),
    getFieldPath("profile.lastName"),
    getFieldPath("profile.contacts[0].email"),
    getFieldPath("orders[0].id"),
    getFieldPath("orders[1].lines[0].qty"),
];

const parsed = Object.fromEntries(
    Object.entries(PATHS).map(([key, value]) => [key, getFieldPath(value)]),
) as Record<keyof typeof PATHS, FieldPathPart[]>;

describe("remove flat scalar (profile.firstName)", () => {
    const data = createBenchmarkData();

    bench("removeObjectValueImmutable", () => {
        removeObjectValueImmutable(data, parsed.flat);
    });

    bench("setObjectValueImmutable(undefined)", () => {
        setObjectValueImmutable(data, parsed.flat, undefined);
    });
});

describe("remove deep array item property (orders[0].lines[2].sku)", () => {
    const data = createBenchmarkData();

    bench("removeObjectValueImmutable", () => {
        removeObjectValueImmutable(data, parsed.deepArrayString);
    });

    bench("setObjectValueImmutable(undefined)", () => {
        setObjectValueImmutable(data, parsed.deepArrayString, undefined);
    });
});

describe("remove nested array (profile.contacts)", () => {
    const data = createBenchmarkData();

    bench("removeObjectValueImmutable", () => {
        removeObjectValueImmutable(data, parsed.nestedArrayProp);
    });

    bench("setObjectValueImmutable(undefined)", () => {
        setObjectValueImmutable(data, parsed.nestedArrayProp, undefined);
    });
});

describe("remove root array (orders)", () => {
    const data = createBenchmarkData();

    bench("removeObjectValueImmutable", () => {
        removeObjectValueImmutable(data, parsed.arrayRoot);
    });

    bench("setObjectValueImmutable(undefined)", () => {
        setObjectValueImmutable(data, parsed.arrayRoot, undefined);
    });
});

describe("remove array item by position (orders, 120 items)", () => {
    const data = createBenchmarkData();

    bench("first item (orders[0])", () => {
        removeObjectValueImmutable(data, parsed.firstOrder);
    });

    bench("middle item (orders[60])", () => {
        removeObjectValueImmutable(data, parsed.middleOrder);
    });

    bench("last item (orders[119])", () => {
        removeObjectValueImmutable(data, parsed.lastOrder);
    });

    bench("out of range (orders[9999])", () => {
        removeObjectValueImmutable(data, parsed.outOfRangeOrder);
    });
});

describe("remove through missing intermediates (profile.address.city)", () => {
    const data = createBenchmarkData();

    bench("removeObjectValueImmutable", () => {
        removeObjectValueImmutable(data, parsed.missingIntermediates);
    });

    bench("setObjectValueImmutable(undefined)", () => {
        setObjectValueImmutable(data, parsed.missingIntermediates, undefined);
    });
});

describe("data size – remove item property (orders[0].lines[1].sku)", () => {
    const path = getFieldPath("orders[0].lines[1].sku");
    const small = createBenchmarkData(SIZES.small);
    const medium = createBenchmarkData(SIZES.medium);
    const large = createBenchmarkData(SIZES.large);

    bench("small data", () => {
        removeObjectValueImmutable(small, path);
    });

    bench("medium data", () => {
        removeObjectValueImmutable(medium, path);
    });

    bench("large data", () => {
        removeObjectValueImmutable(large, path);
    });
});

describe("data size – remove first array item (orders[0])", () => {
    const small = createBenchmarkData(SIZES.small);
    const medium = createBenchmarkData(SIZES.medium);
    const large = createBenchmarkData(SIZES.large);

    bench("small data", () => {
        removeObjectValueImmutable(small, parsed.firstOrder);
    });

    bench("medium data", () => {
        removeObjectValueImmutable(medium, parsed.firstOrder);
    });

    bench("large data", () => {
        removeObjectValueImmutable(large, parsed.firstOrder);
    });
});

describe("5 sequential field removals", () => {
    const data = createBenchmarkData();

    bench("removeObjectValueImmutable", () => {
        let root = data;
        for (let i = 0; i < SEQUENCE.length; i++) {
            root = removeObjectValueImmutable(root, SEQUENCE[i]);
        }
    });

    bench("setObjectValueImmutable(undefined)", () => {
        let root = data;
        for (let i = 0; i < SEQUENCE.length; i++) {
            root = setObjectValueImmutable(root, SEQUENCE[i], undefined);
        }
    });
});
