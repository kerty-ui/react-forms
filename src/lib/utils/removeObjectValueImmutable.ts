import type { FieldPathPart, ObjectData } from "../types";

export const removeObjectValueImmutable = <TData extends ObjectData | null | undefined>(data: TData, path: FieldPathPart[]) => {

    if(data == null || path.length === 0) {
        return data;
    }

    let parentObj: any = {...data};
    let rootObj = parentObj;

    const lastIndex = path.length - 1;

    for (let i = 0; i < lastIndex; i++) {
        const part = path[i];
        const childObj = parentObj[part.name];
        if(childObj === null || typeof childObj !== "object") {
            return data;
        }
        parentObj = parentObj[part.name] = Array.isArray(childObj) ? [...childObj] : {...childObj};
    }

    const lastPart = path[lastIndex];
    if(lastPart.isArrayItem) {
        const index = +lastPart.name;
        if (!Array.isArray(parentObj) || index < 0 || index >= parentObj.length) {
            return data;
        }
        parentObj.splice(index, 1);
    }
    else {
        if(!(lastPart.name in parentObj)) {
            return data;
        }
        delete parentObj[lastPart.name];
    }

    return rootObj;
}
