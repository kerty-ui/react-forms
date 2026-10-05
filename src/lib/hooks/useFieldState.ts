import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { FieldListenerScope, FieldState, IKertyForm } from "./../types";

export function useFieldState(form: IKertyForm<any>, name: string, scope?: FieldListenerScope): FieldState {
    const subscribe = useCallback((listener: any) => form.addFieldListener(name, listener, scope), [form, name, scope]);
    const getSnapshot = useMemo(() => () => form.getFieldState(name), [form, name]) as () => FieldState;
    return useSyncExternalStore(subscribe, getSnapshot);
}
