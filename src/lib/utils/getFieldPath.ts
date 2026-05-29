import type { FieldPathPart } from "../types";

const CHAR_DOT   = 46;
const CHAR_OPEN_SQUARE_BRACKET  = 91;
const CHAR_CLOSE_SQUARE_BRACKET = 93;
const CHAR_EMPTY_SPACE = 32;
const CHAR_DIGIT_0 = 48;
const CHAR_DIGIT_9 = 57;

export const getFieldPath = (fieldName: string): FieldPathPart[] => {

    const path: FieldPathPart[] = [];

    if (fieldName == null) {
        return path;
    }

    let parentProp: FieldPathPart | null = null;
    let currentPropIndex = 0;
    let currentPropIsNumeric = true;

    for (let i = 0; i < fieldName.length; i++) {
        const code = fieldName.charCodeAt(i);

        if (code === CHAR_EMPTY_SPACE) {
            throw new Error("Invalid field path: empty spaces are not allowed");
        }

        if (code === CHAR_DOT || code === CHAR_OPEN_SQUARE_BRACKET) {
            if (currentPropIndex < i) {
                parentProp = {
                    name: fieldName.slice(currentPropIndex, i),
                };
                path.push(parentProp);
                currentPropIsNumeric = true;
            }
            currentPropIndex = i + 1;
        }
        else if (code === CHAR_CLOSE_SQUARE_BRACKET) {
            if(!currentPropIsNumeric) {
                throw new Error("Invalid field path: array index must be numeric");
            }

            if (parentProp != null) {
                parentProp.isArray = true;
            }

            if(currentPropIndex === i) {
                if(i + 1 === fieldName.length) {
                    return path;
                }

                parentProp = {
                    name: "0",
                    isArrayItem: true,
                };
            }
            else {
                parentProp = {
                    name: fieldName.slice(currentPropIndex, i),
                    isArrayItem: true,
                };
            }

            path.push(parentProp);

            currentPropIndex = i + 1;
        }
        else if (currentPropIsNumeric) {
            currentPropIsNumeric = code >= CHAR_DIGIT_0 && code <= CHAR_DIGIT_9;
        }
    }

    if(currentPropIndex < fieldName.length) {
        path.push({
            name: fieldName.slice(currentPropIndex),
        });
    }

    return path;
}
