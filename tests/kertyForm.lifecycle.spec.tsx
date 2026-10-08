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
import { treeOf } from "./validationResultTree.helpers";

type Item = {
    id?: number;
    code?: string | null;
    transactionId?: number;
};

type ItemsForm = {
    items: Item[];
};

const itemsValidator = {
    mode: "fieldDriven" as const,
    validate: ({ data }: { data: ItemsForm }) => {
        const results: [string, IValidationResult][] = [];

        (data.items ?? []).forEach((item, index) => {
            const result = new ValidationResult();
            if (item.code == null) {
                result.set({ text: "Code is required", severity: Severity.Error });
            }
            results.push([`items[${index}].code`, result]);
        });

        return treeOf(results);
    },
};

const itemsForm = (items: Item[]) => new KertyForm<ItemsForm>({ data: { items }, validator: itemsValidator });

const Cell = ({ form, name }: { form: IKertyForm<ItemsForm>; name: any }) => {
    const [field] = useField({ form, name });
    return <span data-testid={name}>{field.validationResult?.messages[0]?.text ?? "-"}</span>;
};

const ReadOnlyCell = ({ form, name }: { form: IKertyForm<ItemsForm>; name: any }) => {
    const [field] = useField({ form, name });
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

const IdKeyedItemsTable = ({ form }: { form: IKertyForm<ItemsForm> }) => {
    const [items] = useField({ form, name: "items", listen: "child" });
    return (
        <div>
            {items.value!.map((item, index) => <Cell key={item.id} form={form} name={`items[${index}].code`} />)}
        </div>
    );
};

const IndexKeyedItemsTable = ({ form }: { form: IKertyForm<ItemsForm> }) => {
    const [items] = useField({ form, name: "items", listen: "child" });
    return (
        <div>
            {items.value!.map((_, index) => <Cell key={index} form={form} name={`items[${index}].code`} />)}
        </div>
    );
};

const renderIdKeyedItems = (form: IKertyForm<ItemsForm>) => render(<IdKeyedItemsTable form={form} />);

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

describe("KertyForm - field state of moved items in rows keyed by id", () => {

    it("should keep the touched state of a shifted item when an earlier item is removed", () => {
        const form = itemsForm([{ id: 1, code: "A" }, { id: 2, code: "B" }, { id: 3, code: "C" }]);
        renderIdKeyedItems(form);
        act(() => { form.touch("items[2].code"); });

        act(() => { form.removeItems("items", 0); });

        expect(form.getFieldState("items[1].code").isTouched).toBe(true);
    });

    it("should keep the touched state of a shifted item when an item is prepended", () => {
        const form = itemsForm([{ id: 1, code: "A" }, { id: 2, code: "B" }]);
        renderIdKeyedItems(form);
        act(() => { form.touch("items[0].code"); });

        act(() => { form.prependItems("items", { id: 3, code: "C" }); });

        expect(form.getFieldState("items[1].code").isTouched).toBe(true);
    });

    it("should keep the touched state of a swapped item", () => {
        const form = itemsForm([{ id: 1, code: "A" }, { id: 2, code: "B" }]);
        renderIdKeyedItems(form);
        act(() => { form.touch("items[0].code"); });

        act(() => { form.swapItem("items", 0, 1); });

        expect(form.getFieldState("items[1].code").isTouched).toBe(true);
    });

    it("should keep the touched state of a moved item", () => {
        const form = itemsForm([{ id: 1, code: "A" }, { id: 2, code: "B" }, { id: 3, code: "C" }]);
        renderIdKeyedItems(form);
        act(() => { form.touch("items[0].code"); });

        act(() => { form.moveItem("items", 0, 2); });

        expect(form.getFieldState("items[2].code").isTouched).toBe(true);
    });

    it("should keep the applied validation result of a shifted item when results are not kept without listeners", () => {
        const form = new KertyForm<ItemsForm>({
            data: { items: [{ id: 1, code: "A" }, { id: 2, code: "B" }, { id: 3, code: "C" }] },
            keepValidationResultsWithoutListeners: false,
        });
        const view = renderIdKeyedItems(form);
        act(() => { form.applyFieldValidationResult("items[2].code", new ValidationResult().add({ text: "Code is taken" })); });

        act(() => { form.removeItems("items", 0); });

        expect(view.getByTestId("items[1].code").textContent).toBe("Code is taken");
    });
});

describe("KertyForm - field state of moved items in rows keyed by index", () => {

    it("should keep the touched state of a shifted item when an earlier item is removed", () => {
        const form = itemsForm([{ id: 1, code: "A" }, { id: 2, code: "B" }, { id: 3, code: "C" }]);
        render(<IndexKeyedItemsTable form={form} />);
        act(() => { form.touch("items[2].code"); });

        act(() => { form.removeItems("items", 0); });

        expect(form.getFieldState("items[1].code").isTouched).toBe(true);
    });
});
