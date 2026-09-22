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
            ctx.fieldName,
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
        changedFieldPattern: string | undefined,
        changedFieldName: string | null | undefined,
        ruleSet: string | null | undefined,
        rootCtx: ValidationContext<TData, any>,
        rootValidations: RawValidationsSchema | RawValidationsSchemaArray,
        validationsResult: Map<string, ValidationResult>
    ) {

        const isFullDataValidation = changedFieldName == null;

        const stack: Array<{
            ctx: ValidationContext<TData, any>;
            pattern: string;
            validations: RawValidationsSchema | RawValidationsSchemaArray;
        }> = [{ ctx: rootCtx, pattern: "", validations: rootValidations }];

        while (stack.length > 0) {
            const { ctx, pattern, validations } = stack.pop()!;

            if (validations == null) {
                continue;
            }

            if (Array.isArray(validations)) {

                if (!Array.isArray(ctx.value)) {
                    continue;
                }

                const itemPattern = `${pattern}[]`;
                for(let vIndex = 0; vIndex < validations.length; vIndex++) {
                    const childValidation = validations[vIndex];
                    if(childValidation instanceof FieldValidations)
                    {
                        const runsForAnyChange = isFullDataValidation
                            || childValidation.hasDependency
                            || childValidation.hasCondition;

                        if(runsForAnyChange || changedFieldPattern === itemPattern) {

                            for (let index = 0; index < ctx.value.length; index++) {

                                const itemFieldName = `${ctx.fieldName}[${index}]`;

                                if(!runsForAnyChange && itemFieldName !== changedFieldName) {
                                    continue;
                                }

                                const itemValidationContext = {
                                    data: ctx.data,
                                    parent: ctx.parent,
                                    value: ctx.value[index],
                                    fieldName: itemFieldName,
                                } as ValidationContext<TData, any>;
                                const itemValidationResult = this.#runValidations(ruleSet, itemValidationContext, childValidation.validations);
                                if(itemValidationResult.messages.length > 0 || changedFieldPattern != null) {
                                    validationsResult.set(itemFieldName, itemValidationResult);
                                }
                            }
                        }

                        continue;
                    }

                    if (Array.isArray(childValidation)) {
                        for (let index = 0; index < ctx.value.length; index++) {
                            stack.push({
                                ctx: {
                                    data: ctx.data,
                                    parent: ctx.parent,
                                    value: ctx.value[index],
                                    fieldName: `${ctx.fieldName}[${index}]`,
                                },
                                pattern: itemPattern,
                                validations: childValidation,
                            });
                        }

                        continue;
                    }

                    for (let index = ctx.value.length - 1; index >= 0; index--) {
                        stack.push({
                            ctx: {
                                data: ctx.data,
                                parent: ctx.parent,
                                value: ctx.value[index],
                                fieldName: `${ctx.fieldName}[${index}].`,
                            },
                            pattern: `${itemPattern}.`,
                            validations: childValidation,
                        });
                    }
                }

                continue;
            }

            for (const name in validations) {
                const validation = validations[name];

                const propName = name.startsWith("_")
                    ? name.slice(1)
                    : name;

                const propValidationContext = {
                    data: ctx.data,
                    parent: ctx.value,
                    value: ctx.value?.[propName],
                    fieldName: ctx.fieldName + propName,
                } as ValidationContext<TData, any>;

                const propPattern = pattern + propName;

                if (validation instanceof FieldValidations) {

                    const runsForAnyChange = isFullDataValidation
                        || validation.hasDependency
                        || validation.hasCondition;

                    const isTheChangedField = changedFieldPattern === propPattern
                        && propValidationContext.fieldName === changedFieldName;

                    if(runsForAnyChange || isTheChangedField) {
                        const validationResult = this.#runValidations(ruleSet, propValidationContext, validation.validations);
                        if(validationResult.messages.length > 0 || changedFieldPattern != null) {
                            validationsResult.set(propValidationContext.fieldName, validationResult);
                        }
                    }
                    continue;
                }

                if (Array.isArray(validation) && Array.isArray(propValidationContext.value)) {
                    stack.push({
                        ctx: propValidationContext,
                        pattern: propPattern,
                        validations: validation,
                    });
                }
                else {
                    stack.push({
                        ctx: {
                            ...propValidationContext,
                            fieldName: propValidationContext.fieldName + ".",
                        },
                        pattern: `${propPattern}.`,
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
