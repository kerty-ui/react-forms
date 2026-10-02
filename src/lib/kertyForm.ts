import { getFieldPath, INTERNAL_NAME_PREFIX } from "./utils/getFieldPath";
import { getObjectValue } from "./utils/getObjectValue";
import { setObjectValue } from "./utils/setObjectValue";
import { setObjectValueImmutable } from "./utils/setObjectValueImmutable";
import { removeObjectValue } from "./utils/removeObjectValue";
import { removeObjectValueImmutable } from "./utils/removeObjectValueImmutable";
import { isEqual } from "./utils/isEqual";
import { ValidationResult } from "./validation/validationResult";
import {
    Severity,
    type FieldPath,
    type FieldPathValue,
    type FieldPathByValue,
    type FieldState,
    type FieldSnapshot,
    type ArrayFieldPath,
    type ArrayItemType,
    type FieldListenerScope,
    type FormConfig,
    type FormOptions,
    type FormListener,
    type FormListenerOptions,
    type FormState,
    type FormSnapshot,
    type IKertyForm,
    type IValidator,
    type IValidationResult,
    type ApplyValidationOptions,
    type ObjectData,
    type FieldPathPart,
    type IFieldInfo,
} from "./types";

type ItemNode = {
    [INTERNAL_NAME_PREFIX]?: FieldEntry
};

type ValidArrayItem<T> = ItemNode & (T extends readonly (infer Item)[]
    ? readonly ValidArrayItem<Item>[]
    : T extends object
        ? ValidObject<T>
        : unknown);

type ValidValue<T> = T extends readonly (infer Item)[]
    ? readonly ValidArrayItem<Item>[]
    : T extends object
        ? ValidObject<T>
        : never;

type ValidObject<T> = {
    [K in keyof T]: K extends `${typeof INTERNAL_NAME_PREFIX}${string}` ? FieldEntry : ValidValue<T[K]>;
};

type RegisteredAncestor = {
    entry: FieldEntry;
    nameEndIndex: number;
    value: unknown;
    initialValue: unknown;
};

type MovedItems = {
    start: number;
    end: number;
    extraIndex?: number;
};

// Returns itself for any property, so a moved item and all of its children differ from any real value.
const MOVED_ITEM: any = new Proxy({}, { get: () => MOVED_ITEM });

// Moved entries keep the dirty state of their old index, so the descendants dirty check must see the moved
// positions as changed even when the item value at that position is the same.
const markMovedItems = (items: unknown[], movedItems: MovedItems) => {
    const previousItems = [...items];
    for(let i = movedItems.start; i < movedItems.end; i++) {
        previousItems[i] = MOVED_ITEM;
    }
    if(movedItems.extraIndex !== undefined) {
        previousItems[movedItems.extraIndex] = MOVED_ITEM;
    }
    return previousItems;
}

const defaultFormState = {
    isTouched: false,
    isDirty: false,
    isValid: true,
    isValidated: false,
} as FormState;

const defaultFieldState = {
    isTouched: false,
    isDirty: false,
    isValid: true,
    isValidated: false,
} as FieldState;

const defaultFieldSnapshot = {
    isTouched: false,
    isDirty: false,
    isValid: true,
    isValidated: false,
    value: undefined,
    validationResult: undefined,
} as FieldSnapshot<any>;

const isExistingItemIndex = (index: number, length: number) =>
    Number.isInteger(index) && index >= 0 && index < length;

export const defaultFormConfig = {
    dirtyCheckEnabled: true,
    dirtyCheckNullAsDefault: true,
    trackTouchOnValueChange: true,
    clearFormValidationResultsOnChange: true,
    keepValidationResultsWithoutListeners: true,
} as Required<FormConfig>

class FieldInfo implements IFieldInfo {

    name: string;
    path: FieldPathPart[];
    listenerCount: number = 0;

    constructor(name: string) {
        this.name = name;
        this.path = getFieldPath(name, true);
    }
}

class FieldEntry {

    lastPartName: string;
    state: FieldState = defaultFieldState;
    validationResult?: IValidationResult | undefined = undefined;

    constructor(path: FieldPathPart[]) {
        this.lastPartName = path[path.length - 1].name;
    }
}

class NotifyListenerOptions {

    #formDataChanged: boolean = false;
    #formStateChanged: boolean = false;
    #formValidationChanged: boolean = false;
    #allFieldsAffected: boolean = false;
    #affectedFields: Set<string> = new Set<string>();
    #changedFields: { name: string, parentNameLength: number }[] = [];

    formDataChanged() {
        this.#formDataChanged = true;
    }

    formStateChanged() {
        this.#formStateChanged = true;
    }

    formValidationChanged() {
        this.#formValidationChanged = true;
    }

    allFieldsAffected() {
        this.#allFieldsAffected = true;
    }

    addAffectedField(fieldName: string) {
        this.#affectedFields.add(fieldName);
    }

