import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { IKertyForm } from "../types";

type DataWatchCache<TData, TValue> = {
    hasValue: boolean;
    data: TData | undefined;
    getValue: ((data: TData) => TValue) | undefined;
    value: TValue | undefined;
};

export const useDataWatch = <TData,TValue,>(
    form: IKertyForm<TData>,
    getValue: (data: TData) => TValue,
    isEqual?: (a: TValue, b: TValue) => boolean
) : TValue => {
    const subscribe = useCallback(
        (listener: any) => form.addListener(listener, {
            listenDataChange: true,
            listenStateChange: false,
            listenValidationChange: false,
        }),
        [form]
    );
    const cache = useRef<DataWatchCache<TData, TValue>>({ hasValue: false, data: undefined, getValue: undefined, value: undefined });
    const getDataSnapshot = useMemo(
        () => () => {
            const data = form.getData();
            const prev = cache.current;
            if (prev.hasValue && prev.data === data && prev.getValue === getValue) {
                return prev.value as TValue;
            }
            const value = getValue(data);
            if (!prev.hasValue || isEqual == null || !isEqual(prev.value as TValue, value)) {
                prev.value = value;
                prev.hasValue = true;
            }
            prev.data = data;
            prev.getValue = getValue;
            return prev.value as TValue;
        },
        [form, getValue, isEqual]
    );
    return useSyncExternalStore(subscribe, getDataSnapshot);
}
