import { type ReactNode } from "react";

export const PageBlock = (props: {
    title?: ReactNode;
    subtitle?: ReactNode;
    children?: ReactNode;
    className?: string;
}) => (
    <section className={"page-block my-4 " + props.className}>
        {
            (props.title || props.subtitle) &&
            <header className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold tracking-tight text-[hsl(var(--foreground))]">
                    {props.title}
                    {
                        props.subtitle &&
                        <small className="block text-[0.85rem] text-gray-400 uppercase">{props.subtitle}</small>
                    }
                </h2>
            </header>
        }
        <div className="text-[0.925rem] text-white/90 text-balance">
            {props.children}
        </div>
    </section>
);
