let nextId = 0;
const ids = new WeakMap<any, number>

export const getObjectId = (obj: Object) => {
    let id = ids.get(obj);
    if(id == null) {
        id = nextId = nextId + 1;
        ids.set(obj, id);
    }
    return id;
}

export type BooleanMap = {
    [key: string]: boolean | undefined;
}

export const createClassName = (...args: Array<string | BooleanMap | null | undefined>): string => {
    return Object.values(args).reduce<Array<string>>(
        (previousValue, currentValue: any) => {
            if (currentValue != undefined ) {
                if (typeof currentValue === 'object') {
                    const keys = Object.keys(currentValue);
                    const keysCount = keys.length;
                    for (let i = 0; i < keysCount; i++) {
                        const key = keys[i];
                        if (currentValue[key] === true) {
                            previousValue.push(key);
                        }
                    }
                }
                else {
                    previousValue.push(currentValue.toString());
                }
            }
            return previousValue;
        },
        []
    ).join(" ").trim();
};
