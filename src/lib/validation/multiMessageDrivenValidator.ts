import { ValidationResult } from "./validationResult";
import {
    Severity,
    type IValidationResult,
    type IValidator,
    type MessageSeverity,
    type ValidatorContext,
    type ValidatorMode,
    type AutoFieldPath,
} from "./../types";

type ValidateFn<TData> = (
    result: IValidationResultBuilder<TData>,
    ctx: Omit<ValidatorContext<TData>, "fieldName">
) => void;

interface IValidationResultBuilder<TData> {
    addFieldMessage: <TPath extends string>(name: AutoFieldPath<TData, TPath>, text: string, severity?: MessageSeverity) => IValidationResultBuilder<TData>;
}

class ValidationResultBuilder<TData> implements IValidationResultBuilder<TData> {

    validationResult = new Map<string, ValidationResult>();

    addFieldMessage<TPath extends string>(
        name: AutoFieldPath<TData, TPath>,
        text: string,
        severity: MessageSeverity = Severity.Error,
    ) {
        if(!name) {
            return this;
        }

        let validationResult = this.validationResult.get(name);
        if(validationResult == null) {
            validationResult = new ValidationResult();
            this.validationResult.set(name, validationResult);
        }

        validationResult.add({ text: text, severity: severity });

        return this;
    }
}

export class MultiMessageDrivenValidator<TData> implements IValidator<TData> {

    readonly #validate: ValidateFn<TData>;

    constructor(validate: ValidateFn<TData>) {
        this.mode = "messageDriven";
        this.#validate = validate;
    }

    mode: ValidatorMode;

    validate(ctx: ValidatorContext<TData>): Map<string, IValidationResult> {
        const builder = new ValidationResultBuilder<TData>();
        this.#validate(builder, ctx);
        return builder.validationResult;
    }
}
