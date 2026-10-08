import { ValidationResult } from "./validationResult";
import { getFieldPath } from "../utils/getFieldPath";
import {
    VALIDATION_RESULT,
    type AnyValidationResultTree,
    type MessageSeverity,
    type IValidator,
    type ValidationResultTree,
    type ValidatorMode,
    type ValidatorContext,
    type ValidationContext,
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

type CompiledRules<TData> = {
    validations: IValidation<TData, any>[];
    runsForAnyChange: boolean;
};

type CompiledEntry<TData> = {
    propName: string;
    rules?: CompiledRules<TData>;
    node?: CompiledNode<TData>;
};

type CompiledNode<TData> = {
    isArray: boolean;
    entries: CompiledEntry<TData>[];
    hasAnyChangeRules: boolean;
};

type ValidationFrame<TData> = {
    ctx: ValidationContext<TData, any>;
    node: CompiledNode<TData>;
    matchedParts: number;
    parent: ValidationFrame<TData> | undefined;
    key: string | number;
    resultNode: AnyValidationResultTree | undefined;
};

function getFrameResultNode<TData>(frame: ValidationFrame<TData>): AnyValidationResultTree {
    if (frame.resultNode === undefined) {
        const parentNode = getFrameResultNode(frame.parent!);
        frame.resultNode = parentNode[frame.key] ??= frame.node.isArray ? [] : {};
    }
    return frame.resultNode!;
}

function setChildResult(parentNode: AnyValidationResultTree, key: string | number, value: unknown, result: ValidationResult) {
    const node: AnyValidationResultTree = parentNode[key] ??= Array.isArray(value) ? [] : {};
    node[VALIDATION_RESULT] = result;
}

const OFF_PATH = -1;

function compileEntry<TData>(propName: string, value: RawValidationsSchemaValue): CompiledEntry<TData> {
    if (value instanceof FieldValidations) {
        return {
            propName,
            rules: {
                validations: [...value.validations],
                runsForAnyChange: value.hasDependency || value.hasCondition,
            },
        };
    }

    return { propName, node: compileNode<TData>(value) };
}

function compileNode<TData>(schema: RawValidationsSchema | RawValidationsSchemaArray): CompiledNode<TData> {
    const entries: CompiledEntry<TData>[] = [];

    if (Array.isArray(schema)) {
        for (const item of schema) {
            if (item != null) {
                entries.push(compileEntry<TData>("", item));
            }
        }
    }
    else {
        for (const name in schema) {
            const value = schema[name];
            if (value != null) {
                entries.push(compileEntry<TData>(name.startsWith("_") ? name.slice(1) : name, value));
            }
        }
    }

    return {
        isArray: Array.isArray(schema),
        entries,
        hasAnyChangeRules: entries.some(entry => entry.rules?.runsForAnyChange || entry.node?.hasAnyChangeRules),
    };
}

/**
 * Validates form data against a {@link ValidationsSchema}. The schema is
 * compiled and copied at construction, so later changes to it or to its
 * {@link FieldValidations} don't affect the validator.
 */
export class Validator<TData = any> implements IValidator<TData> {

    readonly #root: CompiledNode<TData>;
    readonly #addMessageIfCheckIsTrue: boolean;

    constructor(validations: ValidationsSchema<NoInfer<TData>>, options?: ValidatorOptions) {
        this.#root = compileNode<TData>(validations as RawValidationsSchema);
        this.#addMessageIfCheckIsTrue = options?.addMessageWhenCheckIs ?? defaultValidatorOptions.addMessageWhenCheckIs;
    }

    readonly mode: ValidatorMode = "fieldDriven";

    validate (ctx: ValidatorContext<TData>): ValidationResultTree<TData> {

        const tree: AnyValidationResultTree = {};

        // Each frame tracks how many parts of the changed field's path it has matched.
        // Matching all of them means the frame is the changed field or inside it;
        // OFF_PATH means it is unrelated, so only rules that run for any change are visited.
        // Comparing path parts instead of field names also keeps the concatenated names
        // from being flattened by V8 on every visited field.
        const changedPath = ctx.fieldName != null
            ? getFieldPath(ctx.fieldName)
            : [];
        const recordEmptyResults = ctx.fieldName != null;

        const stack: ValidationFrame<TData>[] = [{
            ctx: {
                data: ctx.data,
                parent: undefined,
                parentContext: undefined,
                value: ctx.data,
                fieldName: "",
            },
            node: this.#root,
            matchedParts: 0,
            parent: undefined,
            key: "",
            resultNode: tree,
        }];

        while (stack.length > 0) {
            const frame = stack.pop()!;
            const { ctx: nodeCtx, node, matchedParts } = frame;

            if (node.isArray) {

                const items = nodeCtx.value as any[];

                const onPathIndex = matchedParts !== OFF_PATH
                    && matchedParts < changedPath.length
                    && changedPath[matchedParts].isArrayItem
                    ? Number(changedPath[matchedParts].name)
                    : -1;

                for (const entry of node.entries) {

                    const runsForAnyChange = entry.rules != null
                        ? entry.rules.runsForAnyChange
                        : entry.node!.hasAnyChangeRules;

                    const visitsAllItems = matchedParts === changedPath.length || runsForAnyChange;

                    if (!visitsAllItems && (onPathIndex < 0 || onPathIndex >= items.length)) {
                        continue;
                    }

                    const firstIndex = visitsAllItems ? 0 : onPathIndex;
                    const lastIndex = visitsAllItems ? items.length - 1 : onPathIndex;

                    if (entry.rules != null) {
                        for (let index = firstIndex; index <= lastIndex; index++) {
                            const value = items[index];
                            const result = this.#runValidations(
                                ctx.ruleSet,
                                {
                                    data: nodeCtx.data,
                                    parent: nodeCtx.parent,
                                    parentContext: nodeCtx,
                                    value,
                                    fieldName: `${nodeCtx.fieldName}[${index}]`,
                                },
                                entry.rules.validations);
                            if (result.messages.length > 0 || recordEmptyResults) {
                                setChildResult(getFrameResultNode(frame), index, value, result);
                            }
                        }

                        continue;
                    }

                    const childNode = entry.node!;

                    for (let index = lastIndex; index >= firstIndex; index--) {
                        const value = items[index];

                        if (childNode.isArray && !Array.isArray(value)) {
                            continue;
                        }

                        const itemFieldName = `${nodeCtx.fieldName}[${index}]`;

                        stack.push({
                            ctx: {
                                data: nodeCtx.data,
                                parent: nodeCtx.parent,
                                parentContext: nodeCtx,
                                value,
                                fieldName: childNode.isArray ? itemFieldName : itemFieldName + ".",
                            },
                            node: childNode,
                            matchedParts: matchedParts === changedPath.length
                                ? matchedParts
                                : index === onPathIndex ? matchedParts + 1 : OFF_PATH,
                            parent: frame,
                            key: index,
                            resultNode: undefined,
                        });
                    }
                }

                continue;
            }

            for (const entry of node.entries) {

                const entryMatchedParts = matchedParts === OFF_PATH || matchedParts === changedPath.length
                    ? matchedParts
                    : changedPath[matchedParts].name === entry.propName ? matchedParts + 1 : OFF_PATH;

                if (entry.rules != null) {
                    if (entryMatchedParts !== OFF_PATH || entry.rules.runsForAnyChange) {
                        const value = nodeCtx.value?.[entry.propName];
                        const result = this.#runValidations(
                            ctx.ruleSet,
                            {
                                data: nodeCtx.data,
                                parent: nodeCtx.value,
                                parentContext: nodeCtx,
                                value,
                                fieldName: nodeCtx.fieldName + entry.propName,
                            },
                            entry.rules.validations);
                        if (result.messages.length > 0 || recordEmptyResults) {
                            setChildResult(getFrameResultNode(frame), entry.propName, value, result);
                        }
                    }

                    continue;
                }

                const childNode = entry.node!;

                if (entryMatchedParts === OFF_PATH && !childNode.hasAnyChangeRules) {
                    continue;
                }

                const value = nodeCtx.value?.[entry.propName];

                if (childNode.isArray && !Array.isArray(value)) {
                    continue;
                }

                stack.push({
                    ctx: {
                        data: nodeCtx.data,
                        parent: nodeCtx.value,
                        parentContext: nodeCtx,
                        value,
                        fieldName: childNode.isArray
                            ? nodeCtx.fieldName + entry.propName
                            : nodeCtx.fieldName + entry.propName + ".",
                    },
                    node: childNode,
                    matchedParts: entryMatchedParts,
                    parent: frame,
                    key: entry.propName,
                    resultNode: undefined,
                });
            }
        }

        return tree as ValidationResultTree<TData>;
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
