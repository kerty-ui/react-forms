import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import {
    FormArrayField,
    FormField,
    FormProvider,
    FormValidationResult,
    Severity,
    SingleMessageDrivenValidator,
    ValidationResult,
    useDataWatch,
    useField,
    useFieldState,
    useFieldValue,
    useForm,
    useFormContext,
    useFormValidationResult,
    useFormWatch,
    useStateWatch,
    useWatch,
    type IKertyForm,
} from "../src/lib";

type LoginForm = {
    username: string;
    password: string;
};

type ListForm = {
    items: string[];
};

type ParentForm = {
    parent: { text: string; other: string };
    sibling: string;
};

const RenderCount = ({ testId }: { testId: string }) => {
    const count = useRef(0);
    count.current += 1;
    return <span data-testid={testId}>{count.current}</span>;
};

const renderCountOf = (testId: string) => Number(screen.getByTestId(testId).textContent);

describe("useForm", () => {
    it("should return the same form instance when the component re-renders", () => {
        const seen: unknown[] = [];
        const Component = () => {
            const form = useForm<LoginForm>();
            seen.push(form);
            return null;
        };
        const { rerender } = render(<Component />);

        rerender(<Component />);

        expect(seen[0]).toBe(seen[1]);
    });

    it("should seed the form with the given data when options are passed", () => {
        const Component = () => {
            const form = useForm<LoginForm>({ data: { username: "bob", password: "pw" } });
            return <span data-testid="data">{JSON.stringify(form.getData())}</span>;
        };

        render(<Component />);

        expect(screen.getByTestId("data").textContent).toBe('{"username":"bob","password":"pw"}');
    });
});

describe("useFormWatch", () => {
    it("should expose the current data when a field changes", () => {
        let form!: IKertyForm<Partial<LoginForm>>;
        const Component = () => {
            const [f, data] = useFormWatch<Partial<LoginForm>>();
            form = f;
            return <span data-testid="username">{data.username ?? ""}</span>;
        };
        render(<Component />);

        act(() => form.setFieldValue("username", "bob"));

        expect(screen.getByTestId("username").textContent).toBe("bob");
    });

    it("should re-render the whole component when any field changes", () => {
        let form!: IKertyForm<Partial<LoginForm>>;
        const Component = () => {
            const [f] = useFormWatch<Partial<LoginForm>>();
            form = f;
            return <RenderCount testId="form" />;
        };
        render(<Component />);
        const before = renderCountOf("form");

        act(() => form.setFieldValue("password", "pw"));

        expect(renderCountOf("form")).toBe(before + 1);
    });

    it("should expose the updated form state when a field becomes dirty", () => {
        let form!: IKertyForm<Partial<LoginForm>>;
        const Component = () => {
            const [f, , state] = useFormWatch<Partial<LoginForm>>({ data: { username: "bob" } });
            form = f;
            return <span data-testid="dirty">{String(state.isDirty)}</span>;
        };
        render(<Component />);

        act(() => form.setFieldValue("username", "alice"));

        expect(screen.getByTestId("dirty").textContent).toBe("true");
    });

    it("should expose the form validation result when one is applied", () => {
        let form!: IKertyForm<Partial<LoginForm>>;
        const Component = () => {
            const [f, , , validationResult] = useFormWatch<Partial<LoginForm>>();
            form = f;
            return <span data-testid="message">{validationResult?.messages[0]?.text ?? ""}</span>;
        };
        render(<Component />);

        act(() => form.applyValidationResult(new ValidationResult().add({ text: "Login failed" })));

        expect(screen.getByTestId("message").textContent).toBe("Login failed");
    });
});

