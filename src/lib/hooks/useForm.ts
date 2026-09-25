import { useRef } from "react";
import { KertyForm } from "../kertyForm";
import type { FormOptions, IKertyForm, ObjectData } from "./../types";

export const useForm = <TDataModel extends ObjectData>(
    options?: FormOptions<TDataModel>
): IKertyForm<TDataModel> => {
    const form = useRef<IKertyForm<TDataModel>>(null);
    if(form.current == null) {
        form.current = new KertyForm<TDataModel>(options ?? {});
    }
    return form.current;
}
