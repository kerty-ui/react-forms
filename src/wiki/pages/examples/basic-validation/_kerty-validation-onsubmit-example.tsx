import { Severity, SingleMessageResults, useFormWatch } from "@kerty-ui/react-forms";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx";
import { RenderCount } from "../../../components/render-count.tsx";
import { FieldMessage } from "../../../components/field-message.tsx";
import { Message } from "../../../components/message.tsx";
import type { LoginForm } from "../../../types";
import type { SubmitEventHandler } from "react";

const codeExample = `
import { useFormWatch, SingleMessageResults, type ValidationMessage } from "@kerty-ui/react-forms";
import { Message, RenderCount } form "./components";

type LoginForm = {
    username: string;
    password: string;
};

const KertyValidationOnSubmitExample = () => {
    const [form, data, state, formValidationResult] = useFormWatch<Partial<LoginForm>>();
    
    const handleSubmit =  (e) => {
        e.stopPropagation();
        e.preventDefault();

        const result = new SingleMessageResults<LoginForm>();

        if(!data.username) {
            result.setFieldMessage("username", "Username is required");
        }

        if(!data.password) {
            result.setFieldMessage("password", "Password is required");
        }

        if(result.isValid) {
            if(data.username === "Chuck" && data.password === "Norris") {
                result.setFormMessage("Welcome, Chuck Norris!", Severity.Success);

            }
            else {
                result.setFormMessage("Username or password is incorrect");
            }
        }

        form.applyValidationResults(result);
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

    export const KertyValidationOnSubmitExample = () => {
        const [form, data, state, formValidationResult] = useFormWatch<Partial<LoginForm>>();
    
        const handleSubmit: SubmitEventHandler =  (e) => {
            e.stopPropagation();
            e.preventDefault();
    
            const result = new SingleMessageResults<LoginForm>();
    
            if(!data.username) {
                result.setFieldMessage("username", "Username is required");
            }
    
            if(!data.password) {
                result.setFieldMessage("password", "Password is required");
            }
    
            if(result.isValid) {
                if(data.username === "Chuck" && data.password === "Norris") {
                    result.setFormMessage("Welcome, Chuck Norris!", Severity.Success);
    
                }
                else {
                    result.setFormMessage("Username or password is incorrect");
                }
            }
    
            form.applyValidationResults(result);
        }
        
        return (
            <ExampleBlock
                title="Kerty manual validation on submit"
                description={
                    <>
                        <p>This example demonstrates manual, submit-time validation using <b>useFormWatch</b> without a pre-configured validator instead, validation logic is handled entirely inside the submit handler.</p>
                    </>
                }
                code={codeExample}
                codeHighlightedRows={[10, 12, 13, 22, 25, 29, 34, 38, 42, 44, 50, 52, 60, 62, 68]}>
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
                    <section>
                        <p className="flex items-center justify-between">Form data <RenderCount /></p>
                        <pre>{JSON.stringify(data, null, 2)}</pre>
                    </section>
                    <section>
                        <p className="flex items-center justify-between">Form state <RenderCount /></p>
                        <pre>{JSON.stringify(state, null, 2)}</pre>
                    </section>
                </div>
            </ExampleBlock>
        );
    }
