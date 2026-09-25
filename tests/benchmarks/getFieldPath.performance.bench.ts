import { bench, describe } from "vitest";
import { getFieldPath } from "../../src/lib/utils/getFieldPath";

const FLAT = "firstName";
const SIMPLE_NESTED = "profile.firstName";
const DEEP_NESTED = "profile.address.city";
const ARRAY_NUMERIC = "orders[0]";
const ARRAY_NESTED = "orders[0].lines[2].sku";
const ARRAY_DEEP = "orders[5].lines[3].product.name";
const ARRAY_EMPTY = "items[].name";
const MULTI_ARRAY = "a[0][1][2]";
const LONG_PATH = "root.level1.level2.level3[0].level4[1].level5.leaf";
const ARRAY_NON_NUM = "items[key].value";
const WITH_SPACE = "profile.first name";

const BATCH = [
    FLAT,
    SIMPLE_NESTED,
    DEEP_NESTED,
    ARRAY_NUMERIC,
    ARRAY_NESTED,
    ARRAY_DEEP,
    ARRAY_EMPTY,
    MULTI_ARRAY,
    LONG_PATH,
];

describe("getFieldPath – path shapes", () => {
    bench("flat (firstName)", () => {
        getFieldPath(FLAT);
    });

    bench("simple nested (profile.firstName)", () => {
        getFieldPath(SIMPLE_NESTED);
    });

    bench("deep nested (profile.address.city)", () => {
        getFieldPath(DEEP_NESTED);
    });

    bench("array numeric index (orders[0])", () => {
        getFieldPath(ARRAY_NUMERIC);
    });

    bench("nested array (orders[0].lines[2].sku)", () => {
        getFieldPath(ARRAY_NESTED);
    });

    bench("deep array (orders[5].lines[3].product.name)", () => {
        getFieldPath(ARRAY_DEEP);
    });

    bench("empty brackets (items[].name)", () => {
        getFieldPath(ARRAY_EMPTY);
    });

    bench("multi-dimensional array (a[0][1][2])", () => {
        getFieldPath(MULTI_ARRAY);
    });

    bench("long path (8 segments, 2 arrays)", () => {
        getFieldPath(LONG_PATH);
    });
});

describe("getFieldPath – caching (KertyForm parses each field name once)", () => {
    bench("uncached – parse every path in the batch", () => {
        for (let i = 0; i < BATCH.length; i++) {
            getFieldPath(BATCH[i]);
        }
    });

    const cache = new Map<string, ReturnType<typeof getFieldPath>>();

    bench("cached – Map lookup per path in the batch", () => {
        for (let i = 0; i < BATCH.length; i++) {
            const name = BATCH[i];
            let path = cache.get(name);
            if (path === undefined) {
                path = getFieldPath(name);
                cache.set(name, path);
            }
        }
    });
});

describe("getFieldPath – invalid paths (throws)", () => {
    bench("non-numeric array key (items[key].value)", () => {
        try {
            getFieldPath(ARRAY_NON_NUM);
        } catch {
            /* expected */
        }
    });

    bench("whitespace in path (profile.first name)", () => {
        try {
            getFieldPath(WITH_SPACE);
        } catch {
            /* expected */
        }
    });
});
