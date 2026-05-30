import { Link } from "react-router";

const examples = [
    {
        to: "/examples/basic-forms",
        title: "Basic Forms",
        description: "Forms don’t have to start complex - keep simple forms simple. Not every form needs field-level optimization. It’s okay to re-render the whole form on each change. For most small and medium forms, the performance impact will be minimal.",
    },
    {
        to: "/examples/complex-forms",
        title: "Complex Forms",
        description: "Complex forms don’t have to mean complicated code. Kerty Forms is designed to handle nested objects and arrays in a predictable way, so working with them feels no different from working with simple primitive fields.",
    },
    {
        to: "/examples/validation",
        title: "Validation",
        description: "Attach rules to fields however you like. Run them all on submit, or group them into rule sets so you can validate differently depending on context.",
    }
];

export function Component() {
    return (
        <div className="min-h-screen">

            <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 py-20 overflow-hidden">

                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(hsl(82 85% 55%) 1px, transparent 1px), linear-gradient(90deg, hsl(82 85% 55%) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />

                <div className="relative z-10 max-w-3xl text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-mono">
                        <span>v1.0.0 — Now available</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
                        <span className="text-primary text-glow">Kerty react forms</span>
                    </h1>
                    <p className="text-foreground text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1]">
                        Yes, another React form library but this one tries to be simple.
                    </p>
                    <div className="max-w-xl mx-auto space-y-4">
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            It provides immutable updates, dirty and touched tracking, field-level subscriptions, validation management, and handles deeply nested objects and arrays with ease.
                        </p>
                    </div>
                </div>
            </section>
            <section className="mx-auto max-w-5xl px-4 pb-24">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {examples.map((ex) => (
                        <Link
                            key={ex.to}
                            to={ex.to}
                            className="group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition hover:border-[hsl(var(--primary)_/_0.4)] hover:border-glow">
                            <h2 className="text-base font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                                {ex.title}
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                                {ex.description}
                            </p>
                            <span className="mt-4 inline-block text-xs font-medium text-[hsl(var(--primary))] opacity-0 transition group-hover:opacity-100">
                                View example →
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
