import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { FieldListenerScope, IKertyForm } from "./../types";

export function useFieldValue<TValue>(form: IKertyForm<any>, name: string, scope?: FieldListenerScope): TValue {
    const subscribe = useCallback((listener: any) => form.addFieldListener(name, listener, scope), [form, name, scope]);
    const getSnapshot = useMemo(() => () => form.getFieldValue(name), [form, name]) as () => TValue;
    return useSyncExternalStore(subscribe, getSnapshot);
}
