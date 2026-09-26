export const Severity = {
    None: 0,
    Success: 1,
    Info: 2,
    Warning: 4,
    Error: 8,
} as const;

export type MessageSeverity = (typeof Severity)[keyof typeof Severity];

export type ValidationMessage = {
    text: string;
    severity?: MessageSeverity;
}

export interface IValidationResult {
    readonly has: (severity: MessageSeverity) => boolean;
    readonly messages: readonly ValidationMessage[];
}

export type ValidatorMode =
    /**
     * Message-driven validation.
     *
     * Before validation, the form clears all existing validation messages.
     * The validator only needs to return fields that currently have a
     * validation message. Fields that are not returned remain message-free.
     */
    | "messageDriven"

    /**
     * Field-driven validation.
     *
     * When validating a changed field, the validator must return every field
     * whose validation state may have been affected, including fields that are
     * currently valid.
     *
     * A returned field without a message clears its previous validation
     * message. A field that is not returned is not modified by the form.
     */
    | "fieldDriven";

export type ApplyValidationResultMode =
    /**
     * - `patch`
     *   Applies the validation result as a partial update. Only fields included
     *   in the result are changed; messages for all other fields remain unchanged.
     */
    | "patch"
    /**
     * - `merge`
     *   Keeps all existing validation messages and adds the messages provided
     *   by the current validation result. Existing messages are preserved.
     */
    | "merge"
    /**
     * - `replace`
     *   Removes all existing validation messages and then adds
     *   the messages provided by the current validation result.
     */
    | "replace";

export interface IValidator<TData> {
    mode: ValidatorMode;
    validate: (ctx: ValidatorContext<TData>) => Map<string, IValidationResult>;
}

export type ValidatorContext<TData> = {
    data: TData;
    fieldName?: string | null;
    ruleSet?: string | null;
}

export type ValidationContext<TData, TValue> = {
    fieldName: string;
    data: TData;
    parent: any | undefined;
    value: TValue | undefined;
}

export type ApplyValidationOptions = {
    mode?: ApplyValidationResultMode;
    /**
     * Controls how validation results for fields that are not registered in the
     * form are handled.
     *
     * - `ignore`
     *   Ignores validation results for unregistered fields. The fields are not
     *   added to the form and their messages are not applied.
     *
     * - `add`
     *   Adds unregistered fields to the form and applies their validation
     *   results. Use this only when the form can safely represent and update
     *   those fields, because an unregistered field may produce a validation
     *   error that the user cannot fix through the form UI.
     */
    unknownFieldBehavior?: "ignore" | "add";
}

type IsAny<T> = 0 extends (1 & T) ? true : false;

type FieldPathImpl<T, D extends number[] = []> =
    IsAny<T> extends true
        ? string
        : D['length'] extends 5
            ? never
            : T extends object
                ? {
                    [K in keyof T & string]:
                    NonNullable<T[K]> extends Array<infer U>
                        ? K
                        | `${K}[${number}]`
                        | (NonNullable<U> extends Array<infer V>
                        ? `${K}[${number}][${number}]`
                        | (NonNullable<V> extends object
                        ? `${K}[${number}][${number}].${FieldPathImpl<NonNullable<V>, [0, 0, ...D]>}`
                        : never)
                        : NonNullable<U> extends object
                            ? `${K}[${number}].${FieldPathImpl<NonNullable<U>, [0, ...D]>}`
                            : never)
                        : NonNullable<T[K]> extends object
                            ? K | `${K}.${FieldPathImpl<NonNullable<T[K]>, [0, ...D]>}`
                            : K
                }[keyof T & string]
                : never;

type FieldPathValueImpl<T, P extends string> =
    P extends `${infer K}.${infer Rest}`
        ? K extends keyof T
            ? FieldPathValueImpl<NonNullable<T[K]>, Rest>
            : K extends `${infer K2}[${infer _1}][${infer _2}]`
                ? K2 extends keyof T
                    ? NonNullable<T[K2]> extends Array<infer U>
                        ? NonNullable<U> extends Array<infer V>
                            ? FieldPathValueImpl<NonNullable<V>, Rest>
                            : never
                        : never
                    : never
                : K extends `${infer K2}[${infer _1}]`
                    ? K2 extends keyof T
                        ? NonNullable<T[K2]> extends Array<infer U>
                            ? FieldPathValueImpl<NonNullable<U>, Rest>
                            : never
                        : never
                    : never
        : P extends `${infer K}[${infer _1}][${infer _2}]`
            ? K extends keyof T
                ? NonNullable<T[K]> extends Array<infer U>
                    ? NonNullable<U> extends Array<infer V>
                        ? V
                        : never
                    : never
                : never
            : P extends `${infer K}[${infer _1}]`
                ? K extends keyof T
                    ? NonNullable<T[K]> extends Array<infer U>
                        ? U
                        : never
                    : never
                : P extends keyof T
                    ? T[P]
                    : never;

type ArrayFieldPathImpl<T, D extends number[] = []> =
    IsAny<T> extends true
        ? string
        : D['length'] extends 5
            ? never
            : T extends object
                ? {
                    [K in keyof T & string]:
                    NonNullable<T[K]> extends Array<infer U>
                        ? K
                        | (NonNullable<U> extends Array<any>
                        ? `${K}[${number}]`
                        : NonNullable<U> extends object
                            ? `${K}[${number}].${ArrayFieldPathImpl<NonNullable<U>, [0, ...D]>}`
                            : never)
                        : NonNullable<T[K]> extends object
                            ? `${K}.${ArrayFieldPathImpl<NonNullable<T[K]>, [0, ...D]>}`
                            : never
                }[keyof T & string]
                : never;

