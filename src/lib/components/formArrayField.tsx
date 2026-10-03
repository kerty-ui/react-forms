import type { ReactNode } from "react";
import { useArrayField, type UseArrayField, type UseArrayFieldProps } from "../hooks/useArrayField";
import type { FieldPathValue, IKertyForm } from "./../types";

type FormArrayFieldProps<TData, TPath extends string> = UseArrayFieldProps<TData, TPath> & {
    children: (ctx: FormArrayFieldContext<TData, TPath>) => ReactNode;
};

export type FormArrayFieldContext<TData, TPath extends string> = {
    field: UseArrayField<TData, TPath, FieldPathValue<TData, TPath>>;
    form: IKertyForm<TData>;
};

export const FormArrayField = <TData, TPath extends string>(
    props: FormArrayFieldProps<TData, TPath>,
) => {
    const [field, form] = useArrayField(props);
    return props.children({
        field: field,
        form: form,
    });
};
