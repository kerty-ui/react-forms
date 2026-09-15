import { ValidationResult } from "./validationResult";
import { Severity, type FieldPath, type IValidationResult, type MessageSeverity } from "../types";

export class MultiMessageResults<TData> extends Map<string, IValidationResult> {

    isValid: boolean = true;

    addFormMessage(
        text: string,
        severity: MessageSeverity = Severity.Error,
    ) {
        return this.#addMessage("", text, severity);
    }

    addFieldMessage(name: FieldPath<TData>, text: string, severity: MessageSeverity = Severity.Error) {
        return this.#addMessage(name, text, severity);
    }

    #addMessage(key: string, text: string, severity: MessageSeverity) {
        if(severity === Severity.Error) {
            this.isValid = false;
        }

        let validationResult = this.get(key) as ValidationResult;
        if(validationResult == null) {
            validationResult = new ValidationResult();
            this.set(key, validationResult);
        }

        validationResult.add({ text: text, severity: severity });

        return this;
    }
}
