import type { FieldPathPart } from "../types";

export const setObjectValueImmutable = <TValue,>(data: any, path: FieldPathPart[], value: TValue) => {

    if(data == null || path.length === 0) {
        return data;
    }

    let parentObj = {...data};
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
    parentObj[lastPart.name] = value;

    return rootObj;
}
