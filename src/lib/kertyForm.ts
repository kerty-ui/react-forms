import { getFieldPath } from "./utils/getFieldPath";
import { getObjectValue } from "./utils/getObjectValue";
import { setObjectValueImmutable } from "./utils/setObjectValueImmutable";
import { removeObjectValueImmutable } from "./utils/removeObjectValueImmutable.ts";
import { isEqual } from "./utils/isEqual";
import { ValidationResult } from "./validation/validationResult";
import {
    Severity,
    type FieldPath,
    type FieldPathValue,
    type FieldPathByValue,
    type FieldState,
    type FieldSnapshot,
    type FieldInfo,
    type ArrayFieldPath,
    type ArrayItemType,
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
} from "./types";

const defaultFormState = {
    isTouched: false,
    isDirty: false,
    isValid: true,
    isValidated: false,
} as FormState;

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
} as Required<FormConfig>

export class KertyForm<TData extends ObjectData> implements IKertyForm<TData> {

    #dirtyCheckEnabled: boolean = true;
    #dirtyCheckNullAsDefault: boolean = true;
    #trackTouchOnValueChange: boolean = true;
    #clearFormValidationResultsOnChange: boolean = true;

    #initialData: TData;
    #data: TData;
    #state: FormState;
    #validator: IValidator<TData> | undefined = undefined;
    #isMessageDrivenValidator: boolean = false;
    #validationResult?: IValidationResult;
    #ruleSet?: string | null;

    #fields = new Map<string, FieldInfo>();
    #dirtyFields = new Set<string>();
    #invalidFields = new Set<string>();
    #listeners = new Set<FormListener>();

    constructor(options: FormOptions<TData>) {
        this.#initialData = options.data ?? {} as TData;
        this.#data = structuredClone(this.#initialData);
        this.#state = structuredClone(defaultFormState);
        this.setValidator(typeof options.validator === "function" ? options.validator() : options.validator);
        this.updateConfiguration({ ...defaultFormConfig, ...options });
    }

