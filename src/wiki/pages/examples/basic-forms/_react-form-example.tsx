import { useState } from "react";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx"
import { RenderCount } from "../../../components/render-count.tsx";
import type { LoginForm } from "../../../types";

const codeExample = `

import { useState } from "react";
import { RenderCount } from "./renderCount";

type LoginForm = {
    username: string;
    password: string;
};

const ReactBasicFormExample = () => {
    const [data, setData] = useState<Partial<LoginForm>>({});
    return (
        <article>
            <div className="field">
                <label>Username <RenderCount /></label>
                <input
                    placeholder="Enter your username"
                    value={data.username ?? ""}
                    onChange={(e) => setData(prevState => ({ ...prevState, username: e.target.value }))}
                />
            </div>
            <div className="field">
                <label>Password <RenderCount /></label>
                <input
                    type="password"
                    placeholder="Enter your password"
                    value={data.password ?? ""}
                    onChange={(e) => setData(prevState => ({ ...prevState, password: e.target.value }))}
                />
            </div>
            <button type="button" onClick={() => setData({})}>
                Reset
            </button>
            <div>
                <p>Form data <RenderCount /></p>
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
        </article>
    )
}
`;

export const ReactFormExample = () => {
    const [data, setData] = useState<Partial<LoginForm>>({});
    return (
        <ExampleBlock
            title="Basic form using useState"
            description={
                <>
                    <p>A basic fully controlled form using <b>useState</b>, where each input change updates state and re-renders the component.</p>
                </>
            }
            code={codeExample}
            codeHighlightedRows={[10, 18, 27, 30]}>
            <div className="field">
                <label>Username <RenderCount /></label>
                <input
                    placeholder="Enter your username"
                    value={data.username ?? ""}
                    onChange={(e) => setData(prevState => ({ ...prevState, username: e.target.value }))}
                />
            </div>
            <div className="field">
                <label>Password <RenderCount /></label>
                <input
                    type="password"
                    placeholder="Enter your password"
                    value={data.password ?? ""}
                    onChange={(e) => setData(prevState => ({ ...prevState, password: e.target.value }))}
                />
            </div>
            <Button type="button" outlined="solid" onClick={() => setData({})}>
                Reset
            </Button>
            <div className="my-4">
                <p className="flex items-center justify-between">Form data <RenderCount /></p>
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
        </ExampleBlock>
    );
}
