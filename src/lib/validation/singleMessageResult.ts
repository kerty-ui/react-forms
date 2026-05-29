import { Severity, type IValidationResult, type MessageSeverity, type ValidationMessage } from "../types";

export class SingleMessageResult implements IValidationResult {

    readonly #severityMask: MessageSeverity;
    readonly messages: ValidationMessage[];

    constructor(text: string, severity?: MessageSeverity) {
        this.messages = [{ text: text, severity: severity ?? Severity.Error }];
        this.#severityMask = severity ?? Severity.Error;
    }

    has(severity: MessageSeverity): boolean {
        return severity === Severity.None
            ? this.#severityMask === Severity.None
            : (this.#severityMask & severity) === severity;
    }
}
