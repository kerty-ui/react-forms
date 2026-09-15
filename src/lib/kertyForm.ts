import { getFieldPath } from "./utils/getFieldPath";
import { getObjectValue } from "./utils/getObjectValue";
import { isEqual } from "./utils/isEqual";
import { setObjectValueImmutable } from "./utils/setObjectValueImmutable";
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
} from "./types";

type NotifyListenerOptions = {
    formDataChanged?: boolean;
    formStateChanged?: boolean;
    formValidationChanged?: boolean;
    fieldValidationChanged?: boolean;
    affectedFields: Set<string>;
    changedField?: string;
}

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
    dirtyCheckEmptyStringAsNull: true,
    trackTouchOnValueChange: true,
    clearFormValidationResultsOnChange: true,
} as Required<FormConfig>

export class KertyForm<TData> implements IKertyForm<TData> {

    #dirtyCheckEnabled: boolean = true;
    #dirtyCheckEmptyStringAsNull: boolean = true;
    #trackTouchOnValueChange: boolean = true;
    #clearFormValidationResultsOnChange: boolean = true;

    #initialData: TData;
    #data: TData;
    #state: FormState;
    #validator: IValidator<TData> | undefined = undefined;
    #isMessageDrivenValidator: boolean = false;
    #validationResult?: IValidationResult;
    #ruleSet?: string | null;
    #descendantFieldCount: number = 0;

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
        if(config.dirtyCheckEmptyStringAsNull != null) {
            this.#dirtyCheckEmptyStringAsNull = config.dirtyCheckEmptyStringAsNull;
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
            listenFieldValidationChange: options?.listenFieldValidationChange ?? true,
            notify: listener,
        } as FormListener;
        this.#listeners.add(entry);
        return () => {
            this.#listeners.delete(entry);
        }
    }

    addFieldListener(name: FieldPath<TData>, listener: () => void) {

        const field = this.#getField(name as string);
        if(field.listenerCount === 0){
            this.#descendantFieldCount += 1;
        }

        field.listenerCount += 1;

        const entry = {
            fieldName: name as string,
            listenDataChange: false,
            listenStateChange: false,
            listenValidationChange: false,
            listenFieldValidationChange: false,
            notify: listener,
        } as FormListener;
        this.#listeners.add(entry);

        return () => {
            this.#listeners.delete(entry);

            field.listenerCount -= 1;
            if(field.listenerCount === 0) {
                this.#descendantFieldCount -= 1;

                this.#fields.delete(name as string);
                this.#invalidFields.delete(name as string);
                this.#dirtyFields.delete(name as string);

                const formIsValid = this.#isFormValid();
                const formIsDirty = this.#dirtyFields.size > 0;

                if(this.#state.isValid !== formIsValid || this.#state.isDirty !== formIsDirty) {
                    this.#state = {
                        ...this.#state,
                        isValid: formIsValid,
                        isDirty: formIsDirty,
                    };
                    for(const listener of this.#listeners) {
                        if(listener.listenStateChange) {
                            listener.notify();
                        }
                    }
                }
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
        const field = this.#fields.get(name as string);
        if(field == null) {
            return undefined;
        }

        return getObjectValue(this.#data, field.path);
    }

    getFieldState<TPath extends FieldPath<TData>>(name: TPath): FieldState {
        return this.#fields.get(name as string)?.state ?? {
            isTouched: false,
            isDirty: false,
            isValid: true,
            isValidated: false,
        };
    }

    setFieldValue<TValue>(name: FieldPathByValue<TData, TValue>, value: TValue | null | undefined, silent?: boolean): void;
    setFieldValue<TPath extends FieldPath<TData>>(name: TPath, value: FieldPathValue<TData, TPath> | null | undefined, silent?: boolean): void;
    setFieldValue(name: string, value: unknown, silent: boolean = false) {

        const field = this.#getField(name as string);

        this.#data = setObjectValueImmutable(this.#data, field.path, value);

        if(silent) {
            return;
        }

        this.#onFieldChange(name as string, field, value);
    }

    touch(name?: FieldPath<TData>) {

        const listenerOptions = {
            formDataChanged: undefined,
            formStateChanged: undefined,
            formValidationChanged: undefined,
            fieldValidationChanged: undefined,
            affectedFields: new Set<string>()
        } as NotifyListenerOptions;

        if(name != null) {

            let field = this.#fields.get(name);
            if(field == null || field.state.isTouched) {
                return;
            }

            field.state = {
                ...field.state,
                isTouched: true,
            }
            listenerOptions.affectedFields.add(name);
        }

        if(!this.#state.isTouched) {
            this.#state = {
                ...this.#state,
                isTouched: true,
            }
            listenerOptions.formStateChanged = true;
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
        this.#invalidFields.clear();

        const listenerOptions = {
            formDataChanged: undefined,
            formStateChanged: undefined,
            formValidationChanged: undefined,
            fieldValidationChanged: undefined,
            affectedFields: new Set<string>()
        } as NotifyListenerOptions;

        if(this.#validationResult != null) {
            this.#validationResult = undefined;
            listenerOptions.formValidationChanged = true;
        }

        for (let [fieldName, field] of this.#fields) {
            if(field.validationResult == null
                && field.state.isValid
                && !field.state.isValidated) {
                continue;
            }

            if(field.validationResult != null) {
                field.validationResult = undefined;
                listenerOptions.fieldValidationChanged = true;
            }

            field.state = {
                ...field.state,
                isValid: true,
                isValidated: false
            };
            listenerOptions.affectedFields.add(fieldName);
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
                    listenerOptions.formValidationChanged = true;

                    continue;
                }

                const field = this.#getField(fieldName);

                if(validationResult.messages.length > 0) {
                    field.validationResult = validationResult;
                    listenerOptions.fieldValidationChanged = true;
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
                listenerOptions.affectedFields.add(fieldName);
            }
        }

        const formIsValid = this.#isFormValid()

        if(this.#state.isValid != formIsValid || !this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: true,
            }
            listenerOptions.formStateChanged = true;
        }

        this.#notifyListeners(listenerOptions);

        return {
            isValid: this.#state.isValid,
            invalidFields: new Set<string>(this.#invalidFields),
        };
    }

    applyValidationResult(
        result: IValidationResult,
        options?: ApplyValidationOptions
    ): void {

        if(result == null || result.messages.length === 0) {
            return;
        }

        const listenerOptions = {
            formDataChanged: undefined,
            formStateChanged: undefined,
            formValidationChanged: true,
            fieldValidationChanged: undefined,
            affectedFields: new Set<string>()
        } as NotifyListenerOptions;

        const replaceValidations = options?.mode == null || options.mode === "replace";

        if(this.#validationResult != null && !replaceValidations) {
            this.#validationResult = new ValidationResult()
                .merge(this.#validationResult)
                .merge(result);
        }
        else {
            this.#validationResult = result;
        }

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid || !this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: true,
            };
            listenerOptions.formStateChanged = true;
        }

        this.#notifyListeners(listenerOptions);
    }

    applyFieldValidationResult(
        name: FieldPath<TData>,
        result: IValidationResult,
        options?: ApplyValidationOptions
    ): void {

        if(result == null || result.messages.length === 0) {
            return;
        }

        const field = this.#fields.get(name);
        if(field == null) {
            return;
        }

        const listenerOptions = {
            formDataChanged: undefined,
            formStateChanged: undefined,
            formValidationChanged: undefined,
            fieldValidationChanged: true,
            affectedFields: new Set<string>()
        } as NotifyListenerOptions;

        const replaceValidations = options?.mode == null || options.mode === "replace";

        if(field.validationResult != null && !replaceValidations) {
            field.validationResult = new ValidationResult()
                .merge(field.validationResult)
                .merge(result);
        }
        else {
            field.validationResult = result;
        }

        if (field.validationResult.has(Severity.Error)) {
            this.#invalidFields.add(name as string);
        }
        else {
            this.#invalidFields.delete(name as string);
        }

        field.state = {
            ...field.state,
            isValid: !field.validationResult.has(Severity.Error),
            isValidated: true,
        }
        listenerOptions.affectedFields.add(name);

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid || !this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: true,
            };
            listenerOptions.formStateChanged = true;
        }

        this.#notifyListeners(listenerOptions);
    }

    applyValidationResults(validationResults: Map<string, IValidationResult>, options?: ApplyValidationOptions) {

        if(validationResults == null) {
            return;
        }

        const listenerOptions = {
            formDataChanged: undefined,
            formStateChanged: undefined,
            formValidationChanged: undefined,
            fieldValidationChanged: undefined,
            affectedFields: new Set<string>()
        } as NotifyListenerOptions;

        const formValidationResult = new ValidationResult();

        const replaceValidations = options?.mode == null || options.mode === "replace";

        if(replaceValidations) {

            this.#invalidFields.clear();

            if(this.#validationResult != null) {
                this.#validationResult = undefined;
                listenerOptions.formValidationChanged = true;
            }

            for(let [fieldName, field] of this.#fields) {

                if(field.validationResult != null) {
                    field.validationResult = undefined;
                    listenerOptions.fieldValidationChanged = true;
                }

                if(field.state.isValid && field.state.isValidated) {
                    continue;
                }

                field.state = {
                    ...field.state,
                    isValid: true,
                    isValidated: true,
                };
                listenerOptions.affectedFields.add(fieldName);
            }
        }
        else if(validationResults.size === 0){
            return;
        }
        else if (this.#validationResult != null) {
            formValidationResult.merge(this.#validationResult);
        }

        for(let [fieldName, validationResult] of validationResults) {

            if(fieldName == null || fieldName === "") {

                if(validationResult.messages.length === 0) {
                    continue;
                }

                formValidationResult.merge(validationResult);
                listenerOptions.formValidationChanged = true;
                continue;
            }

            const field = this.#getField(fieldName);

            if(validationResult.messages.length === 0) {
                if(field.validationResult != null) {
                    field.validationResult = undefined;
                    listenerOptions.fieldValidationChanged = true;
                }

                field.state = {
                    ...field.state,
                    isValid: true,
                    isValidated: true,
                }
                this.#invalidFields.delete(fieldName);
            }
            else {
                if(field.validationResult == null) {
                    field.validationResult = validationResult;
                }
                else {
                    field.validationResult = new ValidationResult()
                        .merge(field.validationResult)
                        .merge(validationResult);
                }
                listenerOptions.fieldValidationChanged = true;

                field.state = {
                    ...field.state,
                    isValid: !field.validationResult.has(Severity.Error),
                    isValidated: true,
                }

                if (field.state.isValid) {
                    if (!replaceValidations) {
                        this.#invalidFields.delete(fieldName);
                    }
                } else {
                    this.#invalidFields.add(fieldName);
                }
            }

            listenerOptions.affectedFields.add(fieldName);
        }

        if(formValidationResult.messages.length > 0) {
            this.#validationResult = formValidationResult;
            listenerOptions.formValidationChanged = true;
        }

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid || !this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: true,
            }
            listenerOptions.formStateChanged = true;
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
        return this.#getField(name as string)?.validationResult;
    }

    getFieldValidationMessage(name: FieldPath<TData>) {
        return this.getFieldValidationResult(name)?.messages[0];
    }

    resetValidationResults(fields?: string | string[]): void {

        const listenerOptions = {
            formDataChanged: undefined,
            formStateChanged: undefined,
            formValidationChanged: undefined,
            fieldValidationChanged: undefined,
            affectedFields: new Set<string>()
        } as NotifyListenerOptions;

        if(fields == null) {
            if(this.#validationResult != null) {
                this.#validationResult = undefined;
                listenerOptions.formValidationChanged = true;
            }

            for(const [fieldName, field] of this.#fields) {
                if (field.validationResult == null
                    && field.state.isValid
                    && !field.state.isValidated) {
                    continue;
                }

                if(field.validationResult != null) {
                    field.validationResult = undefined;
                    listenerOptions.fieldValidationChanged = true;
                }

                field.state = {
                    ...field.state,
                    isValid: true,
                    isValidated: false,
                }
                listenerOptions.affectedFields.add(fieldName);
                this.#invalidFields.delete(fieldName);
            }
        }
        else if(Array.isArray(fields)) {
            for(const fieldName of fields) {
                this.#invalidFields.delete(fieldName);
                const field = this.#fields.get(fieldName);
                if(field == null) {
                    continue;
                }

                if(field.validationResult == null
                    && field.state.isValid
                    && !field.state.isValidated) {
                    continue;
                }

                if(field.validationResult != null) {
                    field.validationResult = undefined;
                    listenerOptions.fieldValidationChanged = true;
                }

                field.state = {
                    ...field.state,
                    isValid: true,
                    isValidated: false,
                }
                listenerOptions.affectedFields.add(fieldName);
            }
        }
        else {
            this.#invalidFields.delete(fields);
            const field = this.#fields.get(fields);
            if(field == null) {
                return;
            }

            if(field.validationResult == null
                && field.state.isValid
                && !field.state.isValidated) {
                return;
            }

            if(field.validationResult != null) {
                field.validationResult = undefined;
                listenerOptions.fieldValidationChanged = true;
            }

            field.state = {
                ...field.state,
                isValid: true,
                isValidated: false,
            }
            listenerOptions.affectedFields.add(fields);
        }

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid || this.#state.isValidated) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
                isValidated: false,
            };
            listenerOptions.formStateChanged = true;
        }

        this.#notifyListeners(listenerOptions);
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

        this.#onFieldChange(name as string, field, arrayValue);
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

        this.#onFieldChange(name as string, field, arrayValue);
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

        this.#onFieldChange(name as string, field, arrayValue);
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

        this.#onFieldChange(name as string, field, arrayValue);
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

        this.#onFieldChange(name as string, field, arrayValue);
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

        this.#onFieldChange(name as string, field, arrayValue);
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

        this.#onFieldChange(name as string, field, arrayValue);
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

    #onFieldChange(name: string, field: FieldInfo, value: unknown) {

        const listenerOptions = {
            formDataChanged: true,
            formStateChanged: undefined,
            formValidationChanged: undefined,
            fieldValidationChanged: undefined,
            affectedFields: new Set<string>()
        } as NotifyListenerOptions;

        listenerOptions.changedField = name;

        if(this.#clearFormValidationResultsOnChange && this.#validationResult != null) {
            this.#validationResult = undefined;
            listenerOptions.formValidationChanged = true;
        }

        if(this.#dirtyCheckEnabled) {

            const fieldIsDirty = !isEqual(
                value,
                getObjectValue(this.#initialData, field.path),
                this.#dirtyCheckEmptyStringAsNull);

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
                listenerOptions.formStateChanged = true;
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
                    listenerOptions.formStateChanged = true;
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
                        listenerOptions.fieldValidationChanged = true;

                        invalidField.state = {
                            ...invalidField.state,
                            isValid: true,
                            isValidated: true,
                        };
                        listenerOptions.affectedFields.add(invalidFieldName);
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

                const validationResults = this.#validator.validate({
                    fieldName: name,
                    data: this.#data,
                    ruleSet: this.#ruleSet,
                });

                for (let [fieldName, validationResult] of validationResults) {
                    const validatedField = this.#getField(fieldName);
                    if(validationResult.messages.length > 0) {
                        validatedField.validationResult = validationResult;
                        listenerOptions.fieldValidationChanged = true;
                    }
                    else if(validatedField.validationResult != null) {
                        validatedField.validationResult = undefined;
                        listenerOptions.fieldValidationChanged = true;
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
                    listenerOptions.affectedFields.add(fieldName);
                }
            }
        }
        else if(field.state.isValidated) {
            this.#invalidFields.delete(name);
            if(field.validationResult != null) {
                field.validationResult = undefined;
                listenerOptions.fieldValidationChanged = true;
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
                listenerOptions.formStateChanged = true;
            }
        }

        const formIsValid = this.#isFormValid();
        if(this.#state.isValid !== formIsValid) {
            this.#state = {
                ...this.#state,
                isValid: formIsValid,
            };
            listenerOptions.formStateChanged = true;
        }

        this.#notifyListeners(listenerOptions);
    }

    #notifyListeners(options: NotifyListenerOptions) {

        if(!options.formDataChanged
            && !options.formStateChanged
            && !options.formValidationChanged
            && !options.fieldValidationChanged
            && options.affectedFields.size === 0
            && options.changedField == null){
            return;
        }

        for(let listener of this.#listeners) {
            if((listener.listenDataChange && options.formDataChanged)
                || (listener.listenStateChange && options.formStateChanged)
                || (listener.listenValidationChange && options.formValidationChanged)
                || (listener.listenFieldValidationChange && options.fieldValidationChanged)) {
                listener.notify();
                continue;
            }

            if(listener.fieldName == null) {
                continue;
            }

            if (options.affectedFields.has(listener.fieldName)) {
                listener.notify();
                continue;
            }

            if(options.changedField == null) {
                continue;
            }

            if(listener.fieldName === options.changedField) {
                listener.notify();
                continue;
            }

            if(this.#descendantFieldCount > 0 && listener.fieldName.startsWith(options.changedField)) {
                const next = listener.fieldName[options.changedField.length];
                if(next === "." || next === "[") {
                    listener.notify();
                }
            }
        }
    }

    #isFormValid() {
        return this.#invalidFields.size == 0 && (this.#validationResult == null || !this.#validationResult.has(Severity.Error));
    }
}
