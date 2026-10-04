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
     *   The result is treated as complete: every field is marked validated,
     *   so fields without messages count as validated and valid.
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

type LeafObject = Date | RegExp | Function | Map<any, any> | Set<any> | WeakMap<any, any> | WeakSet<any> | Promise<any>;

type FieldPathImpl<T, TValue, D extends number[]> =
    D['length'] extends 5
        ? never
        : T extends LeafObject | readonly any[]
            ? never
            : T extends object
                ? {
                    [K in keyof T & string]:
                    | (NonNullable<T[K]> extends TValue ? K : never)
                    | FieldSubPathImpl<K, NonNullable<T[K]>, TValue, [0, ...D]>
                }[keyof T & string]
                : never;

type FieldSubPathImpl<P extends string, V, TValue, D extends number[]> =
    IsAny<V> extends true
        ? `${P}.${string}`
        : V extends LeafObject
            ? never
            : V extends readonly (infer U)[]
                ? (NonNullable<U> extends TValue ? `${P}[${number}]` : never)
                | FieldSubPathImpl<`${P}[${number}]`, NonNullable<U>, TValue, D>
                : V extends object
                    ? `${P}.${FieldPathImpl<V, TValue, D>}`
                    : never;

type ArrayIndexValueImpl<T, P extends string> =
    P extends `[${string}]${infer Rest}`
        ? NonNullable<T> extends readonly (infer U)[]
            ? Rest extends ""
                ? U
                : ArrayIndexValueImpl<U, Rest>
            : never
        : never;

type FieldSegmentValueImpl<T, P extends string> =
    P extends keyof T
        ? T[P]
        : P extends `${infer K}[${infer I}]${infer Rest}`
            ? K extends keyof T
                ? ArrayIndexValueImpl<T[K], `[${I}]${Rest}`>
                : never
            : never;

type FieldPathValueImpl<T, P extends string> =
    IsAny<T> extends true
        ? any
        : P extends `${infer K}.${infer Rest}`
            ? FieldPathValueImpl<NonNullable<FieldSegmentValueImpl<T, K>>, Rest>
            : FieldSegmentValueImpl<T, P>;

export type FieldPath<T> = IsAny<T> extends true ? string : FieldPathImpl<T, unknown, []>;

export type FieldPathValue<T, P extends string> = FieldPathValueImpl<T, P>;

export type ArrayFieldPath<T> = IsAny<T> extends true ? string : FieldPathImpl<T, readonly unknown[], []>;

export type ArrayItemType<T, P extends string> =
    IsAny<T> extends true
        ? any
        : NonNullable<FieldPathValue<T, P>> extends readonly (infer U)[]
            ? U
            : never;

export type FieldPathByValue<T, TValue> = IsAny<T> extends true ? string : FieldPathImpl<T, TValue, []>;

type ParentFieldPath<P extends string, TParent extends string = ""> =
    P extends `${infer Head}.${infer Tail}`
        ? ParentFieldPath<Tail, TParent extends "" ? Head : `${TParent}.${Head}`>
        : TParent;

/**
 * Validates `P` as a field path of `T` whose value matches `TValue`.
 * An invalid or partially typed `P` resolves to the concrete paths below its parent path,
 * so editors can suggest the fields of array items such as `rows[0].`.
 */
export type AutoFieldPath<T, P extends string, TValue = unknown> =
    P extends FieldPathByValue<T, TValue>
        ? P
        : ParentFieldPath<P> extends infer TParent extends string
            ? TParent extends ""
                ? FieldPathByValue<T, TValue>
                : `${TParent}.${FieldPathByValue<NonNullable<FieldPathValue<T, TParent>>, TValue>}`
            : never;

export type AutoArrayFieldPath<T, P extends string> = AutoFieldPath<T, P, readonly unknown[]>;

export type FormValidateResult = {
    isValid: boolean;
    invalidFields: Set<string>;
}

export type ObjectData = object & { [Symbol.iterator]?: never };

export interface IFieldInfo {
    name: string;
    path: FieldPathPart[];
    listenerCount: number;
}

export type FieldPathPart = {
    name: string;
    nameEndIndex?: number;
    isArray?: boolean;
    isArrayItem?: boolean;
    internalName?: string;
}

export type FieldState = {
    isTouched: boolean;
    isDirty: boolean;
    isValid: boolean;
    isValidated: boolean;
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
    keepValidationResultsWithoutListeners?: boolean;
    cacheValidationResult?: boolean;
}

