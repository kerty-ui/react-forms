import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { IKertyForm } from "./../types";

export function useFieldValue<TValue>(form: IKertyForm<any>, name: string): TValue {
    const subscribe = useCallback((listener: any) => form.addFieldListener(name, listener), [name, form]);
    const getSnapshot = useMemo(() => () => form.getFieldValue(name), [name, form]) as () => TValue;
    return useSyncExternalStore(subscribe, getSnapshot);
}
