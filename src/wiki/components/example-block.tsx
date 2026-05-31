import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode, faDisplay } from "@fortawesome/free-solid-svg-icons";
import { Button } from "./button.tsx";
import { CodeBlock } from "./code-block.tsx";

export const ExampleBlock = (props: {
    title: ReactNode;
    subtitle?: ReactNode;
    description: ReactNode;
    code?: string;
    codeHighlightedRows?: number[];
    preview?: boolean;
    children: ReactNode;
}) => {
    const [state, setState] = useState<"preview" | "code">(props.preview ? "preview" : "code");
    return (
        <article className="row-span-4 grid grid-rows-subgrid min-w-0 mt-4">
            <header className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold tracking-tight text-[hsl(var(--foreground))]">
                    {props.title}
                    {
                        props.subtitle &&
                        <small className="block text-sm text-gray-400 uppercase">{props.subtitle}</small>
                    }
                </h2>
            </header>
            <div className="text-[0.9rem] text-white/80">
                {props.description}
            </div>
            <nav className="flex items-center gap-1">
                {
                    props.code &&
                    <>
                        <Button type="button"
                                outlined={state === "code" ? undefined : "dashed"}
                                onClick={() => setState(() => "code")}
                                className="w-30">
                            <FontAwesomeIcon icon={faCode} /> Code
                        </Button>
                        <Button type="button"
                                variant="default"
                                outlined={state === "preview" ? undefined : "dashed"}
                                onClick={() => setState(() => "preview")}
                                className="w-30">
                            <FontAwesomeIcon icon={faDisplay} /> Preview
                        </Button>
                    </>
                }
            </nav>
            <section className="min-w-0">
                {
                    (props.code && state === "code")
                        ? <CodeBlock
                            title={props.title}
                            code={props.code}
                            codeHighlightedRows={props.codeHighlightedRows} />
                        : props.children
                }
            </section>
        </article>
    );
};
