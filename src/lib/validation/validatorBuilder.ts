import {
    Validator,
    FieldValidations,
    type IValidation,
    type ValidatorOptions,
    type ValidationsSchema
} from "./validator";
import { getFieldPath } from "./../utils/getFieldPath";
import type { FieldPathPart, IValidator } from "./../types";

type NonNullableType<T> = T extends null | undefined ? never : T;

type PathForKey<Prefix extends string, V> =
    V extends (infer U)[]
        ? Prefix | `${Prefix}[]`
        | (U extends (infer W)[]
        ? `${Prefix}[][]`
        | (W extends (infer X)[]
        ? `${Prefix}[][][]`
        | (X extends object ? `${Prefix}[][][].${Path<X>}` : never)
        : W extends object ? `${Prefix}[][].${Path<W>}` : never)
        : U extends object
            ? `${Prefix}[].${Path<U>}`
            : never)
        : V extends object
            ? Prefix | `${Prefix}.${Path<V>}`
            : Prefix;

type Path<T> = T extends object
    ? {
        [K in keyof T & string]: PathForKey<K, NonNullableType<T[K]>>
    } [keyof T & string]
    : never;

type PathValue<T, P extends string> =
    P extends `${infer K}.${infer Rest}`
        ? K extends `${infer Arr}[]`
            ? Arr extends keyof T
                ? T[Arr] extends (infer U)[]
                    ? PathValue<U, Rest>
                    : never
                : PathValue<T, Arr> extends (infer U)[]
                    ? PathValue<U, Rest>
                    : never
            : K extends keyof T
                ? PathValue<T[K], Rest>
                : never
        : P extends `${infer Arr}[]`
            ? Arr extends keyof T
                ? T[Arr] extends (infer U)[]
                    ? U
                    : never
                : PathValue<T, Arr> extends (infer U)[]
                    ? U
                    : never
            : P extends keyof T
                ? T[P]
                : never;

interface IValidationBuilder<TData, TValue> {
    add: (rule: IValidation<TData, TValue>) => IValidationBuilder<TData, TValue>
}

interface IValidatorBuilder<TData> {
    validationFor<P extends Path<TData>>(name: P): IValidationBuilder<TData, PathValue<TData, P>>;
    build: () => IValidator<TData>
}

const getPropertySchema = (schema: any, part: FieldPathPart) => {
    let child = schema[part.name];
    if (child == null) {
        child = schema[part.name] = part.isArray ? [] : {};
    }
    return child;
};

const getArrayItemSchema = (schema: any[], part: FieldPathPart) => {
    const itemIsArray = part.isArray === true;

    for (let i = 0; i < schema.length; i++) {
        const entry = schema[i];
        if (entry instanceof FieldValidations) {
            continue;
        }
        if (Array.isArray(entry) === itemIsArray) {
            return entry;
        }
    }

    const child = itemIsArray ? [] : {};
    schema.push(child);
    return child;
};

export class ValidationBuilder<TData, TValue> implements IValidationBuilder<TData, TValue> {

    validations: IValidation<TData, TValue>[] = [];

    path: FieldPathPart[]

    constructor(name: string) {
        this.path = getFieldPath(name.replace(/\[.*?]/g, '[0]'));
    }

    public add (validation: IValidation<TData, TValue>) : IValidationBuilder<TData, TValue> {
        this.validations.push(validation);
        return this;
    }
}

export class ValidatorBuilder<TData> implements IValidatorBuilder<TData> {

    #validations: Map<string, ValidationBuilder<TData, any>> = new Map<string, ValidationBuilder<TData, any>>;
    #options?: ValidatorOptions;

    constructor(options?: ValidatorOptions) {
        this.#options = options;
    }

    setup(action: (builder: IValidatorBuilder<TData>) => void): IValidatorBuilder<TData> {
        action(this);
        return this;
    }

    validationFor<P extends Path<TData>>(name: P): IValidationBuilder<TData, PathValue<TData, P>>
    {
        let validation = this.#validations.get(name);
        if(validation == null) {
            validation = new ValidationBuilder<TData, PathValue<TData, P>>(name);
            this.#validations.set(name, validation);
        }
        return validation;
    }

    build () {
        const validations = {};
        for (const fieldValidationBuilder of this.#validations.values()) {
            this.#setObjectValue(
                fieldValidationBuilder.path,
                validations,
                new FieldValidations(fieldValidationBuilder.validations));
        }

        return new Validator<TData>(validations as ValidationsSchema<NoInfer<TData>>, this.#options);
    }

    #setObjectValue = <TValue,>(path: FieldPathPart[], data: any, value: TValue) => {

        if(path.length === 0) {
            return;
        }

        let current = data;
        const lastIndex = path.length - 1;

        for (let i = 0; i < lastIndex; i++) {
            current = Array.isArray(current)
                ? getArrayItemSchema(current, path[i])
                : getPropertySchema(current, path[i]);
        }

        const lastPart = path[lastIndex];

        if(Array.isArray(current)) {
            current.push(value);
        }
        else {
            current['_' + lastPart.name] = value;
        }
    }
}
