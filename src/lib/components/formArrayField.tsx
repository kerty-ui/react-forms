import type { ReactNode } from "react";
import { useField } from "../hooks/useField";
import type { ArrayFieldPath, ArrayItemType, FieldPath, FieldPathValue, FieldSnapshot, IKertyForm } from "./../types";

type FormArrayFieldName<TData> = ArrayFieldPath<TData> & FieldPath<TData>;

type FormArrayFieldProps<TData, TName extends FormArrayFieldName<TData>> = {
    form: IKertyForm<TData>;
    name: TName;
    children: (ctx: FormArrayFieldContext<TData, TName>) => ReactNode;
};

export type FormArrayFieldContext<TData, TName extends FormArrayFieldName<TData>> = {
    field: FieldSnapshot<FieldPathValue<TData, TName>>;
    setFieldValue: (value: FieldPathValue<TData, TName>, silent?: boolean) => void;
    prependItems(
        value: ArrayItemType<TData, TName> | ArrayItemType<TData, TName>[],
        silent?: boolean
    ): void;
    appendItems(
        value: ArrayItemType<TData, TName> | ArrayItemType<TData, TName>[],
        silent?: boolean
    ): void;
    insertItems(
        index: number,
        value: ArrayItemType<TData, TName> | ArrayItemType<TData, TName>[],
        silent?: boolean
    ): void;
    removeItems(
        index: number | number[],
        silent?: boolean
    ): void;
    swapItem(
        fromIndex: number,
        toIndex: number,
        silent?: boolean
    ): void;
    moveItem(
        fromIndex: number,
        toIndex: number,
        silent?: boolean
    ): void;
    updateItem(
        index: number,
        value: ArrayItemType<TData, TName>,
        silent?: boolean
    ): void;
    touchField: () => void;
};

export const FormArrayField = <TData, TName extends FormArrayFieldName<TData>>(
    props: FormArrayFieldProps<TData, TName>,
) => {
    const field = useField<FieldPathValue<TData, TName>>(
        props.form,
        props.name,
    );
    return props.children({
        field,
        setFieldValue: (value, silent) => props.form.setFieldValue(props.name, value, silent),
        prependItems: (value, silent) => props.form.prependItems(props.name, value, silent),
        appendItems: (value, silent) => props.form.appendItems(props.name, value, silent),
        insertItems: (index, value, silent) => props.form.insertItems(props.name, index, value, silent),
        removeItems: (index, silent) => props.form.removeItems(props.name, index, silent),
        swapItem: (fromIndex, toIndex, silent) => props.form.swapItem(props.name, fromIndex, toIndex, silent),
        moveItem: (fromIndex, toIndex, silent) => props.form.moveItem(props.name, fromIndex, toIndex, silent),
        updateItem: (index, value, silent) => props.form.updateItem(props.name, index, value, silent),
        touchField: () => props.form.touch(props.name),
    });
};
