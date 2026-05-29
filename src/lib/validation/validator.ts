import { ValidationResult } from "./validationResult";
import type {
    IValidationResult,
    MessageSeverity,
    IValidator,
    ValidatorMode,
    ValidatorContext,
    ValidationContext,
} from "./../types";

type RawValidationsSchemaValue =
    | FieldValidations
    | RawValidationsSchema
    | RawValidationsSchemaArray;

type RawValidationsSchemaArray = Array<RawValidationsSchemaValue>;

type RawValidationsSchema = {
    [key: `_${string}`]: FieldValidations;
    [key: string]: RawValidationsSchemaValue;
};

type Primitive = string | number | boolean | bigint | symbol | null | undefined | Date;

type TypedValidationsSchemaPropertyValue<TData, TValue> =
    | FieldValidations<TData, TValue>
    | (NonNullable<TValue> extends (infer U)[]
    ? TypedValidationsSchemaArrayItem<TData, U>[]
    : never)
    | (NonNullable<TValue> extends any[]
    ? never
    : NonNullable<TValue> extends object
        ? TypedValidationsSchema<TData, NonNullable<TValue>>
        : never);

type TypedValidationsSchemaArrayItem<TData, TItem> =
    | FieldValidations<TData, TItem>
    | (NonNullable<TItem> extends (infer U)[]
    ? TypedValidationsSchemaArrayItem<TData, U>[]
    : never)
    | (NonNullable<TItem> extends any[]
    ? never
    : NonNullable<TItem> extends object
        ? TypedValidationsSchema<TData, NonNullable<TItem>>
        : never);

type TypedValidationsSchema<TData, TModel> = {
    [K in keyof TModel & string as `_${K}`]?: FieldValidations<TData, TModel[K]>;
} & {
    [K in keyof TModel & string as NonNullable<TModel[K]> extends Primitive ? never : K]?: TypedValidationsSchemaPropertyValue<TData, TModel[K]>;
};

export type ValidationsSchema<TData = any, TModel = TData> =
    unknown extends TModel
        ? RawValidationsSchema
        : TypedValidationsSchema<TData, TModel>;

export type IValidation<TData, TValue> = {
    when?: (ctx: ValidationContext<TData, TValue>) => boolean;
    check: (ctx: ValidationContext<TData, TValue>) => boolean;
    message: string | ((ctx: ValidationContext<TData, TValue>) => string);
    severity?: MessageSeverity;
    stop?: boolean;
    ruleSet?: string;
    hasDependency?: boolean;
}

export type ValidatorOptions = {
    addMessageWhenCheckIs?: boolean;
}

export const defaultValidatorOptions = {
    addMessageWhenCheckIs: true,
} as Required<ValidatorOptions>;

export class Validator<TData = any> implements IValidator<TData> {

    readonly #validations: RawValidationsSchema;
    readonly #addMessageIfCheckIsTrue: boolean;

    constructor(validations: ValidationsSchema<NoInfer<TData>>, options?: ValidatorOptions) {
        this.#validations = validations as RawValidationsSchema;
        this.#addMessageIfCheckIsTrue = options?.addMessageWhenCheckIs ?? defaultValidatorOptions.addMessageWhenCheckIs;
    }

    mode: ValidatorMode = "fieldDriven";

    validate (ctx: ValidatorContext<TData>): Map<string, IValidationResult> {

        const validationsResult = new Map<string, ValidationResult>();

        this.#validateInternal(
            ctx.fieldName != null
                ? ctx.fieldName.replace(/\[.*?]/g, '[]')
                : undefined,
            ctx.ruleSet,
            {
                data: ctx.data,
                parent: undefined,
                value: ctx.data,
                fieldName: "",
            },
            this.#validations,
            validationsResult
        );

