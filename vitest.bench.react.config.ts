import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { PerFileBenchmarkReporter } from "./tests/benchmarks/benchmarkPerFileReporter";

// Render benchmarks mount real components, so unlike vitest.bench.config.ts they
// need the react plugin and a DOM.
export default defineConfig({
    plugins: [react()],
    test: {
        globals: false,
        environment: "jsdom",
        include: [],
        benchmark: {
            include: ["tests/benchmarks/**/*.bench.tsx"],
            reporters: [new PerFileBenchmarkReporter()],
        },
    },
});
