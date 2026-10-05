/**
 * Severity levels of validation messages.
 */
export const Severity = {
    None: 0,
    Success: 1,
    Info: 2,
    Warning: 4,
    Error: 8,
} as const;

/**
 * One of the {@link Severity} values.
 */
export type MessageSeverity = (typeof Severity)[keyof typeof Severity];

/**
 * A validation message.
 */
export type ValidationMessage = {
    /**
     * The text shown to the user.
     */
    text: string;
    /**
     * The message's severity; {@link Severity.Error} when omitted.
     */
    severity?: MessageSeverity;
}

/**
 * The validation messages of a field or of the form.
 */
export interface IValidationResult {
    /**
     * Checks whether the result contains a message of the given severity.
     * @param severity The severity to look for.
     * @returns Whether such a message exists.
     */
    readonly has: (severity: MessageSeverity) => boolean;
    /**
     * The messages, in the order they were added.
     */
    readonly messages: readonly ValidationMessage[];
}

/**
 * How the form applies the results a validator returns.
 */
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

/**
 * How applied validation results are combined with existing results.
 */
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

/**
 * Checks form data and returns validation results.
 */
export interface IValidator<TData> {
    /**
     * How the form applies the returned results.
     */
    mode: ValidatorMode;
    /**
     * Validates the form data.
     * @param ctx The data, the changed field and the rule set.
     * @returns The results keyed by field path; the empty key refers to the form itself.
     */
    validate: (ctx: ValidatorContext<TData>) => Map<string, IValidationResult>;
}

/**
 * What a validator is asked to validate.
 */
export type ValidatorContext<TData> = {
    /**
     * The form data.
     */
    data: TData;
    /**
     * The changed field's path, or nothing when the whole form is validated.
     */
    fieldName?: string | null;
    /**
     * The rule set to validate with.
     */
    ruleSet?: string | null;
}

/**
 * The field a validation rule is checking.
 */
export type ValidationContext<TData, TValue> = {
    /**
     * The field's path.
     */
    fieldName: string;
    /**
     * The form data.
     */
    data: TData;
    /**
     * The object that holds the field; for an array item, the object that holds the array.
     */
    parent: any | undefined;
    /**
     * The context of the object or array that holds the field; walk it up to reach every ancestor.
     */
    parentContext: ValidationContext<TData, any> | undefined;
    /**
     * The field's value.
     */
    value: TValue | undefined;
}

/**
 * Options for applying validation results.
 */
