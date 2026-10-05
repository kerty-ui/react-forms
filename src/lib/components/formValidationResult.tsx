import { type ReactNode } from "react";
import { useFormValidationResult } from "../hooks/useFormValidationResult.ts";
import type { IKertyForm, IValidationResult } from "../types";
import { useFormContext } from "../contextProvider.tsx";

export const FormValidationResult = <TData,>(props: {
    form?: IKertyForm<TData>;
    children: (validationResult: IValidationResult) => ReactNode;
}) => {
    const form = useFormContext(props.form);
    const validationResult = useFormValidationResult(form);
    return validationResult ? props.children(validationResult) : null;
}
