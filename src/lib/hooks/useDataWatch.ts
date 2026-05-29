import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { IKertyForm } from "../types";

export const useDataWatch = <TDataModel,TValue,>(
    form: IKertyForm<TDataModel>,
    getValue: (data: TDataModel) => TValue
) : TValue => {
    const subscribe = useCallback(
        (listener: any) => form.addListener(listener, {
            listenDataChange: true,
            listenStateChange: false,
            listenValidationChange: false,
            listenFieldValidationChange: false,
        }),
        [form]
    );
    const getDataSnapshot = useMemo(() => form.getDataSnapshot<TValue>(getValue), [form]);
    return useSyncExternalStore(subscribe, getDataSnapshot);
}
