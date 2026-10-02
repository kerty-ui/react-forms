import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { FieldListenerScope, FieldState, IKertyForm } from "./../types";

export function useFieldState(form: IKertyForm<any>, name: string, scope?: FieldListenerScope): FieldState {
    const subscribe = useCallback((listener: any) => form.addFieldListener(name, listener, scope), [name, form, scope]);
    const getSnapshot = useMemo(() => () => form.getFieldState(name), [name, form]) as () => FieldState;
    return useSyncExternalStore(subscribe, getSnapshot);
}
