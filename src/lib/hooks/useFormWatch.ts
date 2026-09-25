import { useRef } from "react";
import { useWatch } from "./useWatch";
import { KertyForm} from "../kertyForm";
import type { FormOptions, FormState, IKertyForm, IValidationResult, ObjectData } from "../types";

export const useFormWatch = <TDataModel extends ObjectData>(
    options?: FormOptions<TDataModel>
): [IKertyForm<TDataModel>, TDataModel, FormState, IValidationResult | undefined] => {
    const form = useRef<IKertyForm<TDataModel>>(null);
    if(form.current == null) {
        form.current = new KertyForm<TDataModel>({
            ...(options ?? {}),
        });
    }

    const snapshot = useWatch(form.current);
    return [form.current, snapshot.data, snapshot.state, snapshot.validationResult];
}
