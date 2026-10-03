import { useFieldWatch } from "./useFieldWatch.ts";
import { useFormContext } from "../contextProvider.tsx";
import type { ArrayItemType, AutoArrayFieldPath, AutoFieldPath, FieldListenerScope,
    FieldPathValue, FieldSnapshot, IKertyForm } from "./../types";

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

export function useArrayField<TData, TPath extends string>(props: UseArrayFieldProps<TData, TPath>):
    [UseArrayField<TData, TPath, FieldPathValue<TData, TPath>>, form: IKertyForm<TData>] {
    const form = useFormContext(props.form);
    const name = props.name as AutoFieldPath<TData, TPath>;
    const field = useFieldWatch(form, name, props.listen);
    return [
        {
            ...field,
            setValue: (value, silent) => {
                form.setFieldValue(name, value, silent);
            },
            prependItems: (value, silent) => {
                form.prependItems<TPath>(props.name, value, silent);
            },
            appendItems: (value, silent) => {
                form.appendItems<TPath>(props.name, value, silent);
            },
            insertItems: (index, value, silent) => {
                form.insertItems<TPath>(props.name, index, value, silent);
            },
            removeItems: (index, silent) => {
                form.removeItems<TPath>(props.name, index, silent);
            },
            swapItem: (fromIndex, toIndex, silent) => {
                form.swapItem<TPath>(props.name, fromIndex, toIndex, silent);
            },
            moveItem: (fromIndex, toIndex, silent) => {
                form.moveItem<TPath>(props.name, fromIndex, toIndex, silent);
            },
            updateItem: (index, value, silent) => {
                form.updateItem<TPath>(props.name, index, value, silent);
            },
            touch: () => {
                form.touch(name);
            }
        },
        form
    ]
}
