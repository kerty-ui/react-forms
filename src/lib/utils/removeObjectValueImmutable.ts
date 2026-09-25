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
        let childObj = parentObj[part.name];
        if(childObj == null) {
            childObj = parentObj[part.name] = part.isArray ? [] : {};
        }
        else {
            if(part.isArray) {
                if(Array.isArray(childObj)) {
                    childObj = parentObj[part.name] = [...childObj];
                }
                else {
                    childObj = parentObj[part.name] = [];
                }
            }
            else {
                if(Array.isArray(childObj)) {
                    childObj = parentObj[part.name] = [...childObj];
                }
                else {
                    childObj = parentObj[part.name] = {...childObj};
                }
            }
        }
        parentObj = childObj;
    }

    const lastPart = path[lastIndex];
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

    return rootObj;
}
