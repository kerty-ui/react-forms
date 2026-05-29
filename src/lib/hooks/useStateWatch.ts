import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { FormState, IKertyForm } from "../types";

export const useStateWatch = <TDataModel,TValue,>(
    form: IKertyForm<TDataModel>,
    getValue: (state: FormState) => TValue,
): TValue => {
    const subscribe = useCallback(
        (listener: any) => form.addListener(listener, {
            listenDataChange: false,
            listenStateChange: true,
            listenValidationChange: false,
            listenFieldValidationChange: false,
        }),
        [form]);
    const getStateSnapshot = useMemo(() => form.getStateSnapshot<TValue>(getValue), [form]);
    return useSyncExternalStore(subscribe, getStateSnapshot);
}
