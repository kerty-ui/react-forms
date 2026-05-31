import { Suspense } from "react";
import { NavLink, Outlet, Link } from "react-router";

const navItems = [
    { to: "basic-forms", label: "Basic forms" },
    { to: "complex-forms", label: "Complex forms" },
    { to: "grid-forms", label: "Grid forms" },
    { to: "basic-validation", label: "Basic validation" },
];

const LoadingFallback = () => (
    <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
    </div>
);

export default function ExamplesLayout() {
    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] md:block">
                <div className="flex h-full flex-col">
                    <div className="border-b border-[hsl(var(--sidebar-border))] px-5 py-4">
                        <Link
                            to="/"
                            className="text-sm font-semibold text-[hsl(var(--sidebar-primary))] transition hover:text-glow"
                        >
                            ← Home
                        </Link>
                    </div>

                    <nav className="flex-1 space-y-1 px-3 py-4">
                        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            Examples
                        </p>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `block rounded-md px-3 py-2 text-sm font-medium transition ${
                                        isActive
                                            ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]"
                                            : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="border-t border-[hsl(var(--sidebar-border))] px-5 py-3">
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            @kerty-ui/react-forms
                        </p>
                    </div>
                </div>
            </aside>

            {/* Mobile header */}
            <div className="flex flex-1 flex-col min-w-0">
                <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 px-4 py-3 backdrop-blur md:hidden">
                    <Link
                        to="/"
                        className="text-sm font-semibold text-[hsl(var(--primary))]"
                    >
                        ←
                    </Link>
                    <select
                        className="flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
                        onChange={(e) => {
                            if (e.target.value) {
                                window.location.hash = `#/examples/${e.target.value}`;
                            }
                        }}
                    >
                        <option value="">Select example…</option>
                        {navItems.map((item) => (
                            <option key={item.to} value={item.to}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 lg:p-10">
                    <div className="mx-auto">
                        <Suspense fallback={<LoadingFallback />}>
                            <Outlet />
                        </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
}
