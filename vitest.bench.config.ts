import { defineConfig } from "vitest/config";
import { PerFileBenchmarkReporter } from "./tests/benchmarks/benchmarkPerFileReporter";

// Benchmarks measure the plain TS utilities, so they run in node without the
// react plugin, the jsdom environment or the RTL cleanup hook — all of which
// would only add noise and startup cost.
export default defineConfig({
    test: {
        globals: false,
        environment: "node",
        include: [],
        benchmark: {
            include: ["tests/benchmarks/**/*.bench.ts"],
            reporters: [new PerFileBenchmarkReporter()],
        },
    },
});