describe("useWatch", () => {
    it("should re-render the subscriber when the form data changes", () => {
        const form = { current: null as any };
        const Watcher = ({ f }: { f: IKertyForm<any> }) => {
            useWatch(f);
            return <RenderCount testId="watcher" />;
        };
        const Component = () => {
            const f = useForm<any>({ data: { a: 1 } });
            form.current = f;
            return <Watcher f={f} />;
        };
        render(<Component />);
        const before = renderCountOf("watcher");

        act(() => form.current.setFieldValue("a", 2));

        expect(renderCountOf("watcher")).toBe(before + 1);
    });
});

describe("useField", () => {
    it("should expose the current field value when the field changes", () => {
        const form = { current: null as any };
        const Field = ({ f }: { f: IKertyForm<any> }) => {
            const field = useField<string>(f, "username");
            return <span data-testid="value">{field.value ?? ""}</span>;
        };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return <Field f={f} />;
        };
        render(<Component />);

        act(() => form.current.setFieldValue("username", "bob"));

        expect(screen.getByTestId("value").textContent).toBe("bob");
    });

    it("should expose the field state alongside the value when the field is dirty", () => {
        const form = { current: null as any };
        const Field = ({ f }: { f: IKertyForm<any> }) => {
            const field = useField<string>(f, "username");
            return <span data-testid="dirty">{String(field.isDirty)}</span>;
        };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>({ data: { username: "bob" } });
            form.current = f;
            return <Field f={f} />;
        };
        render(<Component />);

        act(() => form.current.setFieldValue("username", "alice"));

        expect(screen.getByTestId("dirty").textContent).toBe("true");
    });

    it("should expose the field validation result when one is applied", () => {
        const form = { current: null as any };
        const Field = ({ f }: { f: IKertyForm<any> }) => {
            const field = useField<string>(f, "username");
            return <span data-testid="message">{field.validationResult?.messages[0]?.text ?? ""}</span>;
        };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return <Field f={f} />;
        };
        render(<Component />);

        act(() => form.current.applyFieldValidationResult("username", new ValidationResult().add({ text: "Taken" })));

        expect(screen.getByTestId("message").textContent).toBe("Taken");
    });
});

describe("FormField", () => {
    it("should re-render only the changed field when a sibling field stays untouched", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return (
                <>
                    <RenderCount testId="parent" />
                    <FormField form={f} name="username">
                        {() => <RenderCount testId="username" />}
                    </FormField>
                    <FormField form={f} name="password">
                        {() => <RenderCount testId="password" />}
                    </FormField>
                </>
            );
        };
        render(<Component />);
        const before = {
            parent: renderCountOf("parent"),
            username: renderCountOf("username"),
            password: renderCountOf("password"),
        };

        act(() => form.current.setFieldValue("username", "bob"));

        expect({
            parent: renderCountOf("parent"),
            username: renderCountOf("username"),
            password: renderCountOf("password"),
        }).toEqual({ parent: before.parent, username: before.username + 1, password: before.password });
    });

    it("should write the value into the form when setFieldValue is called from the render callback", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return (
                <FormField form={f} name="username">
                    {({ field, setFieldValue }) => (
                        <button data-testid="field" onClick={() => setFieldValue("bob")}>{field.value ?? ""}</button>
                    )}
                </FormField>
            );
        };
        render(<Component />);

        act(() => screen.getByTestId("field").click());

        expect(form.current.getData().username).toBe("bob");
    });

    it("should mark the field touched when touchField is called from the render callback", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return (
                <FormField form={f} name="username">
                    {({ field, touchField }) => (
                        <button data-testid="field" onClick={touchField}>{String(field.isTouched)}</button>
                    )}
                </FormField>
            );
        };
        render(<Component />);

        act(() => screen.getByTestId("field").click());

        expect(screen.getByTestId("field").textContent).toBe("true");
    });

    it("should stop receiving updates when the field unmounts", () => {
        const form = { current: null as any };
        const Component = ({ showField }: { showField: boolean }) => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return showField
                ? <FormField form={f} name="username">{() => <RenderCount testId="username" />}</FormField>
                : <span data-testid="gone">gone</span>;
        };
        const { rerender } = render(<Component showField={true} />);

        rerender(<Component showField={false} />);
        act(() => form.current.setFieldValue("username", "bob"));

        expect(screen.getByTestId("gone")).toBeDefined();
    });
});

