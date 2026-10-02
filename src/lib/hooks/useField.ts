import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { FieldListenerScope, FieldPath, FieldPathValue, FieldSnapshot, IKertyForm } from "./../types";

export function useField<TModel, TPath extends FieldPath<TModel>>(form: IKertyForm<TModel>, name: TPath, scope?: FieldListenerScope): FieldSnapshot<FieldPathValue<TModel, TPath>>;
export function useField<TValue>(form: IKertyForm<any>, name: string, scope?: FieldListenerScope): FieldSnapshot<TValue>;
export function useField(form: IKertyForm<any>, name: string, scope?: FieldListenerScope): FieldSnapshot<any> {
    const subscribe = useCallback((listener: any) => form.addFieldListener(name, listener, scope), [name, form, scope]);
    const getSnapshot = useMemo(() => form.getFieldSnapshot(name), [name, form]) as () => FieldSnapshot<any>;
    return useSyncExternalStore(subscribe, getSnapshot);
}
