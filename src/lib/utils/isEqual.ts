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

export const isEqual = (valueA: any, valueB: any, treatEmptyStringAsNull?: boolean, compared?: ComparedPairs): boolean => {
    if (treatEmptyStringAsNull) {
        return _isEqualNormalized(
            valueA === "" ? null : valueA,
            valueB === "" ? null : valueB,
            compared
        );
    }
    return _isEqual(valueA, valueB, compared);
};

const _isEqualNormalized = (a: any, b: any, compared: ComparedPairs | undefined): boolean => {
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

    if (!compared) {
        compared = new WeakMap();
    } else if (isPairCompared(compared, a, b)) {
        return true;
    }
    markPairCompared(compared, a, b);

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            const ai = a[i] === "" ? null : a[i];
            const bi = b[i] === "" ? null : b[i];
            if (ai === bi) continue;
            if (!_isEqualNormalized(ai, bi, compared)) return false;
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
        if (key !== keysB[i]){
            return false;
        }
        const va = a[key] === "" ? null : a[key];
        const vb = b[key] === "" ? null : b[key];
        if (va === vb) {
            continue;
        }
        if (!_isEqualNormalized(va, vb, compared)) {
            return false;
        }
    }

    return true;
};

const _isEqual = (a: any, b: any, compared: ComparedPairs | undefined): boolean => {
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

    if (!compared) {
        compared = new WeakMap();
    } else if (isPairCompared(compared, a, b)) {
        return true;
    }
    markPairCompared(compared, a, b);

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
            if (!_isEqual(ai, bi, compared)) {
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
        if (!_isEqual(va, vb, compared)) {
            return false;
        }
    }

    return true;
};