describe("useFieldValue", () => {
    it("should return the raw field value when the field changes", () => {
        const form = { current: null as any };
        const Field = ({ f }: { f: IKertyForm<any> }) => (
            <span data-testid="value">{useFieldValue<string>(f, "username") ?? ""}</span>
        );
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return <Field f={f} />;
        };
        render(<Component />);

        act(() => form.current.setFieldValue("username", "bob"));

        expect(screen.getByTestId("value").textContent).toBe("bob");
    });
});

describe("useFieldState", () => {
    it("should return the field state when the field becomes dirty", () => {
        const form = { current: null as any };
        const Field = ({ f }: { f: IKertyForm<any> }) => (
            <span data-testid="dirty">{String(useFieldState(f, "username").isDirty)}</span>
        );
        const Component = () => {
            const f = useForm<Partial<LoginForm>>({ data: { username: "bob" } });
            form.current = f;
            return <Field f={f} />;
        };
        render(<Component />);

        act(() => form.current.setFieldValue("username", "alice"));

        expect(screen.getByTestId("dirty").textContent).toBe("true");
    });
});

describe("useDataWatch", () => {
    it("should re-render the subscriber when the selected value changes", () => {
        const form = { current: null as any };
        const Watcher = ({ f }: { f: IKertyForm<Partial<LoginForm>> }) => {
            const username = useDataWatch(f, data => data.username);
            return <span data-testid="username">{username ?? ""}</span>;
        };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return <Watcher f={f} />;
        };
        render(<Component />);

        act(() => form.current.setFieldValue("username", "bob"));

        expect(screen.getByTestId("username").textContent).toBe("bob");
    });

    it("should not re-render the subscriber when an unselected field changes", () => {
        const form = { current: null as any };
        const Watcher = ({ f }: { f: IKertyForm<Partial<LoginForm>> }) => {
            useDataWatch(f, data => data.username);
            return <RenderCount testId="watcher" />;
        };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return <Watcher f={f} />;
        };
        render(<Component />);
        const before = renderCountOf("watcher");

        act(() => form.current.setFieldValue("password", "pw"));

        expect(renderCountOf("watcher")).toBe(before);
    });
});

describe("useStateWatch", () => {
    it("should re-render the subscriber when the selected state value changes", () => {
        const form = { current: null as any };
        const Watcher = ({ f }: { f: IKertyForm<any> }) => (
            <span data-testid="dirty">{String(useStateWatch(f, state => state.isDirty))}</span>
        );
        const Component = () => {
            const f = useForm<any>({ data: { a: 1 } });
            form.current = f;
            return <Watcher f={f} />;
        };
        render(<Component />);

        act(() => form.current.setFieldValue("a", 2));

        expect(screen.getByTestId("dirty").textContent).toBe("true");
    });

    it("should not re-render the subscriber when only the data changes", () => {
        const form = { current: null as any };
        const Watcher = ({ f }: { f: IKertyForm<any> }) => {
            useStateWatch(f, state => state.isDirty);
            return <RenderCount testId="watcher" />;
        };
        const Component = () => {
            const f = useForm<any>({ data: { a: 1 } });
            form.current = f;
            return <Watcher f={f} />;
        };
        render(<Component />);
        act(() => form.current.setFieldValue("a", 2));
        const before = renderCountOf("watcher");

        act(() => form.current.setFieldValue("a", 3));

        expect(renderCountOf("watcher")).toBe(before);
    });
});

