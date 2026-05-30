import { useState, type ReactNode } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHighlighter, faCheck, faCopy, faMinimize, faExpand } from "@fortawesome/free-solid-svg-icons"

interface CodeBlockProps {
    code: string;
    title?: ReactNode;
    codeHighlightedRows?: number[];
}

export function CodeBlock({ code, title, codeHighlightedRows }: CodeBlockProps) {
    const [highlight, setHighlight] = useState(false);
    const [copied, setCopied] = useState(false);
    const [fullScreen, setFullScreen] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const highlightedRows = highlight ? (codeHighlightedRows ?? []) : [];
    
    return (
        <div className={"not-prose w-full max-w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden min-w-0" 
            + (fullScreen ? " fixed top-0 left-0 w-full h-full overflow-scroll" : "")}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)_/_0.3)]">
                {title ? (
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] font-mono">
                        {title}
                    </p>
                ) : (
                    <span />
                )}
                <nav className="flex items-center gap-2">
                    {
                        codeHighlightedRows != null && codeHighlightedRows.length > 0 &&
                        <button
                            onClick={() => setHighlight((h) => !h)}
                            className={
                                "p-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-pointer"
                                + (highlight ? " bg-[hsl(var(--accent)_/_0.2)]" : "")
                            }>
                            <FontAwesomeIcon icon={faHighlighter} />
                        </button>
                    }
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-pointer"
                        title="Copy code">
                        <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                    </button>
                    <button onClick={() => setFullScreen(!fullScreen)}
                            className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-pointer">
                        <FontAwesomeIcon icon={fullScreen ? faMinimize : faExpand } />
                    </button>
                </nav>
            </div>
            <Highlight theme={themes.vsDark} code={code.trim()} language="typescript">
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <pre
                        className={`${className} w-full max-w-full p-4 text-sm overflow-x-auto`}
                        style={{
                            ...style,
                            margin: 0,
                            background: 'transparent',
                        }}>
                        {tokens.map((line, i) => (
                            <div {...getLineProps({ line, key: i })} key={i}>
                                <span className="inline-block w-8 text-right pr-4 text-[hsl(var(--muted-foreground))]">
                                    {i + 1}
                                </span>
                                {line.map((token, key) => (
                                    <span {...getTokenProps({ token, key })}
                                          key={key}
                                          className={highlightedRows.indexOf(i + 1) >= 0 ? "bg-[hsl(var(--accent)_/_0.2)]" : undefined}
                                    />
                                ))}
                            </div>
                        ))}
                    </pre>
                )}
            </Highlight>
        </div>
    );
}