export type FieldPath<T> = IsAny<T> extends true ? string : FieldPathImpl<T>;

export type FieldPathValue<T, P extends string> = IsAny<T> extends true ? any : FieldPathValueImpl<T, P>;

export type ArrayFieldPath<T> = IsAny<T> extends true ? string : ArrayFieldPathImpl<T>;

export type ArrayItemType<T, P extends string> =
    IsAny<T> extends true
        ? any
        : NonNullable<FieldPathValue<T, P>> extends Array<infer U>
            ? U
            : never;

export type FieldPathByValue<T, TValue> =
    IsAny<T> extends true
        ? string
        : FieldPath<T> extends infer P
            ? P extends string
                ? NonNullable<FieldPathValue<T, P>> extends TValue
                    ? P
                    : never
                : never
            : never;

export type FormValidateResult = {
    isValid: boolean;
    invalidFields: Set<string>;
}

export type ObjectData = object & { [Symbol.iterator]?: never };

export type FieldPathPart = {
    name: string;
    isArray?: boolean;
    isArrayItem?: boolean;
}

export type FieldState = {
    isTouched: boolean;
    isDirty: boolean;
    isValid: boolean;
    isValidated: boolean;
}

export type FieldInfo = {
    path: FieldPathPart[];
    state: FieldState;
    listenerCount: number;
    validationResult?: IValidationResult;
}

export type FieldSnapshot<TValue> = FieldState & {
    value: TValue | null | undefined;
    validationResult: IValidationResult | undefined;
}

export type FormState = {
    isValid: boolean;
    isDirty: boolean;
    isTouched: boolean;
    isValidated: boolean;
}

export type FormSnapshot<TData> = {
    data: TData;
    state: FormState;
    validationResult?: IValidationResult;
}

export type FormConfig = {
    dirtyCheckEnabled?: boolean;
    dirtyCheckNullAsDefault?: boolean;
    trackTouchOnValueChange?: boolean;
    clearFormValidationResultsOnChange?: boolean;
}

export type FormOptions<TData> = FormConfig & {
    data?: TData;
    validator?: IValidator<TData> | (() => IValidator<TData>);
}

export type FormListenerOptions = {
    listenDataChange: boolean;
    listenStateChange: boolean;
    listenValidationChange: boolean;
    fieldName?: string;
}

export type FormListener = FormListenerOptions & {
    notify: () => void;
}

interface IFormValidation<TData> {

    setValidator(validator: IValidator<TData>): void;

    validate(ruleSet?: string | null): FormValidateResult;

    applyValidationResult(result: IValidationResult, options?: ApplyValidationOptions): void;

    applyFieldValidationResult<TPath extends FieldPath<TData>>(
        name: TPath,
        result: IValidationResult,
        options?: ApplyValidationOptions
    ): void;

    applyValidationResults(validationResults: Map<string, IValidationResult>, options?: ApplyValidationOptions): void;

    resetValidationResults(): void;

    resetFieldValidationResults<TPath extends FieldPath<TData>>(name: TPath | TPath[]): void;

    getValidationResult(): IValidationResult | undefined;

    getValidationMessage(): ValidationMessage | undefined;
    
    getFieldValidationResult<TPath extends FieldPath<TData>>(name: TPath): IValidationResult | undefined;
    
    getFieldValidationMessage<TPath extends FieldPath<TData>>(name: TPath): ValidationMessage | undefined;
    

}

interface IFormArrayActions<TData> {

    prependItems<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean
    ): void;
    
    appendItems<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean
    ): void;
    
    insertItems<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        index: number,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean
    ): void;
    
    removeItems<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        index: number | number[],
        silent?: boolean
    ): void;
    
    swapItem<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        fromIndex: number,
        toIndex: number,
        silent?: boolean
    ): void;

    moveItem<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        fromIndex: number,
        toIndex: number,
        silent?: boolean
    ): void;
    
    updateItem<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        index: number,
        value: ArrayItemType<TData, TPath>,
        silent?: boolean
    ): void;
}

export interface IKertyForm<TData> extends IFormValidation<TData>, IFormArrayActions<TData> {
    updateConfiguration(config: FormConfig): void;
    addListener(listener: () => void, options?: Omit<FormListenerOptions, 'fieldName'> ): () => void;
    addFieldListener<TPath extends FieldPath<TData>>(name: TPath, listener: () => void): () => void;
    getData(): TData;
    getState(): FormState;
    getSnapshot(): () => FormSnapshot<TData>;
    getDataSnapshot<TValue>(getValue: (data: TData) => TValue): () => TValue;
    getStateSnapshot<TValue>(getValue: (state: FormState) => TValue): () => TValue;
    getFieldSnapshot<TPath extends FieldPath<TData>>(name: TPath): () => FieldSnapshot<FieldPathValue<TData, TPath>>;
    getFieldValue<TPath extends FieldPath<TData>>(name: TPath): FieldPathValue<TData, TPath> | undefined;
    getFieldState<TPath extends FieldPath<TData>>(name: TPath): FieldState;
    setFieldValue<TValue>(name: FieldPathByValue<TData, TValue>, value: TValue | null | undefined, silent?: boolean): void;
    setFieldValue<TPath extends FieldPath<TData>>(name: TPath, value: FieldPathValue<TData, TPath> | null | undefined, silent?: boolean): void;
    clearFieldValue<TPath extends FieldPath<TData>>(name: TPath | TPath[], silent?: boolean): void;
    removeFieldValue<TPath extends FieldPath<TData>>(name: TPath | TPath[], silent?: boolean): void;
    touch(name?: FieldPath<TData>): void;
    reset(data?: TData): void;
}