    updateConfiguration(config: FormConfig) {
        if(config == null) {
            return;
        }

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

    addFieldListener(name: FieldPath<TData>, listener: () => void) {

        const field = this.#getField(name as string);

        field.listenerCount += 1;

        const entry = {
            fieldName: name as string,
            listenDataChange: false,
            listenStateChange: false,
            listenValidationChange: false,
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

                this.#fields.delete(name as string);
                this.#invalidFields.delete(name as string);

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

        return () => {

            const field = this.#getField(name as string);

            const currentFieldValue = getObjectValue<TValue>(this.#data, field.path);
            if(prevFieldValue === currentFieldValue
                && prevFieldState === field.state
                && prevFieldValidationResult === field.validationResult) {
                return prevFieldSnapshot;
            }

            prevFieldValue = currentFieldValue;
            prevFieldState = field.state;
            prevFieldValidationResult = field.validationResult;
            prevFieldSnapshot = {
                ...field.state,
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
        return this.#getField(name as string).state;
    }

    setFieldValue<TValue>(name: FieldPathByValue<TData, TValue>, value: TValue | null | undefined, silent?: boolean): void;
    setFieldValue<TPath extends FieldPath<TData>>(name: TPath, value: FieldPathValue<TData, TPath> | null | undefined, silent?: boolean): void;
    setFieldValue(name: string, value: unknown, silent: boolean = false) {

        const field = this.#getField(name as string);

        this.#data = setObjectValueImmutable(this.#data, field.path, value);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(name as string, field, value);
    }

    clearFieldValue<TPath extends FieldPath<TData>>(name: TPath | TPath[], silent?: boolean) {
        const fieldNames = Array.isArray(name) ? name : [name];
        for(const fieldName of fieldNames) {
            const field = this.#getField(fieldName as string);
            this.#data = setObjectValueImmutable(this.#data, field.path, undefined);
            if(!silent) {
                this.#onFieldValueChange(fieldName as string, field, undefined);
            }
        }
    }

    removeFieldValue<TPath extends FieldPath<TData>>(name: TPath | TPath[], silent?: boolean) {
        const fieldNames = Array.isArray(name) ? name : [name];
        for(const fieldName of fieldNames) {
            const field = this.#getField(fieldName as string);
            this.#data = removeObjectValueImmutable(this.#data, field.path);
            if(!silent) {
                this.#onFieldValueChange(fieldName as string, field, undefined);
            }
        }
    }

    touch(name?: FieldPath<TData>) {

        const listenerOptions = new NotifyListenerOptions();

        if(name != null) {
            const field = this.#getField(name as string);
            if(!field.state.isTouched) {
                field.state = {
                    ...field.state,
                    isTouched: true,
                }
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
        this.#dirtyFields.clear();
        this.#invalidFields.clear();
        this.#validationResult = undefined;

        if(data != null) {
            this.#initialData = data;
            this.#data = structuredClone(data);
        }
        else {
            this.#data = structuredClone(this.#initialData);
        }

        this.#state = {...defaultFormState};

        this.#fields.forEach(field => {
            field.validationResult = undefined;
            field.state = {
                isTouched: false,
                isDirty: false,
                isValid: true,
                isValidated: false,
            };
        });

        for (let listener of this.#listeners) {
            listener.notify();
        }
    }

    setValidator(validator: IValidator<TData> | undefined) {
        if(validator == null) {
            return;
        }

        this.#validator = validator;
        this.#isMessageDrivenValidator = this.#validator != null && this.#validator.mode === "messageDriven";
    }

    validate(ruleSet?: string | null) {

        this.#ruleSet = ruleSet;

        const listenerOptions = new NotifyListenerOptions();

        if(this.#validationResult != null) {
            this.#validationResult = undefined;
            listenerOptions.formValidationChanged();
        }

        for (let [fieldName, field] of this.#fields) {
            if(field.validationResult == null && field.state.isValid && !field.state.isValidated) {
                continue;
            }

            field.validationResult = undefined;
            field.state = {
                ...field.state,
                isValid: true,
                isValidated: false
            };

            listenerOptions.formValidationChanged();
            listenerOptions.addAffectedField(fieldName);
            this.#invalidFields.delete(fieldName);
        }

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

                if(validationResult.messages.length > 0) {
                    field.validationResult = validationResult;
                    listenerOptions.formValidationChanged();
                }

                const fieldHasError = validationResult.has(Severity.Error);
                if (fieldHasError) {
                    this.#invalidFields.add(fieldName);
                }

                field.state = {
                    ...field.state,
                    isValid: !fieldHasError,
                    isValidated: true,
                }
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
            invalidFields: new Set<string>(this.#invalidFields),
        };
    }

    applyValidationResult(result: IValidationResult, options?: ApplyValidationOptions): void {
        this.applyValidationResults(new Map<string, IValidationResult>([["", result]]), options);
    }

    applyFieldValidationResult(
        name: FieldPath<TData>,
        result: IValidationResult,
        options?: ApplyValidationOptions) {
        this.applyValidationResults(new Map<string, IValidationResult>([[name, result]]), options);
    }

    applyValidationResults(validationResults: Map<string, IValidationResult>, options?: ApplyValidationOptions) {

        if(validationResults == null) {
            return;
        }

        const listenerOptions = new NotifyListenerOptions();

        const formValidationResult = new ValidationResult();

        const mode = options?.mode ?? "patch";
        const ignoreUnknownFields = options?.unknownFieldBehavior === "ignore";

        if(mode === "replace") {
            this.#invalidFields.clear();

            if(this.#validationResult != null) {
                this.#validationResult = undefined;
                listenerOptions.formValidationChanged();
            }

            for(let [fieldName, field] of this.#fields) {
                if(field.validationResult == null
                    && (field.state.isValid && field.state.isValidated)) {
                    continue;
                }
                field.validationResult = undefined;
                field.state = {
                    ...field.state,
                    isValid: true,
                    isValidated: true,
                };
                listenerOptions.formValidationChanged();
                listenerOptions.addAffectedField(fieldName);
            }
        }
        else {
            if(validationResults.size === 0){
                return;
            }

            if (this.#validationResult != null) {
                formValidationResult.merge(this.#validationResult);
            }
        }

        for(let [fieldName, validationResult] of validationResults) {

            if(fieldName == null || fieldName === "") {
                if(mode === "patch") {
                    formValidationResult.replace(validationResult);
                }
                else {
                    formValidationResult.merge(validationResult);
                }
                continue;
            }

            const field = ignoreUnknownFields
                ? this.#fields.get(fieldName)
                : this.#getField(fieldName);

            if(field == null) {
                continue;
            }

            const fieldValidationResult = new ValidationResult();
            if(mode === "merge") {
                fieldValidationResult.merge(field.validationResult);
            }

            fieldValidationResult.merge(validationResult);

            if(validationResult.messages.length === 0) {
                if(field.validationResult == null ||
                    (field.state.isValid && field.state.isValidated)) {
                    continue;
                }

                field.validationResult = undefined;
                field.state = {
                    ...field.state,
                    isValid: true,
                    isValidated: true,
                }
                this.#invalidFields.delete(fieldName);
                listenerOptions.addAffectedField(fieldName);
            }
            else {
                field.validationResult = fieldValidationResult;
                field.state = {
                    ...field.state,
                    isValid: !fieldValidationResult.has(Severity.Error),
                    isValidated: true,
                }

                if (field.state.isValid) {
                    this.#invalidFields.delete(fieldName);
                } else {
                    this.#invalidFields.add(fieldName);
                }
                listenerOptions.addAffectedField(fieldName);
            }
        }

        if(formValidationResult.messages.length > 0) {
            this.#validationResult = formValidationResult;
            listenerOptions.formValidationChanged();
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

        for(const [fieldName, field] of this.#fields) {
            if (field.validationResult == null && field.state.isValid && !field.state.isValidated) {
                continue;
            }

            field.validationResult = undefined;
            field.state = {
                ...field.state,
                isValid: true,
                isValidated: false,
            }

            listenerOptions.formValidationChanged();
            listenerOptions.addAffectedField(fieldName);
            this.#invalidFields.delete(fieldName);
        }

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid || this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: false,
            };
            listenerOptions.formValidationChanged();
        }

        this.#notifyListeners(listenerOptions);
    }

    resetFieldValidationResults<TPath extends FieldPath<TData>>(name: TPath | TPath[]) {

        const listenerOptions = new NotifyListenerOptions();

        const fieldNames = Array.isArray(name) ? name : [name];
        for(const fieldName of fieldNames) {
            const field = this.#fields.get(fieldName);
            if(field == null || (field.validationResult == null && field.state.isValid && !field.state.isValidated)) {
                continue;
            }

            field.validationResult = undefined;
            field.state = {
                ...field.state,
                isValid: true,
                isValidated: false,
            }
            listenerOptions.formValidationChanged();
            listenerOptions.addAffectedField(fieldName);
            this.#invalidFields.delete(fieldName);
        }

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid || this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: false,
            };
            listenerOptions.formValidationChanged();
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
        return this.#fields.get(name as string)?.validationResult;
    }

    getFieldValidationMessage(name: FieldPath<TData>) {
        return this.getFieldValidationResult(name)?.messages[0];
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

        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(name as string, field, arrayValue);
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

        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(name as string, field, arrayValue);
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

        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(name as string, field, arrayValue);
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

        const arrayValue = [...currentValue];
        if(Array.isArray(index)) {
            index
                .sort((a, b) => b - a)
                .forEach((i) => {
                    arrayValue.splice(i, 1);
                });
        }
        else {
            arrayValue.splice(index, 1);
        }

        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        if(silent) {
            return;
        }

        const clearFields = [];
        if(arrayValue.length === 0) {
            clearFields.push(name as string);
        }
        else {
            for (const i of (Array.isArray(index) ? index : [index])) {
                clearFields.push(`${name}[${i}]`);
            }
        }

        if(clearFields.length > 0) {
            clearFields.forEach((fieldName) => {
                for (const [key, field] of this.#fields) {
                    if (key.startsWith(fieldName)) {
                        field.validationResult = undefined;
                    }
                }
                for (const field of this.#invalidFields) {
                    if (field.startsWith(fieldName)) {
                        this.#invalidFields.delete(field);
                    }
                }
            });
        }

        this.#onFieldValueChange(name as string, field, arrayValue);
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

        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(name as string, field, arrayValue);
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

        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(name as string, field, arrayValue);
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

        this.#data = setObjectValueImmutable(this.#data, field.path, arrayValue);

        if(silent) {
            return;
        }

        this.#onFieldValueChange(name as string, field, arrayValue);
    }

    #getField(name: string): FieldInfo {
        let field = this.#fields.get(name);
        if(field == null) {
            field = {
                path: getFieldPath(name),
                state: {
                    isTouched: false,
                    isDirty: false,
                    isValid: true,
                    isValidated: false,
                },
                listenerCount: 0,
            };

            this.#fields.set(name, field);
        }
        return field;
    }

    #onFieldValueChange(name: string, field: FieldInfo, value: unknown) {

        const listenerOptions = new NotifyListenerOptions();

        listenerOptions.formDataChanged();
        listenerOptions.addChangedField(name);

        if(this.#clearFormValidationResultsOnChange && this.#validationResult != null) {
            this.#validationResult = undefined;
            listenerOptions.formValidationChanged();
        }

        if(this.#dirtyCheckEnabled) {

            const fieldIsDirty = !isEqual(
                value,
                getObjectValue(this.#initialData, field.path),
                this.#dirtyCheckNullAsDefault);

            if(fieldIsDirty) {
                this.#dirtyFields.add(name);
            }
            else {
                this.#dirtyFields.delete(name);
            }

            if(field.state.isDirty !== fieldIsDirty) {
                field.state = {
                    ...field.state,
                    isDirty: fieldIsDirty,
                }
            }

            const formIsDirty = this.#dirtyFields.size > 0;
            if(this.#state.isDirty !== formIsDirty) {
                this.#state = {
                    ...this.#state,
                    isDirty: formIsDirty,
                };
                listenerOptions.formStateChanged();
            }
        }

        if(this.#trackTouchOnValueChange) {
            if(!field.state.isTouched) {
                field.state = {
                    ...field.state,
                    isTouched: true,
                }
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
            if(field.state.isValidated || this.#state.isValidated) {
                if (this.#isMessageDrivenValidator) {
                    for (const invalidFieldName of this.#invalidFields) {
                        const invalidField = this.#fields.get(invalidFieldName);
                        if (invalidField == null) {
                            continue;
                        }

                        invalidField.validationResult = undefined;

                        invalidField.state = {
                            ...invalidField.state,
                            isValid: true,
                            isValidated: true,
                        };
                        listenerOptions.formValidationChanged();
                        listenerOptions.addAffectedField(invalidFieldName);
                    }
                    this.#invalidFields.clear();
                } else if(!field.state.isValid) {
                    field.state = {
                        ...field.state,
                        isValid: true,
                    };
                    field.validationResult = undefined;
                    this.#invalidFields.delete(name);
                }

                this.#validateField(name, listenerOptions);
            }
        }
        else if(field.state.isValidated) {
            this.#invalidFields.delete(name);
            if(field.validationResult != null) {
                field.validationResult = undefined;
                listenerOptions.formValidationChanged();
            }

            if(!field.state.isValid || field.state.isValidated) {
                field.state = {
                    ...field.state,
                    isValid: true,
                    isValidated: false,
                }
            }

            if(this.#state.isValidated) {
                this.#state = {
                    ...this.#state,
                    isValidated: false,
                }
                listenerOptions.formStateChanged();
            }
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
            const validatedField = this.#getField(fieldName);
            if(validationResult.messages.length > 0) {
                validatedField.validationResult = validationResult;
            }
            else if(validatedField.validationResult != null) {
                validatedField.validationResult = undefined;
            }

            const validatedFieldIsValid = !validationResult.has(Severity.Error);
            if (validatedFieldIsValid) {
                this.#invalidFields.delete(fieldName);
            }
            else {
                this.#invalidFields.add(fieldName);
            }

            validatedField.state = {
                ...validatedField.state,
                isValid: validatedFieldIsValid,
                isValidated: true,
            }

            listenerOptions.formValidationChanged();
            listenerOptions.addAffectedField(fieldName);
        }
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

    #isFormValid() {
        return this.#invalidFields.size == 0 && (this.#validationResult == null || !this.#validationResult.has(Severity.Error));
    }
}

class NotifyListenerOptions {

    #formDataChanged: boolean = false;
    #formStateChanged: boolean = false;
    #formValidationChanged: boolean = false;
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

    addAffectedField(fieldName: string) {
        this.#affectedFields.add(fieldName);
    }

    addChangedField(fieldName: string) {
        this.#changedFields.push({
            name: fieldName,
            parentNameLength: Math.max(fieldName.lastIndexOf("."), fieldName.lastIndexOf("["))
        });
    }

    hasChanged() {
        return this.#formDataChanged
            || this.#formStateChanged
            || this.#formValidationChanged
            || this.#affectedFields.size > 0
            || this.#changedFields.length > 0;
    }

    isNotificationNeeded(listener: FormListenerOptions) {
        if((listener.listenDataChange && this.#formDataChanged)
            || (listener.listenStateChange && this.#formStateChanged)
            || (listener.listenValidationChange && this.#formValidationChanged)) {
            return true;
        }

        if(listener.fieldName == null) {
            return false;
        }

        if(this.#affectedFields.has(listener.fieldName)) {
            return true;
        }

        const listenerFieldNameLength = listener.fieldName.length;

        for(const changedField of this.#changedFields) {
            const changedFieldNameLength = changedField.name.length;
            if(listenerFieldNameLength === changedFieldNameLength) {
                if(listener.fieldName === changedField.name) {
                    return true;
                }
            }
            else if(listenerFieldNameLength === changedField.parentNameLength) {
                if(changedField.name.startsWith(listener.fieldName)) {
                    return true;
                }
            }
            else if(listenerFieldNameLength > changedFieldNameLength) {
                if(listener.fieldName.startsWith(changedField.name)) {
                    const next = listener.fieldName[changedFieldNameLength];
                    if(next === "." || next === "[") {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
