import type { FieldPathPart, ObjectData } from "../types";
import { INTERNAL_NAME_PREFIX } from "./getFieldPath";

// Spreading an array drops named properties, so a nested array node's internal value is copied explicitly.
const copyArray = (source: any, useInternalName: boolean | undefined): any[] => {
    const copy: any = Array.isArray(source) ? [...source] : [];
    if(useInternalName && source[INTERNAL_NAME_PREFIX] !== undefined) {
        copy[INTERNAL_NAME_PREFIX] = source[INTERNAL_NAME_PREFIX];
    }
    return copy;
};

export const setObjectValueImmutable = <TData extends ObjectData | null | undefined, TValue>(
    data: TData, path: FieldPathPart[], value: TValue, useInternalName?: boolean): TData => {

    if(data == null || path.length === 0) {
        return data;
    }

    let parentObj: any = {...data};
    let rootObj = parentObj;

    const lastIndex = path.length - 1;

    for (let i = 0; i < lastIndex; i++) {
        const part = path[i];
        let childObj = parentObj[part.name];
        if(childObj == null) {
            childObj = parentObj[part.name] = part.isArray ? [] : {};
        }
        else if(part.isArray || Array.isArray(childObj)) {
            childObj = parentObj[part.name] = copyArray(childObj, useInternalName);
        }
        else {
            childObj = parentObj[part.name] = {...childObj};
        }
        parentObj = childObj;
    }

    const lastPart = path[lastIndex];
    if(!useInternalName) {
        parentObj[lastPart.name] = value;
    }
    else if(lastPart.isArrayItem) {
        const itemNode = parentObj[lastPart.name];
        const itemCopy: any = Array.isArray(itemNode) ? copyArray(itemNode, true) : {...itemNode};
        itemCopy[INTERNAL_NAME_PREFIX] = value;
        parentObj[lastPart.name] = itemCopy;
    }
    else {
        parentObj[lastPart.internalName!] = value;
    }

    return rootObj;
}
