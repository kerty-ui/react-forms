import { ExampleBlockContainer } from "../../../components/example-block-container.tsx";
import { PageHeader } from "../../../components/page-header.tsx";
import { PageBlock } from "../../../components/page-block.tsx";
import { ReactValidationExample } from "./_react-validation-example.tsx";
import { KertyValidationExample } from "./_kerty-validation-example.tsx";
import { KertyValidationOnSubmitExample } from "./_kerty-validation-onsubmit-example.tsx";
import {KertyValidationCustomComponentExample} from "./_kerty-validation-custom-component-example.tsx";

export function Component() {
    return (
        <article>
            <PageHeader 
                title="Basic form validation" 
                subtitle="Choose right validation for specific usecase"
            />
            <PageBlock>
            </PageBlock>
            <ExampleBlockContainer>
                <ReactValidationExample />
                <KertyValidationOnSubmitExample />
                <KertyValidationExample />
                <KertyValidationCustomComponentExample />
            </ExampleBlockContainer>
        </article>
    );
}
