import type { ReactNode } from "react";
import { useField } from "../hooks/useField";
import type { FieldPath, FieldPathValue, FieldSnapshot, IKertyForm } from "./../types";

type FormFieldProps<TData, TName extends FieldPath<TData>> = {
    form: IKertyForm<TData>;
    name: TName;
    children: (ctx: FormFieldContext<TData, TName>) => ReactNode;
};

export type FormFieldContext<TData, TName extends FieldPath<TData>> = {
    field: FieldSnapshot<FieldPathValue<TData, TName>>;
    setFieldValue: (value: FieldPathValue<TData, TName>) => void;
    touchField: () => void;
};

export const FormField = <TData, TName extends FieldPath<TData>>(
    props: FormFieldProps<TData, TName>,
) => {
    const field = useField<FieldPathValue<TData, TName>>(
        props.form,
        props.name,
    );

    return props.children({
        field,
        setFieldValue: (value) => props.form.setFieldValue(props.name, value),
        touchField: () => props.form.touch(props.name),
    });
};
