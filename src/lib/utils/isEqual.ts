type ComparedPairs = WeakMap<object, WeakSet<object>>;

const isPairCompared = (compared: ComparedPairs, a: object, b: object): boolean =>
    compared.get(a)?.has(b) === true;

const markPairCompared = (compared: ComparedPairs, a: object, b: object): void => {
    const partners = compared.get(a);
    if (partners == null) {
        compared.set(a, new WeakSet([b]));
        return;
    }
    partners.add(b);
};

const TRACKING_DEPTH = 64;

const toDefaultNormalized = (value: any): any => {
    if (value === "") {
        return null;
    }
    if (Array.isArray(value) && value.length === 0) {
        return null;
    }
    return value;
};

export const isEqual = (valueA: any, valueB: any, treatNullAsDefault?: boolean, compared?: ComparedPairs): boolean => {
    if (treatNullAsDefault) {
        return _isEqualNormalized(
            toDefaultNormalized(valueA),
            toDefaultNormalized(valueB),
            compared,
            0
        );
    }
    return _isEqual(valueA, valueB, compared, 0);
};

export const deepEqual = (valueA: unknown, valueB: unknown): boolean => _isEqual(valueA, valueB, undefined, 0);

const _isEqualNormalized = (a: any, b: any, compared: ComparedPairs | undefined, depth: number): boolean => {
    if (a === b) {
        return true;
    }
    if (a == null) {
        return b == null;
    }
    if (b == null){
        return false;
    }

    const typeA = typeof a;
    if (typeA !== typeof b) {
        return false;
    }
    if (typeA !== "object") {
        return false;
    }
    if (a instanceof Date) {
        return b instanceof Date && a.getTime() === b.getTime();
    }

    if (compared) {
        if (isPairCompared(compared, a, b)) {
            return true;
        }
        markPairCompared(compared, a, b);
    }
    else if (depth > TRACKING_DEPTH) {
        compared = new WeakMap();
        markPairCompared(compared, a, b);
    }

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            const ai = toDefaultNormalized(a[i]);
            const bi = toDefaultNormalized(b[i]);
            if (ai === bi) continue;
            if (!_isEqualNormalized(ai, bi, compared, depth + 1)) return false;
        }
        return true;
    }

    if (Array.isArray(b)) {
        return false;
    }

    const keysA = Object.keys(a);
    let missingInB = 0;

    for (let i = 0; i < keysA.length; i++) {
        const key = keysA[i];
        const valueB = b[key];
        if (valueB === undefined && !Object.hasOwn(b, key)) {
            missingInB++;
        }
        const va = toDefaultNormalized(a[key]);
        const vb = toDefaultNormalized(valueB);
        if (va === vb) {
            continue;
        }
        if (!_isEqualNormalized(va, vb, compared, depth + 1)) {
            return false;
        }
    }

    const keysB = Object.keys(b);
    if (keysA.length - missingInB === keysB.length) {
        return true;
    }

    for (let i = 0; i < keysB.length; i++) {
        const key = keysB[i];
        if (a[key] === undefined && toDefaultNormalized(b[key]) != null) {
            return false;
        }
    }

    return true;
};

const _isEqual = (a: any, b: any, compared: ComparedPairs | undefined, depth: number): boolean => {
    if (a === b) {
        return true;
    }
    if (a == null) {
        return b == null;
    }
    if (b == null) {
        return false;
    }

    const typeA = typeof a;
    if (typeA !== typeof b) {
        return false;
    }
    if (typeA !== "object") {
        return false;
    }
    if (a instanceof Date) {
        return b instanceof Date && a.getTime() === b.getTime();
    }

    if (compared) {
        if (isPairCompared(compared, a, b)) {
            return true;
        }
        markPairCompared(compared, a, b);
    }
    else if (depth > TRACKING_DEPTH) {
        compared = new WeakMap();
        markPairCompared(compared, a, b);
    }

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) {
            return false;
        }

        for (let i = 0; i < a.length; i++) {
            const ai = a[i];
            const bi = b[i];
            if (ai === bi) {
                continue;
            }
            if (!_isEqual(ai, bi, compared, depth + 1)) {
                return false;
            }
        }
        return true;
    }

    if (Array.isArray(b)) {
        return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    const len = keysA.length;
    if (len !== keysB.length) {
        return false;
    }

    for (let i = 0; i < len; i++) {
        const key = keysA[i];
        if (key !== keysB[i]) {
            return false;
        }

        const va = a[key];
        const vb = b[key];
        if (va === vb) {
            continue;
        }
        if (!_isEqual(va, vb, compared, depth + 1)) {
            return false;
        }
    }

    return true;
};
