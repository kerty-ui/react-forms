import { type ReactNode } from "react";

export const PageHeader = (props: {
    title?: ReactNode;
    subtitle?: ReactNode;
}) => (
    <header>
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {props.title}
        </h1>
        {
            props.subtitle &&
            <small className="block text-[0.85rem] text-gray-400 uppercase">{props.subtitle}</small>
        }
    </header>
);