describe("useFormValidationResult", () => {
    it("should return undefined when the form has no validation result", () => {
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            const result = useFormValidationResult(f);
            return <span data-testid="message">{result?.messages[0]?.text ?? ""}</span>;
        };

        render(<Component />);

        expect(screen.getByTestId("message").textContent).toBe("");
    });

    it("should return the result when a form validation result is applied", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            const result = useFormValidationResult(f);
            return <span data-testid="message">{result?.messages[0]?.text ?? ""}</span>;
        };
        render(<Component />);

        act(() => form.current.applyValidationResult(new ValidationResult().add({ text: "Form is invalid" })));

        expect(screen.getByTestId("message").textContent).toBe("Form is invalid");
    });

    it("should not re-render the subscriber when only a field value changes", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            useFormValidationResult(f);
            return <RenderCount testId="validation" />;
        };
        render(<Component />);
        const before = renderCountOf("validation");

        act(() => form.current.setFieldValue("username", "bob"));

        expect(renderCountOf("validation")).toBe(before);
    });
});

describe("FormArrayField", () => {
    it("should render the current items when the array changes", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<ListForm>({ data: { items: ["a"] } });
            form.current = f;
            return (
                <FormArrayField form={f} name="items">
                    {({ field }) => <span data-testid="items">{(field.value ?? []).join(",")}</span>}
                </FormArrayField>
            );
        };
        render(<Component />);

        act(() => form.current.appendItems("items", "b"));

        expect(screen.getByTestId("items").textContent).toBe("a,b");
    });

    it("should append through the context helper when appendItems is called", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<ListForm>({ data: { items: ["a"] } });
            form.current = f;
            return (
                <FormArrayField form={f} name="items">
                    {({ field, appendItems }) => (
                        <button data-testid="items" onClick={() => appendItems("b")}>
                            {(field.value ?? []).join(",")}
                        </button>
                    )}
                </FormArrayField>
            );
        };
        render(<Component />);

        act(() => screen.getByTestId("items").click());

        expect(screen.getByTestId("items").textContent).toBe("a,b");
    });

    it.each([
        ["prependItems", (ctx: any) => ctx.prependItems("z"), "z,a,b"],
        ["insertItems", (ctx: any) => ctx.insertItems(1, "z"), "a,z,b"],
        ["updateItem", (ctx: any) => ctx.updateItem(0, "z"), "z,b"],
        ["swapItem", (ctx: any) => ctx.swapItem(0, 1), "b,a"],
        ["moveItem", (ctx: any) => ctx.moveItem(0, 1), "b,a"],
        ["setFieldValue", (ctx: any) => ctx.setFieldValue(["z"]), "z"],
    ])("should render %s when the context helper is called", (_label, invoke, expected) => {
        const Component = () => {
            const f = useForm<ListForm>({ data: { items: ["a", "b"] } });
            return (
                <FormArrayField form={f} name="items">
                    {(ctx) => (
                        <button data-testid="items" onClick={() => invoke(ctx)}>
                            {(ctx.field.value ?? []).join(",")}
                        </button>
                    )}
                </FormArrayField>
            );
        };
        render(<Component />);

        act(() => screen.getByTestId("items").click());

        expect(screen.getByTestId("items").textContent).toBe(expected);
    });

    it("should mark the array field touched when touchField is called", () => {
        const Component = () => {
            const f = useForm<ListForm>({ data: { items: ["a"] } });
            return (
                <FormArrayField form={f} name="items">
                    {({ field, touchField }) => (
                        <button data-testid="items" onClick={touchField}>{String(field.isTouched)}</button>
                    )}
                </FormArrayField>
            );
        };
        render(<Component />);

        act(() => screen.getByTestId("items").click());

        expect(screen.getByTestId("items").textContent).toBe("true");
    });

    it("should remove through the context helper when removeItems is called", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<ListForm>({ data: { items: ["a", "b"] } });
            form.current = f;
            return (
                <FormArrayField form={f} name="items">
                    {({ field, removeItems }) => (
                        <button data-testid="items" onClick={() => removeItems(0)}>
                            {(field.value ?? []).join(",")}
                        </button>
                    )}
                </FormArrayField>
            );
        };
        render(<Component />);

        act(() => screen.getByTestId("items").click());

        expect(screen.getByTestId("items").textContent).toBe("b");
    });
});

