export const shallowEqual = (valueA: unknown, valueB: unknown): boolean => {
    if (Object.is(valueA, valueB)) {
        return true;
    }
    if (typeof valueA !== "object" || valueA === null || typeof valueB !== "object" || valueB === null) {
        return false;
    }
    if (Object.getPrototypeOf(valueA) !== Object.getPrototypeOf(valueB)) {
        return false;
    }

    // Dates have no own entries, so without this any two dates would compare as equal.
    if (valueA instanceof Date) {
        return valueA.getTime() === (valueB as Date).getTime();
    }

    if (Array.isArray(valueA)) {
        const arrayB = valueB as unknown[];
        if (valueA.length !== arrayB.length) {
            return false;
        }
        for (let i = 0; i < valueA.length; i++) {
            if (!Object.is(valueA[i], arrayB[i])) {
                return false;
            }
        }
        return true;
    }

    if (valueA instanceof Map) {
        const mapB = valueB as Map<unknown, unknown>;
        if (valueA.size !== mapB.size) {
            return false;
        }
        for (const [key, value] of valueA) {
            if (!mapB.has(key) || !Object.is(value, mapB.get(key))) {
                return false;
            }
        }
        return true;
    }

    if (Symbol.iterator in valueA) {
        const iteratorB = (valueB as Iterable<unknown>)[Symbol.iterator]();
        for (const itemA of valueA as Iterable<unknown>) {
            const nextB = iteratorB.next();
            if (nextB.done || !Object.is(itemA, nextB.value)) {
                return false;
            }
        }
        return iteratorB.next().done === true;
    }

    const objectA = valueA as Record<string, unknown>;
    const objectB = valueB as Record<string, unknown>;
    const keysA = Object.keys(objectA);
    if (keysA.length !== Object.keys(objectB).length) {
        return false;
    }
    for (let i = 0; i < keysA.length; i++) {
        const key = keysA[i];
        if (!Object.hasOwn(objectB, key) || !Object.is(objectA[key], objectB[key])) {
            return false;
        }
    }
    return true;
};
