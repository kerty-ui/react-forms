import type { ReactNode } from "react";

export const ExampleBlockContainer = (props: {
    children: ReactNode;
}) => {
    return (
        <div className="grid lg:grid-cols-2 grid-rows-[auto_auto_auto_1fr] gap-4 my-8 min-w-0 [&>*]:min-w-0">
            {props.children}
        </div>
    );
}