export type ApplyValidationOptions = {
    /**
     * How the results are combined with existing results; `patch` by default.
     */
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

/**
 * Whether `T` is `any`.
 */
type IsAny<T> = 0 extends (1 & T) ? true : false;

/**
 * Object types treated as single values rather than as objects with fields.
 */
type LeafObject = Date | Function | WeakMap<any, any> | WeakSet<any> | Promise<any>;

/**
 * The paths of the fields in `T` whose value matches `TValue`.
 */
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

/**
 * The paths below the path `P`, whose value is `V`, that match `TValue`.
 */
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

/**
 * The value type at an index path such as `[0][1]` in the array `T`.
 */
type ArrayIndexValueImpl<T, P extends string> =
    P extends `[${string}]${infer Rest}`
        ? NonNullable<T> extends readonly (infer U)[]
            ? Rest extends ""
                ? U
                : ArrayIndexValueImpl<U, Rest>
            : never
        : never;

/**
 * The value type of one path segment, such as `name` or `items[0]`, in `T`.
 */
type FieldSegmentValueImpl<T, P extends string> =
    P extends keyof T
        ? T[P]
        : P extends `${infer K}[${infer I}]${infer Rest}`
            ? K extends keyof T
                ? ArrayIndexValueImpl<T[K], `[${I}]${Rest}`>
                : never
            : never;

/**
 * The value type at the path `P` in `T`.
 */
type FieldPathValueImpl<T, P extends string> =
    IsAny<T> extends true
        ? any
        : P extends `${infer K}.${infer Rest}`
            ? FieldPathValueImpl<NonNullable<FieldSegmentValueImpl<T, K>>, Rest>
            : FieldSegmentValueImpl<T, P>;

/**
 * The paths of all fields in `T`.
 */
export type FieldPath<T> = IsAny<T> extends true ? string : FieldPathImpl<T, unknown, []>;

/**
 * The value type of the field at the path `P` in `T`.
 */
export type FieldPathValue<T, P extends string> = FieldPathValueImpl<T, P>;

/**
 * The paths of the array fields in `T`.
 */
export type ArrayFieldPath<T> = IsAny<T> extends true ? string : FieldPathImpl<T, readonly unknown[], []>;

/**
 * The item type of the array at the path `P` in `T`.
 */
export type ArrayItemType<T, P extends string> =
    IsAny<T> extends true
        ? any
        : NonNullable<FieldPathValue<T, P>> extends readonly (infer U)[]
            ? U
            : never;

/**
 * The paths of the fields in `T` whose value matches `TValue`.
 */
export type FieldPathByValue<T, TValue> = IsAny<T> extends true ? string : FieldPathImpl<T, TValue, []>;

/**
 * The path before the last `.` in `P`, or `""` when `P` has no `.`.
 */
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

/**
 * Like {@link AutoFieldPath}, for array fields.
 */
export type AutoArrayFieldPath<T, P extends string> = AutoFieldPath<T, P, readonly unknown[]>;

/**
 * The outcome of validating the form.
 */
export type FormValidateResult = {
    /**
     * Whether the form is valid.
     */
    isValid: boolean;
    /**
     * The paths of the invalid fields.
     */
    invalidFields: Set<string>;
}

/**
 * Form data: any object except arrays and other iterables.
 */
export type ObjectData = object & { [Symbol.iterator]?: never };

/**
 * A field known to the form.
 */
export interface IFieldInfo {
    /**
     * The field's path.
     */
    name: string;
    /**
     * The field's path split into parts.
     */
    path: FieldPathPart[];
    /**
     * The number of listeners subscribed to the field.
     */
    listenerCount: number;
}

/**
 * One part of a parsed field path.
 */
export type FieldPathPart = {
    /**
     * The property name or array index.
     */
    name: string;
    /**
     * Where this part ends in the full path.
     */
    nameEndIndex?: number;
    /**
     * Whether the value at this part is an array.
     */
    isArray?: boolean;
    /**
     * Whether this part is an array index.
     */
    isArrayItem?: boolean;
    /**
     * The key under which the form stores this part's field state.
     */
    internalName?: string;
}

/**
 * The state of a field.
 */
export type FieldState = {
    /**
     * Whether the user has interacted with the field.
     */
    isTouched: boolean;
    /**
     * Whether the value differs from the initial data.
     */
    isDirty: boolean;
    /**
     * Whether the field has no error message.
     */
    isValid: boolean;
    /**
     * Whether the field has been validated.
     */
    isValidated: boolean;
}

/**
 * A field's value, state and validation result at one point in time.
 */
export type FieldSnapshot<TValue> = FieldState & {
    /**
     * The field's value.
     */
    value: TValue | null | undefined;
    /**
     * The field's validation result, or `undefined` when it has no messages.
     */
    validationResult: IValidationResult | undefined;
}

/**
 * The state of the form.
 */
export type FormState = {
    /**
     * Whether neither the fields nor the form itself have an error message.
     */
    isValid: boolean;
    /**
     * Whether any field differs from the initial data.
     */
    isDirty: boolean;
    /**
     * Whether any field has been touched.
     */
    isTouched: boolean;
    /**
     * Whether the form has been validated.
     */
    isValidated: boolean;
}

/**
 * The form's data, state and validation result at one point in time.
 */
export type FormSnapshot<TData> = {
    /**
     * The form data.
     */
    data: TData;
    /**
     * The form state.
     */
    state: FormState;
    /**
     * The form's own validation result.
     */
    validationResult?: IValidationResult;
}

/**
 * Options that change how the form tracks state and handles validation.
 */
export type FormConfig = {
    /**
     * Whether fields and the form track dirty state; `true` by default.
     */
    dirtyCheckEnabled?: boolean;
    /**
     * Whether `""` and `[]` count as empty, like `null` and `undefined`, when checking dirty state; `true` by default.
     */
    dirtyCheckNullAsDefault?: boolean;
    /**
     * Whether changing a value marks the field touched; `true` by default.
     */
    trackTouchOnValueChange?: boolean;
    /**
     * Whether changing any value clears the form's own validation result; `true` by default.
     */
    clearFormValidationResultsOnChange?: boolean;
    /**
     * Whether a field keeps its validation result after its last listener is removed; `true` by default.
     */
    keepValidationResultsWithoutListeners?: boolean;
    /**
     * Whether `validate` reuses its last result while nothing has changed; `true` by default.
     */
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

/**
 * Options for creating a form.
 */
export type FormOptions<TData> = FormConfig & {
    /**
     * Initial form data. The form keeps this object without copying it and never
     * mutates it: every change produces new objects along the changed path, which
     * become plain objects. Field values such as class instances or functions are
     * stored as they are. Don't mutate this object, or one read from the form,
     * after passing it in.
     */
    data?: TData;
    /**
     * The validator, or a function that creates it.
     */
    validator?: IValidator<TData> | (() => IValidator<TData>);
}

/**
 * What a form listener subscribes to.
 */
export type FormListenerOptions = {
    /**
     * The path of the field to listen to, or nothing for the whole form.
     */
    fieldName?: string;
    /**
     * Whether data changes notify the listener.
     */
    listenDataChange: boolean;
    /**
     * Whether form state changes notify the listener.
     */
    listenStateChange: boolean;
    /**
     * Whether validation changes notify the listener.
     */
    listenValidationChange: boolean;
    /**
     * Which changes inside the field notify the listener.
     */
    scope?: FieldListenerScope;
}

/**
 * A subscribed form listener.
 */
export type FormListener = FormListenerOptions & {
    /**
     * Called when something the listener subscribed to changes.
     */
    notify: () => void;
}

interface IFormValidation<TData> {

    /**
     * Sets the validator that checks the form data.
     * @param validator The validator, or `undefined` to remove it.
     */
    setValidator(validator: IValidator<TData> | undefined): void;

    /**
     * Validates the form.
     * @param ruleSet The rule set to validate with.
     * @returns Whether the form is valid, and the paths of the invalid fields.
     */
    validate(ruleSet?: string | null): FormValidateResult;

    /**
     * Applies a validation result to the form itself.
     * @param result The validation result.
     * @param options How the result is combined with existing results.
     */
    applyValidationResult(result: IValidationResult, options?: ApplyValidationOptions): void;

    /**
     * Applies a validation result to a field.
     * @param name The field's path.
     * @param result The validation result.
     * @param options How the result is combined with existing results.
     */
    applyFieldValidationResult<TPath extends string>(
        name: AutoFieldPath<TData, TPath>,
        result: IValidationResult,
        options?: ApplyValidationOptions
    ): void;

    /**
     * Applies validation results to the form and its fields.
     * @param validationResults The results keyed by field path; the empty key refers to the form itself.
     * @param options How the results are combined with existing results.
     */
    applyValidationResults(validationResults: Map<string, IValidationResult>, options?: ApplyValidationOptions): void;

    /**
     * Clears the validation results of the form and all fields.
     */
    resetValidationResults(): void;

    /**
     * Clears the validation results of fields.
     * @param name The path of a field, or several paths.
     */
    resetFieldValidationResults<TPath extends string>(name: AutoFieldPath<TData, TPath> | AutoFieldPath<TData, TPath>[]): void;

    /**
     * Gets a validation result.
     * @param name The field's path, or nothing for the form itself.
     * @returns The validation result, or `undefined` when there are no messages.
     */
    getValidationResult<TPath extends string>(name?: AutoFieldPath<TData, TPath> | null): IValidationResult | undefined;

    /**
     * Gets the first validation message.
     * @param name The field's path, or nothing for the form itself.
     * @returns The first message, or `undefined` when there are no messages.
     */
    getValidationMessage<TPath extends string>(name?: AutoFieldPath<TData, TPath> | null): ValidationMessage | undefined;

    /**
     * Gets the invalid fields.
     * @returns The paths of the invalid fields.
     */
    getInvalidFields(): string[];
}

interface IFormArrayActions<TData> {

    /**
     * Adds items to the start of an array.
     * @param name The array's path.
     * @param value An item, or several items.
     * @param silent When true, listeners aren't notified and the array isn't marked touched.
     */
    prependItems<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean
    ): void;

    /**
     * Adds items to the end of an array.
     * @param name The array's path.
     * @param value An item, or several items.
     * @param silent When true, listeners aren't notified and the array isn't marked touched.
     */
    appendItems<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean
    ): void;

    /**
     * Inserts items into an array.
     * @param name The array's path.
     * @param index The position of the first inserted item.
     * @param value An item, or several items.
     * @param silent When true, listeners aren't notified and the array isn't marked touched.
     */
    insertItems<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        index: number,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean
    ): void;

    /**
     * Removes items from an array.
     * @param name The array's path.
     * @param index The index of an item, or several indexes.
     * @param silent When true, listeners aren't notified and the array isn't marked touched.
     */
    removeItems<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        index: number | number[],
        silent?: boolean
    ): void;

    /**
     * Swaps two items of an array.
     * @param name The array's path.
     * @param fromIndex The index of the first item.
     * @param toIndex The index of the second item.
     * @param silent When true, listeners aren't notified and the array isn't marked touched.
     */
    swapItem<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        fromIndex: number,
        toIndex: number,
        silent?: boolean
    ): void;

    /**
     * Moves an item to another position in an array.
     * @param name The array's path.
     * @param fromIndex The item's current index.
     * @param toIndex The item's new index.
     * @param silent When true, listeners aren't notified and the array isn't marked touched.
     */
    moveItem<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        fromIndex: number,
        toIndex: number,
        silent?: boolean
    ): void;

    /**
     * Replaces an item of an array.
     * @param name The array's path.
     * @param index The item's index.
     * @param value The new item.
     * @param silent When true, listeners aren't notified and the array isn't marked touched.
     */
    updateItem<TPath extends string>(
        name: AutoArrayFieldPath<TData, TPath>,
        index: number,
        value: ArrayItemType<TData, TPath>,
        silent?: boolean
    ): void;
}

