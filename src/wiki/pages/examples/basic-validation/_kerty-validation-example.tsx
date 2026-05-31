import { Severity, SingleMessageDrivenValidator, ValidationResult, useFormWatch } from "@kerty-ui/react-forms";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx";
import { RenderCount } from "../../../components/render-count.tsx";
import { FieldMessage } from "../../../components/field-message.tsx";
import { Message } from "../../../components/message.tsx";
import type { LoginForm } from "../../../types";
import type { SubmitEventHandler } from "react";

const codeExample = `
import { useFormWatch, SingleMessageDrivenValidator, ValidationResult,
    ValidationMessage, Severity } from "@kerty-ui/react-forms";
import { Message, RenderCount } form "./components";

type LoginForm = {
    username: string;
    password: string;
};

const KertyBasicValidationExample = () => {
    const [form, data, state, formValidationResult] = useFormWatch<Partial<LoginForm>>({
        validator: () => new SingleMessageDrivenValidator((result, { data }) => {
            if(!data.username) {
                result.setFieldMessage("username", "Username is required");
            }
            if(!data.password) {
                result.setFieldMessage("password", "Password is required");
            }
        }),
    });
    
    const handleSubmit =  (e) => {
        e.stopPropagation();
        e.preventDefault();
        if(form.validate().isValid) {
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
                {
                    formValidationResult?.messages.map((message, i) => 
                        <Message key={i} {...message} />
                    )
                }
                <div className="field">
                    <label>Username <RenderCount /></label>
                    <input
                        placeholder="Enter your username"
                        value={data.username ?? ""}
                        onChange={(e) => form.setFieldValue("username", e.target.value)}
                    />
                    <FieldMessage message={form.getFieldValidationMessage("username")} />
                </div>
                <div className="field">
                    <label>Password <RenderCount /></label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={data.password ?? ""}
                        onChange={(e) => form.setFieldValue("password", e.target.value)}
                    />
                    <FieldMessage message={form.getFieldValidationMessage("password")} />
                </div>
                <div>
                    <button type="submit">
                        Submit
                    </button>
                    <button type="button" onClick={() => form.reset()}>
                        Reset
                    </button>
                </div>
            </form>
            <div>
                <div>
                    <p>Form data <RenderCount /></p>
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
                <div>
                    <p>Form state <RenderCount /></p>
                    <pre>{JSON.stringify(state, null, 2)}</pre>
                </div>
            </div>
        </article>
    );
}

const FieldMessage = (props: {
    message: ValidationMessage,
}) => {
    return props.message 
        ? <p data-severity={props.message.severity}>{props.message.text}</p> 
        : null;
}

`;

export const KertyValidationExample = () => {
    const [form, data, state, formValidationResult] = useFormWatch<Partial<LoginForm>>({
        validator: () => new SingleMessageDrivenValidator((result, { data }) => {
            if(!data.username) {
                result.setFieldMessage("username", "Username is required");
            }
            if(!data.password) {
                result.setFieldMessage("password", "Password is required");
            }
        }),
    });

    const handleSubmit: SubmitEventHandler =  (e) => {
        e.stopPropagation();
        e.preventDefault();
        if(form.validate().isValid) {
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
            title="Single message-driven validator"
            description={
                <>
                    <p>This example shows usage of <b>useFormWatch</b> and <b>SingleMessageDrivenValidator</b> to validate form fields.</p>
                    <p>The hook exposes <b>form</b>, <b>data</b>, <b>state</b>, and <b>formValidationResult</b> — giving you granular control over field values, form state, and validation output.</p>
                </>
            }
            code={codeExample}
            codeHighlightedRows={[11, 29, 35, 42, 48, 50, 58, 60, 66]}>
            <form
                onSubmit={handleSubmit}>
                {formValidationResult?.messages.map((message, i) => <Message key={i} {...message} />)}
                <div className="field">
                    <label>Username <RenderCount /></label>
                    <input
                        placeholder="Enter your username"
                        value={data.username ?? ""}
                        onChange={(e) => form.setFieldValue("username", e.target.value)}
                    />
                    <FieldMessage message={form.getFieldValidationMessage("username")} />
                </div>
                <div className="field">
                    <label>Password <RenderCount /></label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={data.password ?? ""}
                        onChange={(e) => form.setFieldValue("password", e.target.value)}
                    />
                    <FieldMessage message={form.getFieldValidationMessage("password")}/>
                </div>
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
                <div>
                    <p className="flex items-center justify-between">Form data <RenderCount /></p>
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
                <div>
                    <p className="flex items-center justify-between">Form state <RenderCount /></p>
                    <pre>{JSON.stringify(state, null, 2)}</pre>
                </div>
            </div>
        </ExampleBlock>
    );
}