    addChangedField(field: FieldInfo) {
        const path = field.path;
        this.#changedFields.push({
            name: field.name,
            parentNameLength: path.length > 1 ? path[path.length - 2].nameEndIndex! : -1
        });
    }

    hasChanged() {
        return this.#formDataChanged
            || this.#formStateChanged
            || this.#formValidationChanged
            || this.#allFieldsAffected
            || this.#affectedFields.size > 0
            || this.#changedFields.length > 0;
    }

    isNotificationNeeded(listener: FormListener) {
        if((listener.listenDataChange && this.#formDataChanged)
            || (listener.listenStateChange && this.#formStateChanged)
            || (listener.listenValidationChange && this.#formValidationChanged)) {
            return true;
        }

        if(listener.fieldName == null) {
            return false;
        }

        if(this.#allFieldsAffected || this.#affectedFields.has(listener.fieldName)) {
            return true;
        }

        const listenerFieldNameLength = listener.fieldName.length;

        for(const changedField of this.#changedFields) {
            const changedFieldName = changedField.name;
            const changedFieldNameLength = changedFieldName.length;
            if(listenerFieldNameLength === changedFieldNameLength) {
                if(listener.fieldName === changedFieldName) {
                    return true;
                }
            }
            else if(listenerFieldNameLength < changedFieldNameLength) {
                if(listener.scope === "descendants") {
                    if(changedFieldName.startsWith(listener.fieldName)) {
                        const next = changedFieldName[listenerFieldNameLength];
                        if(next === "." || next === "[") {
                            return true;
                        }
                    }
                }
                else if(listener.scope === "child") {
                    if(listenerFieldNameLength === changedField.parentNameLength
                        && changedFieldName.startsWith(listener.fieldName)) {
                        return true;
                    }
                }
            }
            else if(listener.fieldName.startsWith(changedFieldName)) {
                const next = listener.fieldName[changedFieldNameLength];
                if(next === "." || next === "[") {
                    return true;
                }
            }
        }

        return false;
    }
}

export class KertyForm<TData extends ObjectData> implements IKertyForm<TData> {

    #dirtyCheckEnabled: boolean = true;
    #dirtyCheckNullAsDefault: boolean = true;
    #trackTouchOnValueChange: boolean = true;
    #clearFormValidationResultsOnChange: boolean = true;
    #keepValidationResultsWithoutListeners: boolean = true;

    #initialData: TData;
    #data: TData;
    #state: FormState;
    #validator: IValidator<TData> | undefined = undefined;
    #isMessageDrivenValidator: boolean = false;
    #validationResult?: IValidationResult;
    #ruleSet?: string | null;

    #fields = new Map<string, FieldInfo>();
    #fieldEntries = {} as ValidObject<TData>;
    #dirtyCount = 0;
    #invalidCount = 0;
    #validatedCount = 0;
    #listeners = new Set<FormListener>();

    constructor(options: FormOptions<TData>) {
        this.#initialData = structuredClone(options.data ?? {} as TData);
        this.#data = this.#initialData;
        this.#state = structuredClone(defaultFormState);
        this.setValidator(typeof options.validator === "function" ? options.validator() : options.validator);
        this.updateConfiguration({ ...defaultFormConfig, ...options });
    }

    updateConfiguration(config: FormConfig) {
        if(config == null) {
            return;
        }

        const dirtyCheckEnabled = this.#dirtyCheckEnabled;
        const dirtyCheckNullAsDefault = this.#dirtyCheckNullAsDefault;

        if(config.dirtyCheckEnabled != null) {
            this.#dirtyCheckEnabled = config.dirtyCheckEnabled;
        }
        if(config.dirtyCheckNullAsDefault != null) {
            this.#dirtyCheckNullAsDefault = config.dirtyCheckNullAsDefault;
        }
        if(config.trackTouchOnValueChange != null) {
            this.#trackTouchOnValueChange = config.trackTouchOnValueChange;
        }
        if(config.clearFormValidationResultsOnChange != null) {
            this.#clearFormValidationResultsOnChange = config.clearFormValidationResultsOnChange;
        }
        if(config.keepValidationResultsWithoutListeners != null) {
            this.#keepValidationResultsWithoutListeners = config.keepValidationResultsWithoutListeners;
        }

        if(this.#dirtyCheckEnabled === dirtyCheckEnabled && this.#dirtyCheckNullAsDefault === dirtyCheckNullAsDefault) {
            return;
        }

        const listenerOptions = new NotifyListenerOptions();

        const stack: [Record<string, unknown>, any, any][] = [[this.#fieldEntries as any, this.#data, this.#initialData]];
        while(stack.length > 0) {
            const [node, value, initialValue] = stack.pop()!;
            for(const key in node) {
                const child = node[key];
                if(child instanceof FieldEntry) {
                    const name = key.slice(INTERNAL_NAME_PREFIX.length);
                    const isDirty = this.#dirtyCheckEnabled && (name === ""
                        ? this.#isValueDirty(value, initialValue)
                        : this.#isValueDirty(value?.[name], initialValue?.[name]));
                    if(this.#setFieldDirty(child, isDirty)) {
                        listenerOptions.allFieldsAffected();
                    }
                }
                else if(child != null) {
                    stack.push([child as Record<string, unknown>, value?.[key], initialValue?.[key]]);
                }
            }
        }

        const formIsDirty = this.#dirtyCount > 0;
        if(this.#state.isDirty !== formIsDirty) {
            this.#state = {
                ...this.#state,
                isDirty: formIsDirty,
            };
            listenerOptions.formStateChanged();
        }

        this.#notifyListeners(listenerOptions);
    }

    addListener(listener: () => void, options?: FormListenerOptions) {
        const entry = {
            listenDataChange: options?.listenDataChange ?? true,
            listenStateChange: options?.listenStateChange ?? true,
            listenValidationChange: options?.listenValidationChange ?? true,
            notify: listener,
        } as FormListener;
        this.#listeners.add(entry);
        return () => {
            this.#listeners.delete(entry);
        }
    }

    addFieldListener(name: FieldPath<TData>, listener: () => void, scope?: FieldListenerScope) {

        const field = this.#getField(name as string);
        this.#getFieldEntry(field.path);

        field.listenerCount += 1;

        const entry = {
            fieldName: name as string,
            listenDataChange: false,
            listenStateChange: false,
            listenValidationChange: false,
            scope,
            notify: listener,
        } as FormListener;
        this.#listeners.add(entry);

        if(this.#state.isValidated && field.listenerCount === 1) {

            const listenerOptions = new NotifyListenerOptions();

            this.#validateField(name, listenerOptions);

            const formIsValid = this.#isFormValid();
            if(this.#state.isValid !== formIsValid) {
                this.#state = {
                    ...this.#state,
                    isValid: formIsValid,
                };
                listenerOptions.formStateChanged();
            }

            this.#notifyListeners(listenerOptions);
        }

        return () => {
            this.#listeners.delete(entry);

            field.listenerCount -= 1;
            if(field.listenerCount === 0) {

                const fieldEntry = this.#getFieldEntry(field.path, false);
                if(fieldEntry === undefined) {
                    return;
                }

                if(this.#keepValidationResultsWithoutListeners) {
                    if(fieldEntry.state.isTouched) {
                        this.#setFieldState(fieldEntry, {
                            ...fieldEntry.state,
                            isTouched: false,
                        });
                    }
                }
                else {
                    fieldEntry.validationResult = undefined;
                    this.#setFieldState(fieldEntry, {
                        ...fieldEntry.state,
                        isTouched: false,
                        isValid: true,
                        isValidated: false,
                    });
                }

                const state = fieldEntry.state;
                if(fieldEntry.validationResult == null && !state.isDirty && state.isValid && !state.isValidated) {
                    removeObjectValue(this.#fieldEntries as any, field.path, true);
                }

                const listenerOptions = new NotifyListenerOptions();

                const formIsValid = this.#isFormValid();

                if(this.#state.isValid !== formIsValid) {
                    this.#state = {
                        ...this.#state,
                        isValid: formIsValid,
                    };
                    listenerOptions.formStateChanged();
                }

                this.#notifyListeners(listenerOptions);
            }
        };
    }

    getData() {
        return this.#data;
    }

    getState() {
        return this.#state;
    }

    getSnapshot() {
        let prevSnapshot: FormSnapshot<TData> = {
            data: this.#data,
            state: this.#state,
            validationResult: this.#validationResult,
        }
        return () => {

            if(prevSnapshot.data === this.#data
                && prevSnapshot.state === this.#state
                && prevSnapshot.validationResult === this.#validationResult) {
                return prevSnapshot;
            }

            prevSnapshot = {
                data: this.#data,
                state: this.#state,
                validationResult: this.#validationResult,
            };

            return prevSnapshot;
        }
    }

    getDataSnapshot<TValue>(getValue: (data: TData) => TValue) {
        return () => getValue(this.#data);
    }

    getStateSnapshot<TValue>(getValue: (state: FormState) => TValue) {
        return () => getValue(this.#state);
    }

    getFieldSnapshot<TPath extends FieldPath<TData>>(name: TPath) {
        type TValue = FieldPathValue<TData, TPath>;

        let prevFieldValue: TValue | undefined = undefined;
        let prevFieldState: FieldState | undefined = undefined;
        let prevFieldValidationResult: IValidationResult | undefined = undefined;
        let prevFieldSnapshot: FieldSnapshot<TValue> = defaultFieldSnapshot;

        const field = this.#getField(name as string);

        return () => {

            const entry = this.#getFieldEntry(field.path);

            const currentFieldValue = getObjectValue<TValue>(this.#data, field.path);
            if(prevFieldValue === currentFieldValue
                && prevFieldState === entry.state
                && prevFieldValidationResult === entry.validationResult) {
                return prevFieldSnapshot;
            }

            prevFieldValue = currentFieldValue;
            prevFieldState = entry.state;
            prevFieldValidationResult = entry.validationResult;
            prevFieldSnapshot = {
                ...entry.state,
                value: currentFieldValue,
                validationResult: prevFieldValidationResult,
            };

            return prevFieldSnapshot;
        };
    }

    getFieldValue<TPath extends FieldPath<TData>>(name: TPath): FieldPathValue<TData, TPath> | undefined {
        const field = this.#getField(name as string);
        return getObjectValue(this.#data, field.path);
    }

    getFieldState<TPath extends FieldPath<TData>>(name: TPath): FieldState {
        return this.#getFieldEntry(this.#getField(name as string).path).state;
    }

    setFieldValue<TValue>(name: FieldPathByValue<TData, TValue>, value: TValue | null | undefined, silent?: boolean): void;
    setFieldValue<TPath extends FieldPath<TData>>(name: TPath, value: FieldPathValue<TData, TPath> | null | undefined, silent?: boolean): void;
    setFieldValue(name: string, value: unknown, silent: boolean = false) {

        const field = this.#getField(name as string);

        const previousData = this.#data;
        this.#data = setObjectValueImmutable(this.#data, field.path, value);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(field, value, previousData);
    }

    clearFieldValue<TPath extends FieldPath<TData>>(name: TPath | TPath[], silent?: boolean) {
        const fieldNames = Array.isArray(name) ? name : [name];
        for(const fieldName of fieldNames) {
            const field = this.#getField(fieldName as string);
            const previousData = this.#data;
            this.#data = setObjectValueImmutable(this.#data, field.path, undefined);
            if(!silent) {
                this.#onFieldValueChange(field, undefined, previousData);
            }
        }
    }

    removeFieldValue<TPath extends FieldPath<TData>>(name: TPath | TPath[], silent?: boolean) {
        const fieldNames = Array.isArray(name) ? name : [name];
        for(const fieldName of fieldNames) {
            const field = this.#getField(fieldName as string);
            const path = field.path;
            const lastPart = path[path.length - 1];
            if(lastPart.isArrayItem) {
                const arrayName = field.name.slice(0, path[path.length - 2].nameEndIndex);
                this.removeItems(arrayName as ArrayFieldPath<TData>, +lastPart.name, silent);
                continue;
            }
            const previousData = this.#data;
            this.#data = removeObjectValueImmutable(this.#data, field.path);
            if(!silent && this.#data !== previousData) {
                this.#onFieldValueChange(field, undefined, previousData);
            }
        }
    }

    touch(name?: FieldPath<TData>) {

        const listenerOptions = new NotifyListenerOptions();

        if(name != null) {
            const field = this.#getField(name);
            const entry = this.#getFieldEntry(field.path);
            if(!entry.state.isTouched) {
                this.#setFieldState(entry, {
                    ...entry.state,
                    isTouched: true,
                });
                listenerOptions.addAffectedField(name as string);
            }
        }

        if(!this.#state.isTouched) {
            this.#state = {
                ...this.#state,
                isTouched: true,
            }
            listenerOptions.formStateChanged();
        }

        this.#notifyListeners(listenerOptions);
    }

    reset(data?: TData) {
        this.#dirtyCount = 0;
        this.#invalidCount = 0;
        this.#validatedCount = 0;
        this.#validationResult = undefined;

        if(data != null) {
            this.#initialData = structuredClone(data);
        }
        this.#data = this.#initialData;

        this.#state = {...defaultFormState};

        this.#processEntries(this.#fieldEntries, (entry) => {
            entry.state = defaultFieldState;
            entry.validationResult = undefined;
        });

        for (let listener of this.#listeners) {
            listener.notify();
        }
    }

    setValidator(validator: IValidator<TData> | undefined) {
        this.#validator = validator;
        this.#isMessageDrivenValidator = validator?.mode === "messageDriven";
    }

    validate(ruleSet?: string | null) {

        this.#ruleSet = ruleSet;

        const listenerOptions = new NotifyListenerOptions();

        if(this.#validationResult != null) {
            this.#validationResult = undefined;
            listenerOptions.formValidationChanged();
        }

        this.#resetEntriesValidation(listenerOptions, false);

        const invalidFields = new Set<string>();

        if (this.#validator != null) {

            const validationResults = this.#validator.validate({
                data: this.#data,
                ruleSet: this.#ruleSet,
            });

            for (let [fieldName, validationResult] of validationResults) {

                if(fieldName == null || fieldName === "") {
                    if(validationResult.messages.length === 0) {
                        continue;
                    }

                    this.#validationResult = validationResult;
                    listenerOptions.formValidationChanged();

                    continue;
                }

                const field = this.#getField(fieldName);
                const entry = this.#getFieldEntry(field.path);

                if(validationResult.messages.length > 0) {
                    entry.validationResult = validationResult;
                    listenerOptions.formValidationChanged();
                }

                const fieldHasError = validationResult.has(Severity.Error);
                if(fieldHasError) {
                    invalidFields.add(fieldName);
                }

                this.#setFieldState(entry, {
                    ...entry.state,
                    isValid: !fieldHasError,
                    isValidated: true,
                });
                listenerOptions.addAffectedField(fieldName);
            }
        }

        const formIsValid = this.#isFormValid()
        if(this.#state.isValid != formIsValid || !this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: true,
            }
            listenerOptions.formStateChanged();
        }

        this.#notifyListeners(listenerOptions);

        return {
            isValid: formIsValid,
            invalidFields,
        };
    }

    applyValidationResult(result: IValidationResult, options?: ApplyValidationOptions): void {
        this.applyValidationResults(new Map<string, IValidationResult>([["", result]]), options);
    }

    applyFieldValidationResult(name: FieldPath<TData>, result: IValidationResult, options?: ApplyValidationOptions) {
        this.applyValidationResults(new Map<string, IValidationResult>([[name, result]]), options);
    }

    applyValidationResults(validationResults: Map<string, IValidationResult>, options?: ApplyValidationOptions) {

        if(validationResults == null) {
            return;
        }

        const listenerOptions = new NotifyListenerOptions();

        const mode = options?.mode ?? "patch";
        const ignoreUnknownFields = options?.unknownFieldBehavior === "ignore";

        if(mode === "replace") {
            if(this.#validationResult != null) {
                this.#validationResult = undefined;
                listenerOptions.formValidationChanged();
            }

            this.#resetEntriesValidation(listenerOptions, true);
        }
        else if(validationResults.size === 0) {
            return;
        }

        for(let [fieldName, validationResult] of validationResults) {

            if(fieldName == null || fieldName === "") {
                const formValidationResult = new ValidationResult();
                if(mode === "merge") {
                    if(validationResult.messages.length === 0) {
                        continue;
                    }
                    formValidationResult.merge(this.#validationResult);
                }
                formValidationResult.merge(validationResult);

                if(formValidationResult.messages.length > 0) {
                    this.#validationResult = formValidationResult;
                    listenerOptions.formValidationChanged();
                }
                else if(this.#validationResult != null) {
                    this.#validationResult = undefined;
                    listenerOptions.formValidationChanged();
                }
                continue;
            }

            const entry = this.#getFieldEntry(this.#getField(fieldName).path, !ignoreUnknownFields);

            if(entry == null) {
                continue;
            }

            const fieldValidationResult = new ValidationResult();
            if(mode === "merge") {
                fieldValidationResult.merge(entry.validationResult);
            }

            fieldValidationResult.merge(validationResult);

            if(validationResult.messages.length === 0) {
                if(entry.validationResult == null && entry.state.isValid) {
                    continue;
                }

                entry.validationResult = undefined;
                this.#setFieldState(entry, {
                    ...entry.state,
                    isValid: true,
                    isValidated: true,
                });
                listenerOptions.formValidationChanged();
                listenerOptions.addAffectedField(fieldName);
            }
            else {
                entry.validationResult = fieldValidationResult;
                this.#setFieldState(entry, {
                    ...entry.state,
                    isValid: !fieldValidationResult.has(Severity.Error),
                    isValidated: true,
                });
                listenerOptions.formValidationChanged();
                listenerOptions.addAffectedField(fieldName);
            }
        }

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid || !this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: true,
            }
            listenerOptions.formStateChanged();
            listenerOptions.formValidationChanged();
        }

        this.#notifyListeners(listenerOptions);
    }

    resetValidationResults() {

        const listenerOptions = new NotifyListenerOptions();

        if(this.#validationResult != null) {
            this.#validationResult = undefined;
            listenerOptions.formValidationChanged();
        }

        this.#resetEntriesValidation(listenerOptions, false);

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid || this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: false,
            };
            listenerOptions.formStateChanged();
        }

        this.#notifyListeners(listenerOptions);
    }

    resetFieldValidationResults<TPath extends FieldPath<TData>>(name: TPath | TPath[]) {

        const listenerOptions = new NotifyListenerOptions();

        const fieldNames = Array.isArray(name) ? name : [name];
        for(const fieldName of fieldNames) {
            const field = this.#getField(fieldName);
            const entry = this.#getFieldEntry(field.path);
            if(entry.validationResult == null && entry.state.isValid && !entry.state.isValidated) {
                continue;
            }

            entry.validationResult = undefined;
            this.#setFieldState(entry, {
                ...entry.state,
                isValid: true,
                isValidated: false,
            });
            listenerOptions.formValidationChanged();
            listenerOptions.addAffectedField(fieldName);
        }

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
            };
            listenerOptions.formStateChanged();
        }

        this.#notifyListeners(listenerOptions);
    }

    getValidationResult() {
        return this.#validationResult;
    }

    getValidationMessage() {
        return this.#validationResult?.messages[0];
    }

    getFieldValidationResult(name: FieldPath<TData>) {
        return this.#getFieldEntry(this.#getField(name as string).path).validationResult;
    }

    getFieldValidationMessage(name: FieldPath<TData>) {
        return this.getFieldValidationResult(name)?.messages[0];
    }

    getInvalidFields() {
        const names: string[] = [];
        if(this.#invalidCount > 0) {
            this.#collectInvalidFields(this.#fieldEntries as Record<string, unknown>, "", names);
        }
        return names;
    }

    prependItems<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean): void {

        if(value == null) {
            return;
        }

        const field = this.#getField(name as string);

        const currentValue = getObjectValue<ArrayItemType<TData, TPath>[]>(this.#data, field.path) ?? [];
        if(!Array.isArray(currentValue)) {
            return;
        }

        const arrayValue = Array.isArray(value) ? [...value, ...currentValue] : [value, ...currentValue];

        const previousData = this.#data;
        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        this.#insertItemEntries(field, 0, arrayValue.length - currentValue.length, arrayValue.length);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(field, arrayValue, previousData, { start: 0, end: arrayValue.length });
    }

    appendItems<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent: boolean = false): void {

        if(value == null) {
            return;
        }

        const field = this.#getField(name as string);

        const currentValue = getObjectValue<ArrayItemType<TData, TPath>[]>(this.#data, field.path) ?? [];
        if(!Array.isArray(currentValue)) {
            return;
        }

        const arrayValue = Array.isArray(value) ? [...currentValue, ...value] : [...currentValue, value];

        const previousData = this.#data;
        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(field, arrayValue, previousData);
    }

    insertItems<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        index: number,
        value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[],
        silent?: boolean): void {

        if(value == null) {
            return;
        }

        const field = this.#getField(name as string);

        const currentValue = getObjectValue<ArrayItemType<TData, TPath>[]>(this.#data, field.path) ?? [];
        if(!Array.isArray(currentValue)) {
            return;
        }

        const arrayValue = [...currentValue];
        if(Array.isArray(value)) {
            arrayValue.splice(index, 0, ...value);
        }
        else {
            arrayValue.splice(index, 0, value);
        }

        const previousData = this.#data;
        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        const start = index < 0 ? Math.max(currentValue.length + index, 0) : Math.min(index, currentValue.length);
        this.#insertItemEntries(field, start, arrayValue.length - currentValue.length, arrayValue.length);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(field, arrayValue, previousData, { start, end: arrayValue.length });
    }

    removeItems(
        name: ArrayFieldPath<TData>,
        index: number | number[],
        silent: boolean = false): void {

        const field = this.#getField(name as string);

        const currentValue = getObjectValue(this.#data, field.path) ?? [];
        if(!Array.isArray(currentValue)) {
            return;
        }

        const removedIndexes = Array.isArray(index)
            ? [...index].sort((a, b) => b - a)
            : [index < 0 ? Math.max(currentValue.length + index, 0) : index];

        const arrayValue = [...currentValue];
        for(const removedIndex of removedIndexes) {
            arrayValue.splice(removedIndex, 1);
        }

        const previousData = this.#data;
        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        const entries = getObjectValue<ItemNode[]>(this.#fieldEntries as any, field.path);
        if(Array.isArray(entries)) {
            for(const removedIndex of removedIndexes) {
                if(removedIndex < currentValue.length && removedIndex < entries.length) {
                    const removedNode = entries.splice(removedIndex, 1)[0];
                    if(removedNode != null) {
                        this.#resetFieldStates(removedNode);
                    }
                }
            }
        }

        if(silent) {
            return;
        }

        const firstMoved = removedIndexes[removedIndexes.length - 1];
        this.#onFieldValueChange(field, arrayValue, previousData, { start: firstMoved, end: arrayValue.length });
    }

    swapItem<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        fromIndex: number,
        toIndex: number,
        silent?: boolean): void {
        const field = this.#getField(name as string);

        const currentValue = getObjectValue(this.#data, field.path) ?? [];
        if(!Array.isArray(currentValue)) {
            return;
        }

        if(!isExistingItemIndex(fromIndex, currentValue.length)
            || !isExistingItemIndex(toIndex, currentValue.length)) {
            return;
        }

        if(fromIndex === toIndex) {
            return;
        }

        const arrayValue = [...currentValue];
        [arrayValue[fromIndex], arrayValue[toIndex]] = [arrayValue[toIndex], arrayValue[fromIndex]];

        const previousData = this.#data;
        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        const entries = getObjectValue<ItemNode[]>(this.#fieldEntries as any, field.path);
        if(Array.isArray(entries) && (fromIndex < entries.length || toIndex < entries.length)) {
            [entries[fromIndex], entries[toIndex]] = [entries[toIndex], entries[fromIndex]];
        }

        if(silent) {
            return;
        }

        this.#onFieldValueChange(field, arrayValue, previousData, { start: fromIndex, end: fromIndex + 1, extraIndex: toIndex });
    }

    moveItem(
        name: ArrayFieldPath<TData>,
        fromIndex: number,
        toIndex: number,
        silent?: boolean): void {
        const field = this.#getField(name as string);

        const currentValue = getObjectValue(this.#data, field.path) ?? [];
        if(!Array.isArray(currentValue)) {
            return;
        }

        const arrayValue = [...currentValue];
        const removedItems = arrayValue.splice(fromIndex, 1);

        if(removedItems.length === 0) {
            return;
        }

        arrayValue.splice(toIndex, 0, removedItems[0]);

        const previousData = this.#data;
        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        const lastIndex = currentValue.length - 1;
        const from = fromIndex < 0 ? Math.max(currentValue.length + fromIndex, 0) : fromIndex;
        const to = toIndex < 0 ? Math.max(lastIndex + toIndex, 0) : Math.min(toIndex, lastIndex);

        const entries = getObjectValue<ItemNode[]>(this.#fieldEntries as any, field.path);
        if(Array.isArray(entries) && from !== to && (from < entries.length || to < entries.length)) {
            if(entries.length <= Math.max(from, to)) {
                entries.length = Math.max(from, to) + 1;
            }
            entries.splice(to, 0, entries.splice(from, 1)[0]);
        }

        if(silent) {
            return;
        }

        this.#onFieldValueChange(field, arrayValue, previousData, { start: Math.min(from, to), end: Math.max(from, to) + 1 });
    }

    updateItem<TPath extends ArrayFieldPath<TData>>(
        name: TPath,
        index: number,
        value: ArrayItemType<TData, TPath>,
        silent?: boolean): void {
        const field = this.#getField(name as string);

        const currentValue = getObjectValue(this.#data, field.path) ?? [];
        if(!Array.isArray(currentValue)) {
            return;
        }

        if(!isExistingItemIndex(index, currentValue.length)) {
            return;
        }

        const arrayValue = [...currentValue];
        arrayValue[index] = value;

        const previousData = this.#data;
        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(field, arrayValue, previousData);
    }

    #isFormValid() {
        return this.#invalidCount === 0
            && (this.#validationResult == null || !this.#validationResult.has(Severity.Error));
    }

    #addFieldEntry(path: FieldPathPart[]) {
        const entry = new FieldEntry(path);
        setObjectValue(this.#fieldEntries as any, path, entry, true);
        return entry;
    }

    #getFieldEntry(path: FieldPathPart[]): FieldEntry;
    #getFieldEntry(path: FieldPathPart[], initialize: true): FieldEntry;
    #getFieldEntry(path: FieldPathPart[], initialize: boolean): FieldEntry | undefined;
    #getFieldEntry(path: FieldPathPart[], initialize: boolean = true): FieldEntry | undefined {
        let entry = getObjectValue<FieldEntry>(this.#fieldEntries as any, path, true);
        if(entry === undefined && initialize) {
            entry = this.#addFieldEntry(path);
            if(this.#dirtyCheckEnabled) {
                this.#setFieldDirty(entry, this.#isValueDirty(
                    getObjectValue(this.#data, path),
                    getObjectValue(this.#initialData, path)));
            }
        }
        return entry;
    }

    #resetEntriesValidation(listenerOptions: NotifyListenerOptions, isValidated: boolean) {
        if(this.#validatedCount === 0) {
            return;
        }

        this.#processEntries(this.#fieldEntries, (entry) => {
            if(entry.validationResult == null && entry.state.isValid && !entry.state.isValidated) {
                return;
            }

            entry.validationResult = undefined;
            this.#setFieldState(entry, {
                ...entry.state,
                isValid: true,
                isValidated,
            });
        });

        listenerOptions.formValidationChanged();
        listenerOptions.allFieldsAffected();
    }

    #insertItemEntries(field: FieldInfo, start: number, count: number, length: number) {
        const entries = getObjectValue<ItemNode[]>(this.#fieldEntries as any, field.path);
        if(!Array.isArray(entries) || start >= entries.length || count <= 0) {
            return;
        }

        entries.splice(start, 0, ...new Array(count));

        // Entries past the data length belong to no item; without trimming, the array would keep growing
        // whenever the data is replaced silently between inserts.
        if(entries.length > length) {
            for(const trimmedNode of entries.splice(length)) {
                if(trimmedNode != null) {
                    this.#resetFieldStates(trimmedNode);
                }
            }
        }
    }

    #processEntries(root: object, callback: (entry: FieldEntry) => void) {
        const stack: object[] = [root];
        while(stack.length > 0) {
            const node = stack.pop() as Record<string, unknown>;

            if(Array.isArray(node)) {
                const itemEntry = (node as ItemNode)[INTERNAL_NAME_PREFIX];
                if(itemEntry !== undefined) {
                    callback(itemEntry);
                }

                for (let i = 0; i < node.length; i++) {
                    const itemNode = node[i];
                    if(itemNode != null) {
                        stack.push(itemNode);
                    }
                }
                continue;
            }

            for(let key in node) {
                const value = node[key];

                if(value instanceof FieldEntry) {
                    callback(value);
                }
                else if(value != null) {
                    stack.push(value);
                }
            }
        }
    }

    #getField(name: string) {
        let field = this.#fields.get(name);
        if(field === undefined) {
            field = new FieldInfo(name);
            this.#fields.set(name, field);
        }
        return field;
    }

    #collectInvalidFields(node: Record<string, unknown>, name: string, names: string[]) {
        if(Array.isArray(node)) {
            const itemEntry = (node as ItemNode)[INTERNAL_NAME_PREFIX];
            if(itemEntry !== undefined && !itemEntry.state.isValid) {
                names.push(name);
            }

            for(let i = 0; i < node.length; i++) {
                const itemNode = node[i];
                if(itemNode != null) {
                    this.#collectInvalidFields(itemNode as Record<string, unknown>, `${name}[${i}]`, names);
                }
            }
            return;
        }

        for(const key in node) {
            const value = node[key];

            if(value instanceof FieldEntry) {
                if(value.state.isValid) {
                    continue;
                }

                if(key === INTERNAL_NAME_PREFIX) {
                    names.push(name);
                }
                else {
                    names.push(name === "" ? value.lastPartName : `${name}.${value.lastPartName}`);
                }
            }
            else if(value != null) {
                this.#collectInvalidFields(value as Record<string, unknown>, name === "" ? key : `${name}.${key}`, names);
            }
        }
    }

    #setFieldState(entry: FieldEntry, state: FieldState) {
        const previousState = entry.state;
        if(previousState.isValid !== state.isValid) {
            this.#invalidCount += state.isValid ? -1 : 1;
        }
        if(previousState.isDirty !== state.isDirty) {
            this.#dirtyCount += state.isDirty ? 1 : -1;
        }
        const hadValidationState = previousState.isValidated || !previousState.isValid;
        const hasValidationState = state.isValidated || !state.isValid;
        if(hadValidationState !== hasValidationState) {
            this.#validatedCount += hasValidationState ? 1 : -1;
        }
        entry.state = state;
    }

    #resetFieldStates(root: object) {
        this.#processEntries(root, (entry) => {
            this.#setFieldState(entry, defaultFieldState);
        });
    }

    #setFieldDirty(entry: FieldEntry, isDirty: boolean) {
        if(entry.state.isDirty === isDirty) {
            return false;
        }

        this.#setFieldState(entry, {
            ...entry.state,
            isDirty,
        });

        return true;
    }

    #validateField(name: string, listenerOptions: NotifyListenerOptions) {

        if(this.#validator == null) {
            return;
        }

        const validationResults = this.#validator?.validate({
            fieldName: name,
            data: this.#data,
            ruleSet: this.#ruleSet,
        });

        for (let [fieldName, validationResult] of validationResults) {
            if(fieldName == null || fieldName === "") {
                continue;
            }

            const field = this.#getField(fieldName);
            const entry = this.#getFieldEntry(field.path);
            if(validationResult.messages.length > 0) {
                entry.validationResult = validationResult;
            }
            else if(entry.validationResult != null) {
                entry.validationResult = undefined;
            }

            this.#setFieldState(entry, {
                ...entry.state,
                isValid: !validationResult.has(Severity.Error),
                isValidated: true,
            });

            listenerOptions.formValidationChanged();
            listenerOptions.addAffectedField(fieldName);
        }
    }

    #onFieldValueChange(field: FieldInfo, value: unknown, previousData: TData, movedItems?: MovedItems) {

        const listenerOptions = new NotifyListenerOptions();

        listenerOptions.formDataChanged();
        listenerOptions.addChangedField(field);

        if(this.#clearFormValidationResultsOnChange && this.#validationResult != null) {
            this.#validationResult = undefined;
            listenerOptions.formValidationChanged();
        }

        // A missing entry is added clean so the dirty check below sees the change and propagates it to ancestors.
        const entry = this.#getFieldEntry(field.path, false) ?? this.#addFieldEntry(field.path);

        if(this.#dirtyCheckEnabled) {
            if(this.#setFieldDirty(entry, this.#isValueDirty(value, getObjectValue(this.#initialData, field.path)))) {
                const ancestors = this.#getRegisteredAncestors(field);
                const fieldIsDirty = entry.state.isDirty;

                for(let i = ancestors.length - 1; i >= 0; i--) {
                    const ancestor = ancestors[i];

                    const ancestorChanged = this.#setFieldDirty(
                        ancestor.entry,
                        fieldIsDirty || this.#isValueDirty(ancestor.value, ancestor.initialValue));

                    if(!ancestorChanged) {
                        break;
                    }

                    listenerOptions.addAffectedField(field.name.slice(0, ancestor.nameEndIndex));
                }
            }

            this.#checkDescendantsAreDirty(field, entry, previousData, movedItems);
        }

        if(this.#trackTouchOnValueChange) {
            if(!entry.state.isTouched) {
                this.#setFieldState(entry, {
                    ...entry.state,
                    isTouched: true,
                });
                if(!this.#state.isTouched) {
                    this.#state = {
                        ...this.#state,
                        isTouched: true,
                    };
                    listenerOptions.formStateChanged();
                }
            }
        }

        if(this.#validator != null) {
            if(entry.state.isValidated || this.#state.isValidated) {
                if (this.#isMessageDrivenValidator) {
                    if(this.#validatedCount > 0) {
                        let isAnyFieldCleared = false;
                        this.#processEntries(this.#fieldEntries, (validatedEntry) => {
                            if(validatedEntry.validationResult == null && validatedEntry.state.isValid) {
                                return;
                            }

                            validatedEntry.validationResult = undefined;
                            this.#setFieldState(validatedEntry, {
                                ...validatedEntry.state,
                                isValid: true,
                                isValidated: true,
                            });
                            isAnyFieldCleared = true;
                        });
                        if(isAnyFieldCleared) {
                            listenerOptions.formValidationChanged();
                            listenerOptions.allFieldsAffected();
                        }
                    }
                } else if(!entry.state.isValid) {
                    this.#setFieldState(entry, {
                        ...entry.state,
                        isValid: true,
                    });
                    entry.validationResult = undefined;
                }

                this.#validateField(field.name, listenerOptions);
            }
        }
        else if(entry.state.isValidated) {
            if(entry.validationResult != null) {
                entry.validationResult = undefined;
                listenerOptions.formValidationChanged();
            }

            this.#setFieldState(entry, {
                ...entry.state,
                isValid: true,
                isValidated: false,
            });

            if(this.#state.isValidated) {
                this.#state = {
                    ...this.#state,
                    isValidated: false,
                }
                listenerOptions.formStateChanged();
            }
        }

        const formIsValid = this.#isFormValid();
        const formIsDirty = this.#dirtyCount > 0;
        if(this.#state.isValid !== formIsValid || this.#state.isDirty !== formIsDirty) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isDirty: formIsDirty,
            };
            listenerOptions.formStateChanged();
        }

        this.#notifyListeners(listenerOptions);
    }

    #checkDescendantsAreDirty(field: FieldInfo, entry: FieldEntry, previousData: TData, movedItems: MovedItems | undefined) {
        const descendantsNode = getObjectValue<object>(this.#fieldEntries as any, field.path);
        if(descendantsNode == null) {
            return;
        }

        if(!entry.state.isDirty) {
            this.#processEntries(descendantsNode, (descendant) => {
                if(descendant !== entry) {
                    this.#setFieldDirty(descendant, false);
                }
            });
            return;
        }

        const fieldValue = getObjectValue(this.#data, field.path);
        const previousFieldValue = movedItems === undefined
            ? getObjectValue(previousData, field.path)
            : markMovedItems(fieldValue as unknown[], movedItems);
        if(fieldValue === previousFieldValue) {
            return;
        }

        const nodes: any[] = [descendantsNode];
        const values: any[] = [fieldValue];
        const previousValues: any[] = [previousFieldValue];
        const initialValues: any[] = [getObjectValue(this.#initialData, field.path)];

        while(nodes.length > 0) {
            const node = nodes.pop();
            const value = values.pop();
            const previousValue = previousValues.pop();
            const initialValue = initialValues.pop();

            if(Array.isArray(node)) {
                const itemEntry: FieldEntry | undefined = (node as any)[INTERNAL_NAME_PREFIX];
                if(itemEntry !== undefined && itemEntry !== entry) {
                    this.#setFieldDirty(itemEntry, this.#isValueDirty(value, initialValue));
                }

                for(let i = 0; i < node.length; i++) {
                    const itemNode = node[i];
                    const itemValue = value?.[i];
                    const previousItemValue = previousValue?.[i];
                    if(itemNode != null && itemValue !== previousItemValue) {
                        nodes.push(itemNode);
                        values.push(itemValue);
                        previousValues.push(previousItemValue);
                        initialValues.push(initialValue?.[i]);
                    }
                }
                continue;
            }

            for(const key in node) {
                const child = node[key];

                if(child instanceof FieldEntry) {
                    if(child === entry) {
                        continue;
                    }

                    if(key === INTERNAL_NAME_PREFIX) {
                        this.#setFieldDirty(child, this.#isValueDirty(value, initialValue));
                    }
                    else {
                        const name = child.lastPartName;
                        const childValue = value?.[name];
                        if(childValue !== previousValue?.[name]) {
                            this.#setFieldDirty(child, this.#isValueDirty(childValue, initialValue?.[name]));
                        }
                    }
                }
                else if(child != null) {
                    const childValue = value?.[key];
                    const previousChildValue = previousValue?.[key];
                    if(childValue !== previousChildValue) {
                        nodes.push(child);
                        values.push(childValue);
                        previousValues.push(previousChildValue);
                        initialValues.push(initialValue?.[key]);
                    }
                }
            }
        }
    }

    #getRegisteredAncestors(field: FieldInfo) {
        const ancestors: RegisteredAncestor[] = [];

        let node: any = this.#fieldEntries;
        let value: any = this.#data;
        let initialValue: any = this.#initialData;

        const lastIndex = field.path.length - 1;
        for(let i = 0; i < lastIndex; i++) {
            const part = field.path[i];

            const ancestorEntry: FieldEntry | undefined = part.isArrayItem
                ? node?.[part.name]?.[INTERNAL_NAME_PREFIX]
                : node?.[part.internalName!];

            node = node?.[part.name];
            value = value?.[part.name];
            initialValue = initialValue?.[part.name];

            if(ancestorEntry !== undefined) {
                ancestors.push({ entry: ancestorEntry, nameEndIndex: part.nameEndIndex!, value, initialValue });
            }
        }

        return ancestors;
    }

    #notifyListeners(options: NotifyListenerOptions) {

        if(!options.hasChanged()) {
            return;
        }

        for(let listener of this.#listeners) {
            if(options.isNotificationNeeded(listener)) {
                listener.notify();
            }
        }
    }

    #isValueDirty(value: unknown, initialValue: unknown) {
        return !isEqual(value, initialValue, this.#dirtyCheckNullAsDefault);
    }
}