export interface IKertyForm<TData> extends IFormValidation<TData>, IFormArrayActions<TData> {
    /**
     * Changes the form's configuration.
     * @param config The options to change; omitted options keep their values.
     */
    updateConfiguration(config: FormConfig): void;
    /**
     * Subscribes to form changes.
     * @param listener Called when the form changes.
     * @param options Which kinds of change to listen to; all by default.
     * @returns A function that unsubscribes.
     */
    addListener(listener: () => void, options?: Omit<FormListenerOptions, 'fieldName' | 'scope'> ): () => void;
    /**
     * Subscribes to changes of a field.
     * @param name The field's path.
     * @param listener Called when the field changes.
     * @param scope Which changes inside the field to listen to; none by default.
     * @returns A function that unsubscribes.
     */
    addFieldListener<TPath extends string>(name: AutoFieldPath<TData, TPath>, listener: () => void, scope?: FieldListenerScope): () => void;
    /**
     * Gets the form data.
     * @returns The current data.
     */
    getData(): TData;
    /**
     * Gets the form state.
     * @returns The current state.
     */
    getState(): FormState;
    /**
     * Creates a reader of the form's snapshot, for use with `useSyncExternalStore`.
     * @returns A function that returns the current data, state and validation result.
     */
    getSnapshot(): () => FormSnapshot<TData>;
    /**
     * Creates a reader of a field's snapshot, for use with `useSyncExternalStore`.
     * @param name The field's path.
     * @returns A function that returns the field's current value, state and validation result.
     */
    getFieldSnapshot<TPath extends string>(name: AutoFieldPath<TData, TPath>): () => FieldSnapshot<FieldPathValue<TData, TPath>>;
    /**
     * Gets a field's value.
     * @param name The field's path.
     * @returns The value, or `undefined` when the field doesn't exist.
     */
    getFieldValue<TPath extends string>(name: AutoFieldPath<TData, TPath>): FieldPathValue<TData, TPath> | undefined;
    /**
     * Gets a field's state.
     * @param name The field's path.
     * @returns The field's state.
     */
    getFieldState<TPath extends string>(name: AutoFieldPath<TData, TPath>): FieldState;
    /**
     * Sets a field's value.
     * @param name The field's path.
     * @param value The new value.
     * @param silent When true, listeners aren't notified and the field isn't marked touched.
     */
    setFieldValue<TPath extends string>(name: AutoFieldPath<TData, TPath>, value: FieldPathValue<TData, TPath> | null | undefined, silent?: boolean): void;
    /**
     * Sets a field's value.
     * @param name The path of a field whose type matches `value`.
     * @param value The new value.
     * @param silent When true, listeners aren't notified and the field isn't marked touched.
     */
    setFieldValue<TValue>(name: FieldPathByValue<TData, TValue>, value: TValue | null | undefined, silent?: boolean): void;
    /**
     * Clears the values of fields.
     * @param name The path of a field, or several paths.
     * @param silent When true, listeners aren't notified and the fields aren't marked touched.
     */
    clearFieldValue<TPath extends string>(name: AutoFieldPath<TData, TPath> | AutoFieldPath<TData, TPath>[], silent?: boolean): void;
    /**
     * Removes fields from the data.
     * @param name The path of a field, or several paths.
     * @param silent When true, listeners aren't notified and the fields aren't marked touched.
     */
    removeFieldValue<TPath extends string>(name: AutoFieldPath<TData, TPath> | AutoFieldPath<TData, TPath>[], silent?: boolean): void;
    /**
     * Marks fields touched.
     * @param name The field's path, or nothing to mark every field.
     */
    touch<TPath extends string>(name?: AutoFieldPath<TData, TPath>): void;
    /**
     * Marks fields touched.
     * @param name The path of a field whose type matches the given value type, or nothing to mark every field.
     */
    touch<TValue>(name?: FieldPathByValue<TData, TValue>): void;
    /**
     * Resets the form to its initial data.
     * @param data New initial data to reset to.
     */
    reset(data?: TData): void;
}
