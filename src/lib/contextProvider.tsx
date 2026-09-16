import React, { createContext, useContext } from "react";
import type { IKertyForm } from "./types";

export const formContext = createContext<IKertyForm<any> | null>(null);

export const FormProvider = <TModel,>(props: {
    value: IKertyForm<TModel>
    children: React.ReactNode;
}) => {
    return (
        <formContext.Provider value={props.value}>
            {props.children}
        </formContext.Provider>
    );
};

export const useFormContext = (defaultForm?: IKertyForm<any>) => {
    const form = useContext<IKertyForm<any> | null>(formContext);
    if(form == null) {
        if(defaultForm == null) {
            throw new Error('useFormContext() must be used with-in FormProvider');
        }
        return defaultForm;
    }
    return form;
}
