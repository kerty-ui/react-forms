import { type FieldPathByValue, type IKertyForm, useDataWatch, useField, useForm } from "@kerty-ui/react-forms";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx";
import { RenderCount } from "../../../components/render-count.tsx";
import type { LoginForm } from "../../../types";

const codeExample = `

import { useDataWatch, useField, useForm, type FieldPathByValue, type IKertyForm } from "@kerty-ui/react-forms";
import { RenderCount } from "./renderCount";

type LoginForm = {
    username: string;
    password: string;
};

const KertyBasicFormComponentsExample = () => {
    const form = useForm<FormData>();
    return (
        <article>
            <TextField
                form={form}
                name="username"
                label="Username"
                placeholder="Enter your username"
            />
            <TextField
                form={form}
                name="password"
                label="Password"
                placeholder="Enter your password"
                type="password"
            />
            <button type="button" onClick={() => form.reset()}>
                Reset
            </button>
            <FormData form={form} />
        </article>
    )
}

const TextField = <TData, TName extends FieldPathByValue<TData, string>,>(props: {
    form: IKertyForm<TData>,
    name: TName,
    label: string,
    placeholder?: string;
    type?: "text" | "password";
}) => {
    const field = useField<string>(props.form, props.name);
    return (
        <div className="field">
            <label>{props.label} <RenderCount /></label>
            <input
                type={props.type ?? "text"}
                placeholder={props.placeholder}
                value={field.value ?? ""}
                onChange={(e) => props.form.setFieldValue(props.name, e.target.value)}
            />
        </div>
    );
}

const FormData = <TData,>(props: {
    form: IKertyForm<TData>
}) => {
    const data = useDataWatch(props.form, d => d);
    return (
        <section>
            <p>Form data <RenderCount /></p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </section>
    );
}

`;

export const KertyFormComponentsExample = () => {
    const form = useForm<LoginForm>();
    return (
        <ExampleBlock
            title="Basic form using custom component"
            description={
                <>
                    <p>
                        This example shows how to build reusable form components with <b>useField</b>. Each <b>TextField</b> subscribes only to its own field value, while <b>FormData</b> is using <b>useDataWatch</b> to watch the full form data changes separately.
                    </p>
                </>
            }
            code={codeExample}
            codeHighlightedRows={[10, 26, 41, 49, 58]}>
            <TextField
                form={form}
                name="username"
                label="Username"
                placeholder="Enter your username"
            />
            <TextField
                form={form}
                name="password"
                label="Password"
                placeholder="Enter your password"
                type="password"
            />
            <Button type="button" outlined="solid" onClick={() => form.reset()}>
                Reset
            </Button>
            <FormData form={form} />
        </ExampleBlock>
    );
}

const TextField = <TData, TName extends FieldPathByValue<TData, string>,>(props: {
    form: IKertyForm<TData>,
    name: TName,
    label: string,
    placeholder?: string;
    type?: "text" | "password";
}) => {
    const field = useField<string>(props.form, props.name);
    return (
        <div className="field">
            <label>{props.label} <RenderCount /></label>
            <input
                type={props.type ?? "text"}
                placeholder={props.placeholder}
                value={field.value ?? ""}
                onChange={(e) => props.form.setFieldValue(props.name, e.target.value)}
            />
        </div>
    );
}

const FormData = <TData,>(props: {
    form: IKertyForm<TData>
}) => {
    const data = useDataWatch(props.form, d => d);
    return (
        <section className="my-2">
            <p>Form data <RenderCount /></p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </section>
    );
}
