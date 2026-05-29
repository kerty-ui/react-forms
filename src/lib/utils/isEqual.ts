export const isEqual = (valueA: any, valueB: any, treatEmptyStringAsNull?: boolean, visited?: WeakSet<any>): boolean => {
    if (treatEmptyStringAsNull) {
        return _isEqualNormalized(
            valueA === "" ? null : valueA,
            valueB === "" ? null : valueB,
            visited
        );
    }
    return _isEqual(valueA, valueB, visited);
};

const _isEqualNormalized = (a: any, b: any, visited: WeakSet<any> | undefined): boolean => {
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

    if (!visited) {
        visited = new WeakSet();
    } else if (visited.has(a) || visited.has(b)) {
        return visited.has(a) && visited.has(b);
    }
    visited.add(a);
    visited.add(b);

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            const ai = a[i] === "" ? null : a[i];
            const bi = b[i] === "" ? null : b[i];
            if (ai === bi) continue;
            if (!_isEqualNormalized(ai, bi, visited)) return false;
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
        if (!_isEqualNormalized(va, vb, visited)) {
            return false;
        }
    }

    return true;
};

const _isEqual = (a: any, b: any, visited: WeakSet<any> | undefined): boolean => {
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

    if (!visited) {
        visited = new WeakSet();
    } else if (visited.has(a) || visited.has(b)) {
        return visited.has(a) && visited.has(b);
    }
    visited.add(a);
    visited.add(b);

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
            if (!_isEqual(ai, bi, visited)) {
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
        if (!_isEqual(va, vb, visited)) {
            return false;
        }
    }

    return true;
};
