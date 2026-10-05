import { useMemo } from "react";
import { useFieldWatch } from "./useFieldWatch.ts";
import { useFormContext } from "../contextProvider.tsx";
import type {
    AutoFieldPath,
    FieldListenerScope,
    FieldPathValue,
    FieldSnapshot,
    IKertyForm
} from "./../types";

export type UseFieldProps<TData, TPath extends string> = {
    name: AutoFieldPath<TData, TPath>;
    form?: IKertyForm<TData>;
    listen?: FieldListenerScope;
};

export type UseField<TData, TPath extends string, TValue> = FieldSnapshot<TValue> & {
    setValue: (value: FieldPathValue<TData, TPath> | null | undefined, silent?: boolean) => void;
    touch: () => void;
}

export function useField<TData, TPath extends string>(props: UseFieldProps<TData, TPath>):
    [UseField<TData, TPath, FieldPathValue<TData, TPath>>, form: IKertyForm<TData>] {
    const form = useFormContext(props.form);
    const name = props.name;
    const field = useFieldWatch(form, name, props.listen);
    const fieldActions = useMemo(() => ({
        setValue: (value: FieldPathValue<TData, TPath> | null | undefined, silent?: boolean) => {
            form.setFieldValue(name, value, silent);
        },
        touch: () => {
            form.touch(name);
        },
    }), [form, name]);
    const result = useMemo(() => ({ ...field, ...fieldActions }), [field, fieldActions]);
    return [result, form];
}
