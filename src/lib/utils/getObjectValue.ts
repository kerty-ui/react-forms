import type { FieldPathPart, ObjectData } from "../types";
import { INTERNAL_NAME_PREFIX } from "./getFieldPath";

export const getObjectValue = <TValue,>(
    data: ObjectData | null | undefined, path: FieldPathPart[], useInternalName?: boolean): TValue | undefined => {
    if(data == null || path.length === 0) {
        return undefined;
    }

    let parentObj: any = data;
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
    if(!useInternalName) {
        return parentObj[lastPart.name];
    }

    // An array slot is a node holding the item's own internal value alongside its children.
    return lastPart.isArrayItem
        ? parentObj[lastPart.name]?.[INTERNAL_NAME_PREFIX]
        : parentObj[lastPart.internalName!];
}