/**
 * Which changes inside a field's children notify its field listener:
 * - `self`: none;
 * - `child`: changes to its direct children;
 * - `descendants`: changes at any depth.
 *
 * In every scope the listener is notified when the field itself changes, when an ancestor replaces it,
 * and when its own state changes (for example, it becomes dirty).
 */
export type FieldListenerScope = "self" | "child" | "descendants";

export type FormOptions<TData> = FormConfig & {
    /**
     * Initial form data. The form keeps this object without copying it and never
     * mutates it: every change produces new objects along the changed path, which
     * become plain objects. Field values such as class instances or functions are
     * stored as they are. Don't mutate this object, or one read from the form,
     * after passing it in.
     */
    data?: TData;
    validator?: IValidator<TData> | (() => IValidator<TData>);
}

export type FormListenerOptions = {
    fieldName?: string;
    listenDataChange: boolean;
    listenStateChange: boolean;
    listenValidationChange: boolean;
    scope?: FieldListenerScope;
}

export type FormListener = FormListenerOptions & {
    notify: () => void;
}

interface IFormValidation<TData> {

    setValidator(validator: IValidator<TData> | undefined): void;

    validate(ruleSet?: string | null): FormValidateResult;

    applyValidationResult(result: IValidationResult, options?: ApplyValidationOptions): void;

    applyFieldValidationResult<TPath extends string>(
        name: AutoFieldPath<TData, TPath>,
        result: IValidationResult,
        options?: ApplyValidationOptions
    ): void;

    applyValidationResults(validationResults: Map<string, IValidationResult>, options?: ApplyValidationOptions): void;

    resetValidationResults(): void;

    resetFieldValidationResults<TPath extends string>(name: AutoFieldPath<TData, TPath> | AutoFieldPath<TData, TPath>[]): void;

    getValidationResult<TPath extends string>(name?: AutoFieldPath<TData, TPath> | null): IValidationResult | undefined;

    getValidationMessage<TPath extends string>(name?: AutoFieldPath<TData, TPath> | null): ValidationMessage | undefined;

    getInvalidFields(): string[];
}

interface IFormArrayActions<TData> {

    prependItems<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean
    ): void;
    
    appendItems<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean
    ): void;
    
    insertItems<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        index: number,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean
    ): void;
    
    removeItems<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        index: number | number[],
        silent?: boolean
    ): void;
    
    swapItem<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        fromIndex: number,
        toIndex: number,
        silent?: boolean
    ): void;

    moveItem<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        fromIndex: number,
        toIndex: number,
        silent?: boolean
    ): void;
    
    updateItem<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        index: number,
        value: ArrayItemType<TData, TPath>,
        silent?: boolean
    ): void;
}

export interface IKertyForm<TData> extends IFormValidation<TData>, IFormArrayActions<TData> {
    updateConfiguration(config: FormConfig): void;
    addListener(listener: () => void, options?: Omit<FormListenerOptions, 'fieldName' | 'scope'> ): () => void;
    addFieldListener<TPath extends string>(name: AutoFieldPath<TData, TPath>, listener: () => void, scope?: FieldListenerScope): () => void;
    getData(): TData;
    getState(): FormState;
    getSnapshot(): () => FormSnapshot<TData>;
    getFieldSnapshot<TPath extends string>(name: AutoFieldPath<TData, TPath>): () => FieldSnapshot<FieldPathValue<TData, TPath>>;
    getFieldValue<TPath extends string>(name: AutoFieldPath<TData, TPath>): FieldPathValue<TData, TPath> | undefined;
    getFieldState<TPath extends string>(name: AutoFieldPath<TData, TPath>): FieldState;
    setFieldValue<TPath extends string>(name: AutoFieldPath<TData, TPath>, value: FieldPathValue<TData, TPath> | null | undefined, silent?: boolean): void;
    setFieldValue<TValue>(name: FieldPathByValue<TData, TValue>, value: TValue | null | undefined, silent?: boolean): void;
    clearFieldValue<TPath extends string>(name: AutoFieldPath<TData, TPath> | AutoFieldPath<TData, TPath>[], silent?: boolean): void;
    removeFieldValue<TPath extends string>(name: AutoFieldPath<TData, TPath> | AutoFieldPath<TData, TPath>[], silent?: boolean): void;
    touch<TPath extends string>(name?: AutoFieldPath<TData, TPath>): void;
    touch<TValue>(name?: FieldPathByValue<TData, TValue>): void;
    /**
     * Restores the initial data and clears field and form state and validation results. When `data` is given,
     * it becomes the new initial data, kept without copying as with {@link FormOptions.data}.
     */
    reset(data?: TData): void;
}
