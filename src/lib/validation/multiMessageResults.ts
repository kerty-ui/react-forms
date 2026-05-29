import { ValidationResult } from "./validationResult";
import { Severity, type FieldPath, type IValidationResult, type MessageSeverity } from "../types";

export class MultiMessageResults<TData> extends Map<string, IValidationResult> {

    isValid: boolean = true;

    addFormMessage(
        text: string,
        severity: MessageSeverity = Severity.Error,
    ) {
        if(severity === Severity.Error) {
            this.isValid = false;
        }

        this.set("", new ValidationResult().add({
            text: text,
            severity: severity,
        }));


        let validationResult = this.get("") as ValidationResult;
        if(validationResult == null) {
            validationResult = new ValidationResult();
            this.set("", validationResult);
        }

        validationResult.add({ text: text, severity: severity });

        return this;
    }

    addFieldMessage(name: FieldPath<TData>, text: string, severity: MessageSeverity = Severity.Error) {
        if(severity === Severity.Error) {
            this.isValid = false;
        }

        let validationResult = this.get(name) as ValidationResult;
        if(validationResult == null) {
            validationResult = new ValidationResult();
            this.set(name, validationResult);
        }

        validationResult.add({ text: text, severity: severity });

        return this;
    }
}
