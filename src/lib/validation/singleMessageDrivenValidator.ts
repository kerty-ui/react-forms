import { ValidationResult } from "./validationResult";
import { getValidationResultNode } from "./validationResultTree";
import {
    Severity,
    VALIDATION_RESULT,
    type AnyValidationResultTree,
    type IValidator,
    type MessageSeverity,
    type ValidationResultTree,
    type ValidatorContext,
    type ValidatorMode,
    type AutoFieldPath,
} from "./../types";

type ValidateFn<TData> = (
    result: IValidationResultBuilder<TData>,
    ctx: Omit<ValidatorContext<TData>, "fieldName">
) => void;

interface IValidationResultBuilder<TData> {
    setFieldMessage: <TPath extends string>(name: AutoFieldPath<TData, TPath>, text: string, severity?: MessageSeverity) => void;
}

class ValidationResultBuilder<TData> implements IValidationResultBuilder<TData> {

    tree: AnyValidationResultTree = {};

    setFieldMessage<TPath extends string>(
        name: AutoFieldPath<TData, TPath>,
        text: string,
        severity: MessageSeverity = Severity.Error,
    ) {
        if(!name) {
            return;
        }

        getValidationResultNode(this.tree, name, true)![VALIDATION_RESULT] = new ValidationResult().add({
            text: text,
            severity: severity,
        });
    }
}

export class SingleMessageDrivenValidator<TData> implements IValidator<TData> {

    readonly #validate: ValidateFn<TData>;

    constructor(validate: ValidateFn<TData>) {
        this.mode = "messageDriven";
        this.#validate = validate;
    }

    mode: ValidatorMode;

    validate(ctx: ValidatorContext<TData>): ValidationResultTree<TData> {
        const builder = new ValidationResultBuilder<TData>();
        this.#validate(builder, ctx);
        return builder.tree as ValidationResultTree<TData>;
    }
}
