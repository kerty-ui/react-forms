import type { FieldPathPart, ObjectData } from "../types";
import { INTERNAL_NAME_PREFIX } from "./getFieldPath";

export const setObjectValue = <TValue,>(
    data: ObjectData | null | undefined, path: FieldPathPart[], value: TValue, useInternalName?: boolean) => {

    if(data == null || path.length === 0) {
        return;
    }

    let parentObj: any = data;
    const lastIndex = path.length - 1;

    for (let i = 0; i < lastIndex; i++) {
        const part = path[i];
        let childObj = parentObj[part.name];
        if(childObj == null) {
            childObj = parentObj[part.name] = part.isArray ? [] : {};
        }
        else if(part.isArray && !Array.isArray(childObj)) {
            const arrayObj: any = [];
            // A node that already holds the item's own internal value keeps it once it becomes an array.
            if(useInternalName && childObj[INTERNAL_NAME_PREFIX] !== undefined) {
                arrayObj[INTERNAL_NAME_PREFIX] = childObj[INTERNAL_NAME_PREFIX];
            }
            childObj = parentObj[part.name] = arrayObj;
        }
        parentObj = childObj;
    }

    const lastPart = path[lastIndex];
    if(!useInternalName) {
        parentObj[lastPart.name] = value;
        return;
    }

    if(lastPart.isArrayItem) {
        let itemNode = parentObj[lastPart.name];
        if(itemNode == null) {
            itemNode = parentObj[lastPart.name] = {};
        }
        itemNode[INTERNAL_NAME_PREFIX] = value;
    }
    else {
        parentObj[lastPart.internalName!] = value;
    }
}
