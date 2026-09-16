import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { FieldPath, FieldPathValue, FieldSnapshot, IKertyForm } from "./../types";

export function useFieldWatch<TModel, TPath extends FieldPath<TModel>>(form: IKertyForm<TModel>, name: TPath): FieldSnapshot<FieldPathValue<TModel, TPath>>;
export function useFieldWatch<TValue>(form: IKertyForm<any>, name: string): FieldSnapshot<TValue>;
export function useFieldWatch(form: IKertyForm<any>, name: string): FieldSnapshot<any> {
    const subscribe = useCallback((listener: any) => form.addFieldListener(name, listener), [name, form]);
    const getSnapshot = useMemo(() => form.getFieldSnapshot(name), [name, form]) as () => FieldSnapshot<any>;
    return useSyncExternalStore(subscribe, getSnapshot);
}
