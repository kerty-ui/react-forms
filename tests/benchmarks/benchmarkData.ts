export type BenchModel = {
    profile: {
        firstName: string;
        lastName: string;
        contacts: Array<{
            email: string;
            phone: string;
            tags: string[];
        }>;
    };
    orders: Array<{
        id: string;
        amount: number;
        lines: Array<{
            sku: string;
            qty: number;
        }>;
    }>;
};

export type BenchmarkDataOptions = {
    contacts?: number;
    tagsPerContact?: number;
    orders?: number;
    linesPerOrder?: number;
};

/**
 * Shared size presets so every benchmark file talks about the same "small",
 * "medium" and "large" shapes. `MEDIUM` is also the default of
 * `createBenchmarkData`, so it doubles as the baseline data set.
 */
export const SIZES = {
    small:  { contacts: 2,   tagsPerContact: 2,  orders: 5,   linesPerOrder: 2 },
    medium: { contacts: 30,  tagsPerContact: 5,  orders: 120, linesPerOrder: 4 },
    large:  { contacts: 100, tagsPerContact: 10, orders: 500, linesPerOrder: 8 },
} as const satisfies Record<string, Required<BenchmarkDataOptions>>;

/**
 * Builds a deterministic form-like data set. Two calls with the same options
 * produce deeply equal but referentially distinct objects, which is what the
 * `isEqual` benchmarks rely on.
 *
 * Empty strings / zeroes are sprinkled in on purpose: they exercise the
 * `treatEmptyStringAsNull` branch of `isEqual` and the falsy-value handling of
 * `getObjectValue`.
 */
export const createBenchmarkData = (options?: BenchmarkDataOptions): BenchModel => {
    const contacts = options?.contacts ?? SIZES.medium.contacts;
    const tagsPerContact = options?.tagsPerContact ?? SIZES.medium.tagsPerContact;
    const orders = options?.orders ?? SIZES.medium.orders;
    const linesPerOrder = options?.linesPerOrder ?? SIZES.medium.linesPerOrder;

    return {
        profile: {
            firstName: "John",
            lastName: "Doe",
            contacts: Array.from({ length: contacts }, (_, i) => ({
                email: i % 4 === 0 ? "" : `john${i}@mail.com`,
                phone: i % 3 === 0 ? "" : `+100000${i}`,
                tags: Array.from({ length: tagsPerContact }, (_, j) => (j % 2 === 0 ? "" : `tag-${i}-${j}`)),
            })),
        },
        orders: Array.from({ length: orders }, (_, orderIndex) => ({
            id: orderIndex % 7 === 0 ? "" : `ORD-${orderIndex}`,
            amount: orderIndex % 11 === 0 ? 0 : orderIndex + 1,
            lines: Array.from({ length: linesPerOrder }, (_, lineIndex) => ({
                sku: lineIndex % 3 === 0 ? "" : `SKU-${orderIndex}-${lineIndex}`,
                qty: lineIndex % 4 === 0 ? 0 : lineIndex + 1,
            })),
        })),
    };
};
