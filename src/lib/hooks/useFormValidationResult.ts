import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { IKertyForm } from "../types";

export const useFormValidationResult = <TData,>(form: IKertyForm<TData>) => {
    const subscribe = useCallback((listener: any) => form.addListener(listener, {
        listenDataChange: false,
        listenStateChange: false,
        listenValidationChange: true,
    }), [form]);
    const getValidationResult = useMemo(() => () => form.getValidationResult(), [form]);
    return useSyncExternalStore(subscribe, getValidationResult);
}