describe("FormValidationResult", () => {
    it("should render nothing when the form has no validation result", () => {
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            return (
                <div data-testid="host">
                    <FormValidationResult form={f}>
                        {(result) => <span>{result.messages[0]?.text}</span>}
                    </FormValidationResult>
                </div>
            );
        };

        render(<Component />);

        expect(screen.getByTestId("host").textContent).toBe("");
    });

    it("should render the message when a form validation result is applied", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return (
                <div data-testid="host">
                    <FormValidationResult form={f}>
                        {(result) => <span>{result.messages[0]?.text}</span>}
                    </FormValidationResult>
                </div>
            );
        };
        render(<Component />);

        act(() => form.current.applyValidationResult(new ValidationResult().add({ text: "Login failed" })));

        expect(screen.getByTestId("host").textContent).toBe("Login failed");
    });
});

describe("useFormContext", () => {
    it("should return the provided form when used inside a FormProvider", () => {
        const form = { current: null as any };
        const Child = () => {
            const f = useFormContext();
            return <span data-testid="same">{String(f === form.current)}</span>;
        };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>();
            form.current = f;
            return <FormProvider value={f}><Child /></FormProvider>;
        };

        render(<Component />);

        expect(screen.getByTestId("same").textContent).toBe("true");
    });

    it("should throw when used outside a FormProvider", () => {
        const Child = () => {
            useFormContext();
            return null;
        };

        expect(() => render(<Child />)).toThrow("useFormContext() must be used with-in FormProvider");
    });
});

describe("form validation flow", () => {
    it("should show the field message when submit validates an empty form", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>({
                validator: () => new SingleMessageDrivenValidator<Partial<LoginForm>>((result, { data }) => {
                    if (!data.username) result.setFieldMessage("username", "Username is required");
                }),
            });
            form.current = f;
            return (
                <FormField form={f} name="username">
                    {({ field }) => <span data-testid="message">{field.validationResult?.messages[0]?.text ?? ""}</span>}
                </FormField>
            );
        };
        render(<Component />);

        act(() => { form.current.validate(); });

        expect(screen.getByTestId("message").textContent).toBe("Username is required");
    });

    it("should clear the field message when the field is corrected after validation", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<Partial<LoginForm>>({
                validator: () => new SingleMessageDrivenValidator<Partial<LoginForm>>((result, { data }) => {
                    if (!data.username) result.setFieldMessage("username", "Username is required");
                }),
            });
            form.current = f;
            return (
                <FormField form={f} name="username">
                    {({ field }) => <span data-testid="message">{field.validationResult?.messages[0]?.text ?? ""}</span>}
                </FormField>
            );
        };
        render(<Component />);
        act(() => { form.current.validate(); });

        act(() => form.current.setFieldValue("username", "bob"));

        expect(screen.getByTestId("message").textContent).toBe("");
    });

    it("should render the success message when a success result is applied to the form", () => {
        const form = { current: null as any };
        const Component = () => {
            const [f, , , validationResult] = useFormWatch<Partial<LoginForm>>();
            form.current = f;
            return <span data-testid="message">{validationResult?.messages[0]?.text ?? ""}</span>;
        };
        render(<Component />);

        act(() => form.current.applyValidationResult(
            new ValidationResult().set({ text: "Welcome, Chuck Norris!", severity: Severity.Success }),
        ));

        expect(screen.getByTestId("message").textContent).toBe("Welcome, Chuck Norris!");
    });
});

