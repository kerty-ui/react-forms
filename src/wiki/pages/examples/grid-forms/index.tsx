import { PageHeader } from "../../../components/page-header.tsx";
import { PageBlock } from "../../../components/page-block.tsx";
import { ReactFormExample } from "./_react-form-example.tsx";
import { KertyUseFormWatchExample } from "./_kerty-use-form-watch-example.tsx";
import { KertyFormFieldExample } from "./_kerty-form-field-example.tsx";
import { KertyCustomFieldExample } from "./_kerty-custom-field-example.tsx";

export function Component() {
    return (
        <article>
            <PageHeader
                title="Grid forms"
                subtitle="When the real struggles starts"
            />
            <PageBlock>
                <p>Keep in mind that Kerty Forms is not designed for large-scale grid editing.</p>
                <p>For grids exceeding 10,000 editable fields, a dedicated grid library would be the more appropriate choice.</p>
            </PageBlock>
            <div className="grid grid-rows-[auto_auto_auto_1fr] gap-4 my-8 min-w-0 [&>*]:min-w-0">
                <ReactFormExample />
                <KertyUseFormWatchExample />
                <KertyFormFieldExample />
                <KertyCustomFieldExample />
            </div>
        </article>
    );
}
