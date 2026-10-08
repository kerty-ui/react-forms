import { ValidationResult } from "./validationResult";
import { getValidationResultNode } from "./validationResultTree";
import { Severity, VALIDATION_RESULT, type AnyValidationResultTree, type AutoFieldPath, type MessageSeverity, type ValidationResultTree } from "../types";

export class MultiMessageResults<TData> {

    readonly tree: ValidationResultTree<TData> = {} as ValidationResultTree<TData>;

    isValid: boolean = true;

    addFormMessage(
        text: string,
        severity: MessageSeverity = Severity.Error,
    ) {
        return this.#addMessage("", text, severity);
    }

    addFieldMessage<TPath extends string>(name: AutoFieldPath<TData, TPath>, text: string, severity: MessageSeverity = Severity.Error) {
        return this.#addMessage(name, text, severity);
    }

    #addMessage(name: string, text: string, severity: MessageSeverity) {
        if(severity === Severity.Error) {
            this.isValid = false;
        }

        const node = getValidationResultNode(this.tree as AnyValidationResultTree, name, true)!;
        let validationResult = node[VALIDATION_RESULT] as ValidationResult | undefined;
        if(validationResult == null) {
            validationResult = node[VALIDATION_RESULT] = new ValidationResult();
        }

        validationResult.add({ text: text, severity: severity });

        return this;
    }
}
