import { ExampleBlockContainer } from "../../../components/example-block-container.tsx";
import { PageHeader } from "../../../components/page-header.tsx";
import { PageBlock } from "../../../components/page-block.tsx";
import { ReactFormExample } from "./_react-form-example.tsx";
import { KertyUseFormWatchExample } from "./_kerty-use-form-watch-example.tsx";
import { KertyFormFieldExample } from "./_kerty-form-field-example.tsx";
import { KertyFormComponentsExample } from "./_kerty-form-components-example.tsx";

export function Component() {
    return (
        <article>
            <PageHeader
                title="Basic forms"
                subtitle="When all you want is simplicity"
            />
            <PageBlock>
                <p>If you’ve ever thought <b>"I have simple forms — why should I use a heavy external library or framework, with all the complexity, for something that can be done with useState or useReducer?"</b> - welcome to the club.</p>
                <p>Kerty Forms is a small library, around 35 kB and about 7 kB gzipped. You can use it in the same way as <i><b className="text-white">useState</b></i> but with a dedicated hook <i><b className="text-white">useFormWatch</b></i>.</p>
                <p>One listener, full form re-rendering, and fully controlled state — without the extra complexity.</p>
            </PageBlock>
            <ExampleBlockContainer>
                <ReactFormExample />
                <KertyUseFormWatchExample />
                <KertyFormFieldExample />
                <KertyFormComponentsExample />
            </ExampleBlockContainer>
        </article>
    );
}
