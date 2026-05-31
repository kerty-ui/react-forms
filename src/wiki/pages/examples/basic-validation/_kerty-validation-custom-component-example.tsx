import {
    FormValidationResult,
    useDataWatch,
    useForm,
    useStateWatch,
    Severity,
    ValidationResult,
    SingleMessageDrivenValidator,
    type IKertyForm, type FieldPathByValue, useField,
} from "@kerty-ui/react-forms";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx";
import { RenderCount } from "../../../components/render-count.tsx";
import { FieldMessage } from "../../../components/field-message.tsx";
import { Message } from "../../../components/message.tsx";
import type { LoginForm } from "../../../types";
import type { SubmitEventHandler } from "react";

const codeExample = `

import { 
    FormField, useForm, useDataWatch,
    SingleMessageDrivenValidator, ValidationResult, FormValidationResult, type IKertyForm 
} from "@kerty-ui/react-forms";
import { Message, FieldMessage, RenderCount } form "./renderCount";

type LoginForm = {
    username: string;
    password: string;
};

const KertyValidationCustomComponentExample = () => {
    const form = useForm<LoginForm>({
        validator: () => new SingleMessageDrivenValidator((result, { data }) => {
            console.log("validate");
            if(!data.username) {
                result.setFieldMessage("username", "Username is required");
            }
            if(!data.password) {
                result.setFieldMessage("password", "Password is required");
            }
        }),
    });
    
    const handleSubmit = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if(form.validate().isValid) {
            const data = form.getData();
            if(data.username === "Chuck" && data.password === "Norris") {
                form.applyValidationResult(new ValidationResult().set({
                    text: "Welcome, Chuck Norris!",
                    severity: Severity.Success,
                }));
            }
            else {
                form.applyValidationResult(new ValidationResult().set({
                    text: "Username or password is incorrect",
                    severity: Severity.Error,
                }));
            }
        }
    }
    
    return (
        <article>
            <form onSubmit={handleSubmit}>
                <FormValidationResult form={form}>
                    {
                        validationResult => validationResult.messages.map((message, i) => 
                            <Message key={i} {...message} />
                        )
                    }
                </FormValidationResult>
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
                            {
                                field.validationResult &&
                                <FieldMessage {...field.validationResult.messages[0]} />
                            }
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
                            {
                                field.validationResult &&
                                <FieldMessage {...field.validationResult.messages[0]} />
                            }
                        </div>
                    }
                </FormField>
                <div
                    role="group"
                    aria-label="Form actions"
                    className="flex flex-row gap-2 my-2">
                    <button type="submit">
                        Submit
                    </button>
                    <button type="button" onClick={() => form.reset()}>
                        Reset
                    </button>
                </div>
            </form>
            <button type="button" onClick={() => form.reset()}>
                Reset
            </button>
            <div>
                <FormData form={form} />
                <FormState form={form} />
            </div>
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

const FormState = <TData,>(props: {
    form: IKertyForm<TData>
}) => {
    const state = useStateWatch(props.form, state => state);
    return (
        <section>
            <p>Form state <RenderCount /></p>
            <pre>{JSON.stringify(state, null, 2)}</pre>
        </section>
    );
}

`;

export const KertyValidationCustomComponentExample = () => {
    const form = useForm<LoginForm>({
        validator: () => new SingleMessageDrivenValidator((result, { data }) => {
            console.log("validate");
            if(!data.username) {
                result.setFieldMessage("username", "Username is required");
            }
            if(!data.password) {
                result.setFieldMessage("password", "Password is required");
            }
        }),
    });
    
    const handleSubmit: SubmitEventHandler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if(form.validate().isValid) {
            const data = form.getData();
            if(data.username === "Chuck" && data.password === "Norris") {
                form.applyValidationResult(new ValidationResult().set({
                    text: "Welcome, Chuck Norris!",
                    severity: Severity.Success,
                }));
            }
            else {
                form.applyValidationResult(new ValidationResult().set({
                    text: "Username or password is incorrect",
                    severity: Severity.Error,
                }));
            }
        }
    }
    
    return (
        <ExampleBlock
            title="Single-message validation with reusable TextField"
            description="Uses useForm with SingleMessageDrivenValidator and a reusable TextField component to validate required username/password fields, then on submit applies a form-level success or error message."
            code={codeExample}>
            <form onSubmit={handleSubmit}>
                <FormValidationResult form={form}>
                    {validationResult => validationResult.messages.map((message, i) => <Message key={i} {...message} />)}
                </FormValidationResult>
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
                <div
                    role="group"
                    aria-label="Form actions"
                    className="flex flex-row gap-2 my-2">
                    <Button type="submit" variant="primary" rounded="rounded">
                        Submit
                    </Button>
                    <Button type="button" outlined="solid" onClick={() => form.reset()}>
                        Reset
                    </Button>
                </div>
            </form>
            <div className="grid grid-cols-2 gap-4 my-4">
                <FormData form={form} />
                <FormState form={form} />
            </div>
        </ExampleBlock>
    );
}

const FormData = <TData,>(props: {
    form: IKertyForm<TData>
}) => {
    const data = useDataWatch(props.form, data => data);
    return (
        <section className="my-4">
            <p className="flex items-center justify-between">Form data <RenderCount /></p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </section>
    );
}

const FormState = <TData,>(props: {
    form: IKertyForm<TData>
}) => {
    const state = useStateWatch(props.form, state => state);
    return (
        <section className="my-4">
            <p className="flex items-center justify-between">Form state <RenderCount /></p>
            <pre>{JSON.stringify(state, null, 2)}</pre>
        </section>
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
            {
                field.validationResult &&
                <FieldMessage message={field.validationResult.messages[0]} />
            }
        </div>
    );
}
