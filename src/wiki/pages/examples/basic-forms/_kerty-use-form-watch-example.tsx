import { useFormWatch } from "@kerty-ui/react-forms";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx";
import { RenderCount } from "../../../components/render-count.tsx";
import type { LoginForm } from "../../../types";

const codeExample = `
import { useFormWatch } from "@kerty-ui/react-forms";
import { RenderCount } from "./renderCount";

type LoginForm = {
    username: string;
    password: string;
};

const KertyBasicUseFormWatchExample = () => {
    const [form, data] = useFormWatch<LoginForm>();
    return (
        <article>
            <div className="field">
                <label>Username <RenderCount /></label>
                <input
                    placeholder="Enter your username"
                    value={data.username ?? ""}
                    onChange={(e) => form.setFieldValue("username", e.target.value)}
                />
            </div>
            <div className="field">
                <label>Password <RenderCount /></label>
                <input
                    type="password"
                    placeholder="Enter your password"
                    value={data.password ?? ""}
                    onChange={(e) => form.setFieldValue("password", e.target.value)}
                />
            </div>
            <button type="button" onClick={() => form.reset()}>
                Reset
            </button>
            <div>
                <p>Form data <RenderCount /></p>
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
        </article>
    );
}
`;

export const KertyUseFormWatchExample = () => {
    const [form, data] = useFormWatch<LoginForm>();
    return (
        <ExampleBlock
            title="Basic form using useFormWatch"
            description={
                <>
                    <p>A basic fully controlled form using <b>useFormWatch</b>, where every change updates the form state and re-renders the component.</p>
                </>
            }
            code={codeExample}
            codeHighlightedRows={[10, 18, 27, 30]}>
            <div className="field">
                <label>Username <RenderCount /></label>
                <input
                    placeholder="Enter your username"
                    value={data.username ?? ""}
                    onChange={(e) => form.setFieldValue("username", e.target.value)}
                />
            </div>
            <div className="field">
                <label>Password <RenderCount /></label>
                <input
                    type="password"
                    placeholder="Enter your password"
                    value={data.password ?? ""}
                    onChange={(e) => form.setFieldValue("password", e.target.value)}
                />
            </div>
            <Button type="button" outlined="solid" onClick={() => form.reset()}>
                Reset
            </Button>
            <div className="my-4">
                <p className="flex items-center justify-between">Form data <RenderCount /></p>
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
        </ExampleBlock>
    );
}
