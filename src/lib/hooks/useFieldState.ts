import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { FieldState, IKertyForm } from "./../types";

export function useFieldState(form: IKertyForm<any>, name: string): FieldState {
    const subscribe = useCallback((listener: any) => form.addFieldListener(name, listener), [name, form]);
    const getSnapshot = useMemo(() => () => form.getFieldState(name), [name, form]) as () => FieldState;
    return useSyncExternalStore(subscribe, getSnapshot);
}
