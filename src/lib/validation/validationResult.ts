import { Severity, type IValidationResult, type MessageSeverity, type ValidationMessage } from "./../types";

const EMPTY_MESSAGES: readonly ValidationMessage[] = Object.freeze([]);

export class ValidationResult implements IValidationResult {
    #severityMask: MessageSeverity = Severity.None;
    messages: readonly ValidationMessage[] = EMPTY_MESSAGES;

    set(message: ValidationMessage): ValidationResult {
        this.messages = [message];
        this.#severityMask = message.severity ?? Severity.Error;

        return this;
    }

    add(message: ValidationMessage): ValidationResult {
        this.#severityMask |= message.severity ?? Severity.Error;

        if (this.messages === EMPTY_MESSAGES) {
            this.messages = [message];
        } else {
            (this.messages as ValidationMessage[]).push(message);
        }

        return this;
    }

    has(severity: MessageSeverity): boolean {
        return severity === Severity.None
            ? this.#severityMask === Severity.None
            : (this.#severityMask & severity) === severity;
    }

    merge(result: IValidationResult): ValidationResult {
        if (result == null || result.messages.length === 0) {
            return this;
        }

        for (const m of result.messages) {
            this.add(m);
        }

        return this;
    }
}
