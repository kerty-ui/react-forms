import { useMemo } from "react";
import { useFieldWatch } from "./useFieldWatch.ts";
import { useFormContext } from "../contextProvider.tsx";
import type {
    ArrayItemType,
    AutoArrayFieldPath,
    AutoFieldPath,
    FieldListenerScope,
    FieldPathValue,
    FieldSnapshot,
    IKertyForm
} from "./../types";

export type UseArrayFieldProps<TData, TPath extends string> = {
    name: AutoArrayFieldPath<TData, TPath>;
    form?: IKertyForm<TData>;
    listen?: FieldListenerScope;
};

export type UseArrayField<TData, TPath extends string, TValue> = FieldSnapshot<TValue> & {
    setValue: (value: FieldPathValue<TData, TPath> | null | undefined, silent?: boolean) => void;
    prependItems(value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[], silent?: boolean): void;
    appendItems(value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[], silent?: boolean): void;
    insertItems(index: number, value: ArrayItemType<TData, TPath> | ArrayItemType<TData, TPath>[], silent?: boolean): void;
    removeItems(index: number | number[], silent?: boolean): void;
    swapItem(fromIndex: number, toIndex: number, silent?: boolean): void;
    moveItem(fromIndex: number, toIndex: number, silent?: boolean): void;
    updateItem(index: number, value: ArrayItemType<TData, TPath>, silent?: boolean): void;
    touch: () => void;
}

type UseArrayFieldHelpers<TData, TPath extends string> = Omit<UseArrayField<TData, TPath, unknown>, keyof FieldSnapshot<unknown>>;

export function useArrayField<TData, TPath extends string>(props: UseArrayFieldProps<TData, TPath>):
    [UseArrayField<TData, TPath, FieldPathValue<TData, TPath>>, form: IKertyForm<TData>] {
    const form = useFormContext(props.form);
    const name = props.name;
    const field = useFieldWatch(form, name as AutoFieldPath<TData, TPath>, props.listen);
    const fieldActions = useMemo<UseArrayFieldHelpers<TData, TPath>>(() => ({
        setValue: (value, silent) => {
            form.setFieldValue(name as AutoFieldPath<TData, TPath>, value, silent);
        },
        prependItems: (value, silent) => {
            form.prependItems<TPath>(name, value, silent);
        },
        appendItems: (value, silent) => {
            form.appendItems<TPath>(name, value, silent);
        },
        insertItems: (index, value, silent) => {
            form.insertItems<TPath>(name, index, value, silent);
        },
        removeItems: (index, silent) => {
            form.removeItems<TPath>(name, index, silent);
        },
        swapItem: (fromIndex, toIndex, silent) => {
            form.swapItem<TPath>(name, fromIndex, toIndex, silent);
        },
        moveItem: (fromIndex, toIndex, silent) => {
            form.moveItem<TPath>(name, fromIndex, toIndex, silent);
        },
        updateItem: (index, value, silent) => {
            form.updateItem<TPath>(name, index, value, silent);
        },
        touch: () => {
            form.touch(name as AutoFieldPath<TData, TPath>);
        },
    }), [form, name]);
    const result = useMemo(() => ({ ...field, ...fieldActions }), [field, fieldActions]);
    return [result, form];
}
