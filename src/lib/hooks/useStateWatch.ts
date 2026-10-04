import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { FormState, IKertyForm } from "../types";

type StateWatchCache<TValue> = {
    hasValue: boolean;
    state: FormState | undefined;
    getValue: ((state: FormState) => TValue) | undefined;
    value: TValue | undefined;
};

export const useStateWatch = <TDataModel,TValue,>(
    form: IKertyForm<TDataModel>,
    getValue: (state: FormState) => TValue,
    isEqual?: (a: TValue, b: TValue) => boolean
): TValue => {
    const subscribe = useCallback(
        (listener: any) => form.addListener(listener, {
            listenDataChange: false,
            listenStateChange: true,
            listenValidationChange: false,
        }),
        [form]);
    const cache = useRef<StateWatchCache<TValue>>({ hasValue: false, state: undefined, getValue: undefined, value: undefined });
    const getStateSnapshot = useMemo(
        () => () => {
            const state = form.getState();
            const prev = cache.current;
            if (prev.hasValue && prev.state === state && prev.getValue === getValue) {
                return prev.value as TValue;
            }
            const value = getValue(state);
            if (!prev.hasValue || isEqual == null || !isEqual(prev.value as TValue, value)) {
                prev.value = value;
                prev.hasValue = true;
            }
            prev.state = state;
            prev.getValue = getValue;
            return prev.value as TValue;
        },
        [form, getValue, isEqual]
    );
    return useSyncExternalStore(subscribe, getStateSnapshot);
}
