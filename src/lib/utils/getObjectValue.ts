import type { FieldPathPart } from "../types";

export const getObjectValue = <TValue,>(data: any, path: FieldPathPart[]): TValue | undefined => {
    if(data == null || path.length === 0) {
        return undefined;
    }

    let parentObj = data;
    const lastIndex = path.length - 1;
    for (let i = 0; i < lastIndex; i++) {
        const part = path[i];
        let childObj = parentObj[part.name];
        if(childObj == null) {
            return undefined;
        }
        parentObj = childObj;
    }

    const lastPart = path[lastIndex];
    return parentObj[lastPart.name];
}
