import { ValidationResult } from "./validationResult";
import { getValidationResultNode } from "./validationResultTree";
import { Severity, VALIDATION_RESULT, type AnyValidationResultTree, type AutoFieldPath, type MessageSeverity, type ValidationResultTree } from "../types";

export class SingleMessageResults<TData> {

    readonly tree: ValidationResultTree<TData> = {} as ValidationResultTree<TData>;

    isValid: boolean = true;

    setFormMessage(
        text: string,
        severity: MessageSeverity = Severity.Error,
    ) {
        return this.#setMessage("", text, severity);
    }

    setFieldMessage<TPath extends string>(name: AutoFieldPath<TData, TPath>, text: string, severity: MessageSeverity = Severity.Error) {
        return this.#setMessage(name, text, severity);
    }

    #setMessage(name: string, text: string, severity: MessageSeverity) {
        if(severity === Severity.Error) {
            this.isValid = false;
        }

        getValidationResultNode(this.tree as AnyValidationResultTree, name, true)![VALIDATION_RESULT] = new ValidationResult().set({
            text: text,
            severity: severity,
        });

        return this;
    }
}
