import { type ReactNode } from "react";
import { useFormValidationResult } from "../hooks/useFormValidationResult.ts";
import type { IKertyForm, IValidationResult } from "../types";

export const FormValidationResult = <TData,>(props: {
    form: IKertyForm<TData>;
    children: (validationResult: IValidationResult) => ReactNode;
}) => {
    const validationResult = useFormValidationResult(props.form);
    return validationResult ? props.children(validationResult) : null;
}
