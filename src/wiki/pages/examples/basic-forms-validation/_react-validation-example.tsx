import { useState, type SubmitEventHandler } from "react";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx";
import { RenderCount } from "../../../components/render-count.tsx";
import { Message } from "../../../components/message.tsx";
import { Severity, type ValidationMessage } from "@kerty-ui/react-forms";
import type { LoginForm } from "../../../types";

const basicUseStateFormCodeExample = `

import { useState } from "react";
import { Message, RenderCount } form "./components";

type LoginForm = {
    username: string;
    password: string;
};

const ReactValidationExample = () => {
    const [data, setData] = useState<Partial<LoginForm>>({});
    const [formValidationMessage, setFormValidationMessage] = useState<ValidationMessage | null>(null);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

    const errors = {
        username: !data.username ? "Username is required" : undefined,
        password: !data.password ? "Password is required" : undefined,
    };

    const isValid = !errors.username && !errors.password;

    const updateField = (field: keyof LoginForm, value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
        setFormValidationMessage(null);
    };

    const handleSubmit:SubmitEventHandler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsSubmitted(true);

        if (!isValid) {
            return;
        }

        if (data.username === "Chuck" && data.password === "Norris") {
            setFormValidationMessage({
                text: "Welcome, Chuck Norris!",
                severity: Severity.Success,
            });
            return;
        }

        setFormValidationMessage({
            text: "Username or password is incorrect",
            severity: Severity.Error,
        });
    };

    const handleReset = () => {
        setData({});
        setFormValidationMessage(null);
        setIsSubmitted(false);
    };
    
    return (
        <article>
            <form onSubmit={handleSubmit}>
                {formValidationMessage && <Message {...formValidationMessage} />}
                <div className="field">
                    <label>Username <RenderCount /></label>
                    <input
                        placeholder="Enter your username"
                        value={state.username ?? ""}
                        onChange={e => updateField("username", e.target.value)}
                    />
                    {isValidated && usernameError && <p>{usernameError}</p>}
                </div>
                <div className="field">
                    <label>Password <RenderCount /></label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={data.password ?? ""}
                        onChange={e => updateField("password", e.target.value)}
                    />
                    {isValidated && passwordError && <p>{passwordError}</p>}
                </div>
                <div>
                    <button type="submit">
                        Submit
                    </button>
                    <button type="button" onClick={handleReset}>
                        Reset
                    </button>
                </div>
            </form>
            <div>
                <section>
                    <p>Form data <RenderCount /></p>
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </section>
                <section>
                    <p>Form state <RenderCount /></p>
                    <pre>{JSON.stringify({ isValid, isValidated }, null, 2)}</pre>
                </section>
            </div>
        </article>
    )
}
`;

export const ReactValidationExample = () => {

    const [data, setData] = useState<Partial<LoginForm>>({});
    const [formValidationMessage, setFormValidationMessage] = useState<ValidationMessage | null>(null);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

    const errors = {
        username: !data.username ? "Username is required" : undefined,
        password: !data.password ? "Password is required" : undefined,
    };

    const isValid = !errors.username && !errors.password;

    const updateField = (field: keyof LoginForm, value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
        setFormValidationMessage(null);
    };

    const handleSubmit:SubmitEventHandler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsSubmitted(true);

        if (!isValid) {
            return;
        }

        if (data.username === "Chuck" && data.password === "Norris") {
            setFormValidationMessage({
                text: "Welcome, Chuck Norris!",
                severity: Severity.Success,
            });
            return;
        }

        setFormValidationMessage({
            text: "Username or password is incorrect",
            severity: Severity.Error,
        });
    };

    const handleReset = () => {
        setData({});
        setFormValidationMessage(null);
        setIsSubmitted(false);
    };

    return (
        <ExampleBlock
            title="Manual validation with useState"
            description="Uses plain React state to validate required username/password on render, show field errors after submit, and display a form-level success/error message."
            code={basicUseStateFormCodeExample}>
            <form onSubmit={handleSubmit}>
                {formValidationMessage && <Message {...formValidationMessage} />}
                <div className="field">
                    <label>Username <RenderCount /></label>
                    <input
                        placeholder="Enter your username"
                        value={data.username ?? ""}
                        onChange={e => updateField("username", e.target.value)}
                    />
                    {isSubmitted && errors.username && <p data-severity={Severity.Error}>{errors.username}</p>}
                </div>
                <div className="field">
                    <label>Password <RenderCount /></label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={data.password ?? ""}
                        onChange={e => updateField("password", e.target.value)}
                    />
                    {isSubmitted && errors.password && <p data-severity={Severity.Error}>{errors.password}</p>}
                </div>
                <div className="flex flex-row gap-2 my-2">
                    <Button type="submit" variant="primary" rounded="rounded">
                        Submit
                    </Button>
                    <Button type="button" outlined="solid" onClick={handleReset}>
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
                    <pre>{JSON.stringify({ isValid, isSubmitted }, null, 2)}</pre>
                </section>
            </div>
        </ExampleBlock>
    );
}
