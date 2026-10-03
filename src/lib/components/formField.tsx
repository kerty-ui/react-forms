import type { ReactNode } from "react";
import { useField, type UseField, type UseFieldProps } from "../hooks/useField";
import type { FieldPathValue, IKertyForm } from "./../types";

type FormFieldProps<TData, TPath extends string> = UseFieldProps<TData, TPath> & {
    children: (ctx: FormFieldContext<TData, TPath>) => ReactNode;
};

export type FormFieldContext<TData, TPath extends string> = {
    field: UseField<TData, TPath, FieldPathValue<TData, TPath>>;
    form: IKertyForm<TData>;
};

export const FormField = <TData, TPath extends string>(
    props: FormFieldProps<TData, TPath>,
) => {
    const [field, form] = useField(props);
    return props.children({ field: field, form: form });
};
