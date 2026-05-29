import { ValidationResult } from "./validationResult";
import { Severity, type FieldPath, type IValidationResult, type MessageSeverity } from "../types";

export class SingleMessageResults<TData> extends Map<string, IValidationResult> {

    isValid: boolean = true;

    setFormMessage(
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

        return this;
    }

    setFieldMessage(name: FieldPath<TData>, text: string, severity: MessageSeverity = Severity.Error) {
        if(severity === Severity.Error) {
            this.isValid = false;
        }

        this.set(name, new ValidationResult().set({
            text: text,
            severity: severity,
        }));

        return this;
    }
}
