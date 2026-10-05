import { useCallback, useMemo, useSyncExternalStore } from "react";
import type {
    AutoFieldPath,
    FieldListenerScope,
    FieldPathByValue,
    FieldPathValue,
    FieldSnapshot,
    IKertyForm
} from "./../types";

export function useFieldWatch<TModel, TPath extends string>(form: IKertyForm<TModel>, name: AutoFieldPath<TModel, TPath>, scope?: FieldListenerScope): FieldSnapshot<FieldPathValue<TModel, TPath>>;
export function useFieldWatch<TModel, TValue>(form: IKertyForm<TModel>, name: FieldPathByValue<TModel, TValue>, scope?: FieldListenerScope): FieldSnapshot<TValue>;
export function useFieldWatch<TValue = never>(form: IKertyForm<any>, name: [TValue] extends [never] ? never : string, scope?: FieldListenerScope): FieldSnapshot<TValue>;
export function useFieldWatch(form: IKertyForm<any>, name: string, scope?: FieldListenerScope): FieldSnapshot<any> {
    const subscribe = useCallback((listener: any) => form.addFieldListener(name, listener, scope), [form, name, scope]);
    const getSnapshot = useMemo(() => form.getFieldSnapshot(name), [form, name]) as () => FieldSnapshot<any>;
    return useSyncExternalStore(subscribe, getSnapshot);
}
