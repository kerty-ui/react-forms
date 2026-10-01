import type { FieldPathPart, ObjectData } from "../types";
import { INTERNAL_NAME_PREFIX } from "./getFieldPath";

export const removeObjectValue = (
    data: ObjectData | null | undefined, path: FieldPathPart[], useInternalName?: boolean): void => {

    if(data == null || path.length === 0) {
        return;
    }

    let parentObj: any = data;

    const lastIndex = path.length - 1;

    for (let i = 0; i < lastIndex; i++) {
        parentObj = parentObj[path[i].name];
        if(parentObj == null) {
            return;
        }
    }

    const lastPart = path[lastIndex];

    if(useInternalName) {
        // Only the internal value is removed, so the array keeps its length and the other items keep their index.
        if(lastPart.isArrayItem) {
            const itemNode = parentObj[lastPart.name];
            if(itemNode != null) {
                delete itemNode[INTERNAL_NAME_PREFIX];
            }
        }
        else {
            delete parentObj[lastPart.internalName!];
        }
        return;
    }

    if(lastPart.isArrayItem) {
        if (!Array.isArray(parentObj)) {
            return;
        }
        const index = +lastPart.name;
        if (index >= 0 && index < parentObj.length) {
            parentObj.splice(index, 1);
        }
    }
    else {
        delete parentObj[lastPart.name];
    }
}