describe("useField – parent notification", () => {
    it("should re-render the component bound to the parent when a child field changes", () => {
        const form = { current: null as any };
        const Parent = ({ f }: { f: IKertyForm<any> }) => {
            useField<ParentForm["parent"]>(f, "parent");
            return <RenderCount testId="parent" />;
        };
        const Component = () => {
            const f = useForm<Partial<ParentForm>>({ data: { parent: { text: "a", other: "b" }, sibling: "s" } });
            form.current = f;
            return <Parent f={f} />;
        };
        render(<Component />);
        const before = renderCountOf("parent");

        act(() => form.current.setFieldValue("parent.text", "c"));

        expect(renderCountOf("parent")).toBe(before + 1);
    });

    it("should expose the updated child value on the parent snapshot when a child field changes", () => {
        const form = { current: null as any };
        const Parent = ({ f }: { f: IKertyForm<any> }) => {
            const field = useField<ParentForm["parent"]>(f, "parent");
            return <span data-testid="text">{field.value?.text ?? ""}</span>;
        };
        const Component = () => {
            const f = useForm<Partial<ParentForm>>({ data: { parent: { text: "a", other: "b" }, sibling: "s" } });
            form.current = f;
            return <Parent f={f} />;
        };
        render(<Component />);

        act(() => form.current.setFieldValue("parent.text", "c"));

        expect(screen.getByTestId("text").textContent).toBe("c");
    });

    it("should not re-render a sibling field when a child of another branch changes", () => {
        const form = { current: null as any };
        const Component = () => {
            const f = useForm<Partial<ParentForm>>({ data: { parent: { text: "a", other: "b" }, sibling: "s" } });
            form.current = f;
            return (
                <>
                    <FormField form={f} name="parent.other">
                        {() => <RenderCount testId="other" />}
                    </FormField>
                    <FormField form={f} name="sibling">
                        {() => <RenderCount testId="sibling" />}
                    </FormField>
                </>
            );
        };
        render(<Component />);
        const before = { other: renderCountOf("other"), sibling: renderCountOf("sibling") };

        act(() => form.current.setFieldValue("parent.text", "c"));

        expect({ other: renderCountOf("other"), sibling: renderCountOf("sibling") }).toEqual(before);
    });

    it("should not re-render a component bound to the parent field state when a child field changes", () => {
        const form = { current: null as any };
        const Parent = ({ f }: { f: IKertyForm<any> }) => {
            useFieldState(f, "parent");
            return <RenderCount testId="parentState" />;
        };
        const Component = () => {
            const f = useForm<Partial<ParentForm>>({ data: { parent: { text: "a", other: "b" }, sibling: "s" } });
            form.current = f;
            return <Parent f={f} />;
        };
        render(<Component />);
        const before = renderCountOf("parentState");

        act(() => form.current.setFieldValue("parent.text", "c"));

        expect(renderCountOf("parentState")).toBe(before);
    });

    it("should not re-render a component bound to the array when a property of one of its items changes", () => {
        const form = { current: null as any };
        const List = ({ f }: { f: IKertyForm<any> }) => {
            useField<{ text: string }[]>(f, "rows");
            return <RenderCount testId="rows" />;
        };
        const Component = () => {
            const f = useForm<any>({ data: { rows: [{ text: "a" }] } });
            form.current = f;
            return <List f={f} />;
        };
        render(<Component />);
        const before = renderCountOf("rows");

        act(() => form.current.setFieldValue("rows[0].text", "b"));

        expect(renderCountOf("rows")).toBe(before);
    });

    it("should re-render the component bound to an array item when a property of that item changes", () => {
        const form = { current: null as any };
        const Row = ({ f }: { f: IKertyForm<any> }) => {
            useField<{ text: string }>(f, "rows[0]");
            return <RenderCount testId="row" />;
        };
        const Component = () => {
            const f = useForm<any>({ data: { rows: [{ text: "a" }] } });
            form.current = f;
            return <Row f={f} />;
        };
        render(<Component />);
        const before = renderCountOf("row");

        act(() => form.current.setFieldValue("rows[0].text", "b"));

        expect(renderCountOf("row")).toBe(before + 1);
    });
});
