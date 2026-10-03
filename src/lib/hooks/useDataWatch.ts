import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { IKertyForm } from "../types";

export const useDataWatch = <TData,TValue,>(
    form: IKertyForm<TData>,
    getValue: (data: TData) => TValue
) : TValue => {
    const subscribe = useCallback(
        (listener: any) => form.addListener(listener, {
            listenDataChange: true,
            listenStateChange: false,
            listenValidationChange: false,
        }),
        [form]
    );
    const getDataSnapshot = useMemo(() => form.getDataSnapshot<TValue>(getValue), [form, getValue]);
    return useSyncExternalStore(subscribe, getDataSnapshot);
}