        return validationsResult;
    }

    #validateInternal (
        fieldName: string | undefined,
        ruleSet: string | null | undefined,
        ctx: ValidationContext<TData, any>,
        validations: RawValidationsSchema | RawValidationsSchemaArray,
        validationsResult: Map<string, ValidationResult>
    ) {

        const stack: Array<{
            ctx: ValidationContext<TData, any>;
            validations: RawValidationsSchema | RawValidationsSchemaArray;
        }> = [{ ctx, validations }];

        while (stack.length > 0) {
            const frame = stack.pop();

            if (frame == null) {
                continue;
            }

            const currentCtx = frame.ctx;
            const currentValidations = frame.validations;

            if (currentCtx.value == null || currentValidations == null) {
                continue;
            }

            if (Array.isArray(currentValidations)) {
                for(let vIndex = 0; vIndex < currentValidations.length; vIndex++) {
                    const childValidation = currentValidations[vIndex];
                    if(childValidation instanceof FieldValidations)
                    {
                        if(fieldName == null
                            || childValidation.hasDependency
                            || childValidation.hasCondition
                            || fieldName === `${currentCtx.fieldName}[]`) {

                            for (let index = 0; index < currentCtx.value.length; index++) {
                                const itemValidationContext = {
                                    data: currentCtx.data,
                                    parent: currentCtx.parent,
                                    value: currentCtx.value[index],
                                    fieldName: `${currentCtx.fieldName}[${index}]`,
                                } as ValidationContext<TData, any>;
                                const itemValidationResult = this.#runValidations(ruleSet, itemValidationContext, childValidation.validations);
                                if(itemValidationResult.messages.length > 0 || fieldName != null) {
                                    validationsResult.set(`${currentCtx.fieldName}[${index}]`, itemValidationResult);
                                }
                            }
                        }

                        continue;
                    }

                    if (Array.isArray(childValidation)) {
                        if (!Array.isArray(currentCtx.value)) {
                            continue;
                        }

                        for (let index = 0; index < currentCtx.value.length; index++) {
                            stack.push({
                                ctx: {
                                    data: currentCtx.data,
                                    parent: currentCtx.parent,
                                    value: currentCtx.value[index],
                                    fieldName: `${currentCtx.fieldName}[${index}]`,
                                },
                                validations: childValidation,
                            });
                        }

                        continue;
                    }

                    for (let index = currentCtx.value.length - 1; index >= 0; index--) {
                        stack.push({
                            ctx: {
                                data: currentCtx.data,
                                parent: currentCtx.parent,
                                value: currentCtx.value[index],
                                fieldName: `${currentCtx.fieldName}[${index}].`,
                            },
                            validations: childValidation,
                        });
                    }
                }

                continue;
            }

            for (const name in currentValidations) {
                const validation = currentValidations[name];

                let propName = name;
                if (name.startsWith("_")) {
                    propName = name.slice(1);
                }

                const validationContext = {
                    data: currentCtx.data,
                    parent: currentCtx.value,
                    value: currentCtx.value[propName],
                    fieldName: currentCtx.fieldName + propName,
                } as ValidationContext<TData, any>;

                if (validation instanceof FieldValidations) {

                    if(fieldName == null
                        || validation.hasDependency
                        || validation.hasCondition
                        || fieldName === validationContext.fieldName) {
                        const validationResult = this.#runValidations(ruleSet, validationContext, validation.validations);
                        if(validationResult.messages.length > 0 || fieldName != null) {
                            validationsResult.set(validationContext.fieldName, validationResult);
                        }
                    }
                    continue;
                }

                if (Array.isArray(validation) && Array.isArray(validationContext.value)) {
                    stack.push({
                        ctx: validationContext,
                        validations: validation,
                    });
                }
                else {
                    stack.push({
                        ctx: {
                            ...validationContext,
                            fieldName: validationContext.fieldName + ".",
                        },
                        validations: validation,
                    });
                }
            }
        }
    }

    #runValidations(
        ruleSet: string | null | undefined,
        ctx: ValidationContext<TData, any>,
        validations: IValidation<TData, any>[]) {
        const result = new ValidationResult();
        for (let validation of validations) {

            if(validation.ruleSet != null && validation.ruleSet !== ruleSet) {
                continue;
            }

            if(validation.when != null && !validation.when(ctx)) {
                continue;
            }

            // Skip when check result doesn't match the configured trigger value.
            // e.g. addMessageWhenCheckIs=true → skip if check returned false, and vice-versa.
            if (validation.check(ctx) !== this.#addMessageIfCheckIsTrue) {
                continue;
            }

            result.add({
                text: typeof validation.message === "function"
                    ? validation.message(ctx)
                    : validation.message,
                severity: validation.severity,
            });

            if (validation.stop) {
                break;
            }
        }
        return result;
    }
}

/**
 * Holds the list of {@link IValidation} rules for a single field and
 * pre-computed flags that the {@link Validator} uses to decide which rules
 * need to run during on-change validation.
 *
 * @typeParam TData - The top-level form data model.
 * @typeParam TValue - The type of the field these rules apply to.
 */
export class FieldValidations<TData = any, TValue = any> {

    validations: IValidation<TData, TValue>[] = [];

    /**
     * `true` if at least one rule in this set has `hasDependency: true`.
     * When set, the field is re-validated on every form change, not just
     * on changes to its own value.
     */
    hasDependency: boolean = false;

    /**
     * `true` if at least one rule in this set has a `when` condition.
     * When set, the field is always included in on-change re-validation
     * because the condition outcome may have changed.
     */
    hasCondition: boolean = false;

    constructor(validation?: IValidation<TData, TValue> | IValidation<TData, TValue>[]) {
        if(validation) {
            if (Array.isArray(validation)) {
                validation.forEach(this.add)
            }
            else {
                this.add(validation);
            }
        }
    }

    add = (validation: IValidation<TData, TValue>) => {

        if(validation.hasDependency) {
            this.hasDependency = true;
        }

        if(validation.when != null) {
            this.hasCondition = true;
        }

        this.validations.push(validation);
        return this;
    }
}
