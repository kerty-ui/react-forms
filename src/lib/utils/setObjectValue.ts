import type { FieldPathPart, ObjectData } from "../types";

export const setObjectValue = <TValue,>(data: ObjectData | null | undefined, path: FieldPathPart[], value: TValue) => {

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
            childObj = parentObj[part.name] = [];
        }
        parentObj = childObj;
    }

    const lastPart = path[lastIndex];
    parentObj[lastPart.name] = value;
}
