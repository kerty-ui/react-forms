import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { FormSnapshot, IKertyForm } from "../types";

export const useWatch = <TDataModel,>(
    form: IKertyForm<TDataModel>,
) : FormSnapshot<TDataModel> => {
    const subscribe = useCallback((listener: any) => form.addListener(listener), [form]);
    const getSnapshot = useMemo(() => form.getSnapshot(), [form]);
    return useSyncExternalStore(subscribe, getSnapshot);
}
