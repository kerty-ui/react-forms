import { ValidationResult } from "./validationResult";
import {
    Severity,
    type IValidationResult,
    type IValidator,
    type MessageSeverity,
    type ValidatorContext,
    type ValidatorMode,
    type FieldPath,
} from "./../types";

type ValidateFn<TData> = (
    result: IValidationResultBuilder<TData>,
    ctx: Omit<ValidatorContext<TData>, "fieldName">
) => void;

interface IValidationResultBuilder<TData> {
    setFieldMessage: (name: FieldPath<TData>, text: string, severity?: MessageSeverity) => void;
}

class ValidationResultBuilder<TData> implements IValidationResultBuilder<TData> {

    validationResult = new Map<string, IValidationResult>();

    setFieldMessage(
        name: FieldPath<TData>,
        text: string,
        severity: MessageSeverity = Severity.Error,
    ) {
        if(!name) {
            return;
        }

        this.validationResult.set(name, new ValidationResult().add({
            text: text,
            severity: severity,
        }));
    }
}

export class SingleMessageDrivenValidator<TData> implements IValidator<TData> {

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
