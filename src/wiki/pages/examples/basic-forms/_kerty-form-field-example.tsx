import { FormField, type IKertyForm, useDataWatch, useForm } from "@kerty-ui/react-forms";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx";
import { RenderCount } from "../../../components/render-count.tsx";
import type { LoginForm } from "../../../types";

const codeExample = `

import { FormField, useForm, useDataWatch, type IKertyForm } from "@kerty-ui/react-forms";
import { RenderCount } from "./renderCount";

type LoginForm = {
    username: string;
    password: string;
};

const KertyBasicFormFieldExample = () => {
    const form = useForm<LoginForm>();
    return (
        <article>
            <FormField form={form} name="username">
                {
                    ({field, setFieldValue}) =>
                    <div className="field">
                        <label>Username <RenderCount /></label>
                        <input
                            placeholder="Enter your username"
                            value={field.value ?? ""}
                            onChange={(e) => setFieldValue(e.target.value)}
                        />
                    </div>
                }
            </FormField>
            <FormField form={form} name="password">
                {
                    ({field, setFieldValue}) =>
                    <div className="field">
                        <label>Password <RenderCount /></label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={field.value ?? ""}
                            onChange={(e) => setFieldValue(e.target.value)}
                        />
                    </div>
                }
            </FormField>
            <button type="button" onClick={() => form.reset()}>
                Reset
            </button>
            <FormData form={form} />
        </article>
    )
}

const FormData = <TData,>(props: {
    form: IKertyForm<TData>
}) => {
    const data = useDataWatch(props.form, data => data);
    return (
        <section>
            <p>Form data <RenderCount /></p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </section>
    );
}

`;

export const KertyFormFieldExample = () => {
    const form = useForm<LoginForm>();
    return (
        <ExampleBlock
            title="Basic form using useForm and FormField"
            description={
                <>
                    <p>This example shows how to use <b>FormField</b> with <b>useForm</b>. <b>FormField</b> subscribes to a specific field and exposes field state plus helpers through a render function.</p>
                </>
            }
            code={codeExample}
            codeHighlightedRows={[10, 21, 35, 40, 51]}>
            <FormField form={form} name="username">
                {
                    ({field, setFieldValue}) =>
                        <div className="field">
                            <label>Username <RenderCount /></label>
                            <input
                                placeholder="Enter your username"
                                value={field.value ?? ""}
                                onChange={(e) => setFieldValue(e.target.value)}
                            />
                        </div>
                }
            </FormField>
            <FormField form={form} name="password">
                {
                    ({field, setFieldValue}) =>
                        <div className="field">
                            <label>Password <RenderCount /></label>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={field.value ?? ""}
                                onChange={(e) => setFieldValue(e.target.value)}
                            />
                        </div>
                }
            </FormField>
            <Button type="button" outlined="solid" onClick={() => form.reset()}>
                Reset
            </Button>
            <FormData form={form} />
        </ExampleBlock>
    );
}

const FormData = <TData,>(props: {
    form: IKertyForm<TData>
}) => {
    const data = useDataWatch(props.form, data => data);
    return (
        <section className="my-4">
            <p>Form data <RenderCount /></p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </section>
    );
}
