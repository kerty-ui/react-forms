import { describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import {
    KertyForm,
    Severity,
    ValidationResult,
    useField,
    type IKertyForm,
    type IValidationResult,
} from "../src/lib";

type Item = {
    code?: string | null;
    transactionId?: number;
};

type ItemsForm = {
    items: Item[];
};

const itemsValidator = {
    mode: "fieldDriven" as const,
    validate: ({ data }: { data: ItemsForm }) => {
        const results = new Map<string, IValidationResult>();

        (data.items ?? []).forEach((item, index) => {
            const result = new ValidationResult();
            if (item.code == null) {
                result.set({ text: "Code is required", severity: Severity.Error });
            }
            results.set(`items[${index}].code`, result);
        });

        return results;
    },
};

const itemsForm = (items: Item[]) => new KertyForm<ItemsForm>({ data: { items }, validator: itemsValidator });

const Cell = ({ form, name }: { form: IKertyForm<ItemsForm>; name: any }) => {
    const field = useField(form, name);
    return <span data-testid={name}>{field.validationResult?.messages[0]?.text ?? "-"}</span>;
};

const ReadOnlyCell = ({ form, name }: { form: IKertyForm<ItemsForm>; name: any }) => {
    const field = useField(form, name);
    return <b data-testid={name}>{field.validationResult?.messages[0]?.text ?? "-"}</b>;
};

const ItemsTable = ({ form }: { form: IKertyForm<ItemsForm> }) => (
    <div>
        {form.getData().items.map((item, index) =>
            item.transactionId != null
                ? <ReadOnlyCell key={index} form={form} name={`items[${index}].code`} />
                : <Cell key={index} form={form} name={`items[${index}].code`} />
        )}
    </div>
);

describe("KertyForm - field state across subscriptions", () => {

    it("should drop the field state when the field returns to the default", () => {
        const form = itemsForm([{ code: null }]);
        form.validate();

        form.resetValidationResults();

        expect(form.getFieldState("items[0].code")).toStrictEqual(form.getFieldState("items[999].code"));
    });

    it("should hold no field state when nothing deviates from the default", () => {
        const form = itemsForm([{ code: "A" }, { code: "B" }]);
        const unsubscribe = form.addFieldListener("items[0].code", () => { });

        unsubscribe();

        expect(form.getFieldState("items[0].code")).toEqual({
            isTouched: false, isDirty: false, isValid: true, isValidated: false,
        });
    });
});

describe("KertyForm - field state across React mounts", () => {
    it("should report the validation result when the field mounts after validation under StrictMode", () => {
        const form = itemsForm([{ code: null }]);
        form.validate();

        const view = render(<StrictMode><Cell form={form} name="items[0].code" /></StrictMode>);

        expect(view.getByTestId("items[0].code").textContent).toBe("Code is required");
    });

    it("should report the validation result of a prepended item when its cell swaps component type", () => {
        const form = itemsForm([{ code: "A", transactionId: 1 }]);
        const view = render(<StrictMode><ItemsTable form={form} /></StrictMode>);
        act(() => { form.validate(); });

        act(() => { form.prependItems("items", { code: null }); });

        expect(view.getByTestId("items[0].code").textContent).toBe("Code is required");
    });
});
