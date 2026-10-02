import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { FieldListenerScope, IKertyForm } from "./../types";

export function useFieldValue<TValue>(form: IKertyForm<any>, name: string, scope?: FieldListenerScope): TValue {
    const subscribe = useCallback((listener: any) => form.addFieldListener(name, listener, scope), [name, form, scope]);
    const getSnapshot = useMemo(() => () => form.getFieldValue(name), [name, form]) as () => TValue;
    return useSyncExternalStore(subscribe, getSnapshot);
}
