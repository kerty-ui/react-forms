import { ExampleBlockContainer } from "../../../components/example-block-container.tsx";
import { PageHeader } from "../../../components/page-header.tsx";
import { PageBlock } from "../../../components/page-block.tsx";
import { ReactValidationExample } from "./_react-validation-example.tsx";
import { KertyValidationExample } from "./_kerty-validation-example.tsx";

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
                <KertyValidationExample />
            </ExampleBlockContainer>
        </article>
    );
}
