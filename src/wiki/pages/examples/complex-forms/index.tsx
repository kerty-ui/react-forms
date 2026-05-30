import { ExampleBlockContainer } from "../../../components/example-block-container.tsx";
import { PageHeader } from "../../../components/page-header.tsx";
import { PageBlock } from "../../../components/page-block.tsx";
import { ReactFormExample } from "./_react-form-example.tsx";
import { KertyUseFormWatchExample } from "./_kerty-use-form-watch-example.tsx";

export function Component() {
    return (
        <article>
            <PageHeader
                title="Complex Forms"
                subtitle="When your forms become slightly complicated"
            />
            <PageBlock>
                <p>If your forms have <b>nested objects</b> and <b>arrays</b> — this is where Kerty Forms state handling stays simple.</p>
                <p>Keep using <i><b className="text-white">setFieldValue</b></i> to update form data and use built-in collection helpers
                    <i><b className="text-white"> prependItems</b></i>,
                    <i><b className="text-white"> appendItems</b></i>,
                    <i><b className="text-white"> insertItems</b></i>,
                    <i><b className="text-white"> removeItems</b></i>,
                    <i><b className="text-white"> swapItem</b></i>,
                    <i><b className="text-white"> moveItem</b></i>, and
                    <i><b className="text-white"> updateItem </b></i>
                    to manage array fields.
                </p>
            </PageBlock>
            <ExampleBlockContainer>
                <ReactFormExample />
                <KertyUseFormWatchExample />
            </ExampleBlockContainer>
        </article>
    );
}
