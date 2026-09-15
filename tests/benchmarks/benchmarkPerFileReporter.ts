import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { BenchmarkReporter } from "vitest/reporters";
import { experimental_getRunnerTask } from "vitest/node";
import type { SerializedError, TestModule, TestRunEndReason } from "vitest/node";

// Minimal view of the runner task tree. Only the fields this reporter reads are
// declared, so it does not depend on vitest's internal task types.
type BenchTask = {
    id: string;
    name: string;
    type: string;
    meta?: { benchmark?: boolean };
    result?: { benchmark?: Record<string, unknown> };
    tasks?: BenchTask[];
};

type FileTask = BenchTask & { filepath: string };

type BenchmarkGroup = {
    fullName: string;
    benchmarks: Array<Record<string, unknown>>;
};

/**
 * Turns `…/getFieldPath.performance.bench.ts` into
 * `…/getFieldPath.performance.results.json`, alongside the source file.
 */
const resultsPathFor = (filepath: string): string => {
    const name = basename(filepath).replace(/\.bench\.[cm]?[jt]sx?$/, "");
    return join(dirname(filepath), `${name}.results.json`);
};

/**
 * Collects one group per suite that directly contains benchmarks, matching the
 * shape vitest's own `--outputJson` produces so the files stay usable with
 * `--compare`.
 */
const collectGroups = (file: FileTask): BenchmarkGroup[] => {
    const groups: BenchmarkGroup[] = [];

    const walk = (task: BenchTask, parentName: string): void => {
        const fullName = parentName === "" ? task.name : `${parentName} > ${task.name}`;
        const benchmarks: Array<Record<string, unknown>> = [];

        for (const child of task.tasks ?? []) {
            const benchmark = child.meta?.benchmark === true ? child.result?.benchmark : undefined;
            if (benchmark != null) {
                // `samples` is dropped for the same reason vitest drops it: it
                // holds every raw timing and dwarfs the rest of the report.
                benchmarks.push({ id: child.id, ...benchmark, samples: [] });
            }
        }

        if (benchmarks.length > 0) {
            groups.push({ fullName, benchmarks });
        }

        for (const child of task.tasks ?? []) {
            if (child.type === "suite") {
                walk(child, fullName);
            }
        }
    };

    walk(file, "");

    return groups;
};

/**
 * Default benchmark reporter plus a JSON report per benchmark file.
 *
 * vitest's built-in `outputJson` writes a single combined file, so a filtered
 * run (`npm run bench -- isEqual`) overwrites the results of every other file.
 * Writing one report per file means each run only refreshes what it actually
 * measured.
 *
 * `--outputJson <path>` still works on top of this and is handled by the base
 * reporter, so an explicit combined report is opt-in.
 */
export class PerFileBenchmarkReporter extends BenchmarkReporter {
    async onTestRunEnd(
        testModules: readonly TestModule[],
        unhandledErrors: readonly SerializedError[],
        reason: TestRunEndReason,
    ): Promise<void> {
        await super.onTestRunEnd(testModules, unhandledErrors, reason);

        for (const testModule of testModules) {
            const file = experimental_getRunnerTask(testModule) as unknown as FileTask;
            const groups = collectGroups(file);

            if (groups.length === 0) {
                continue;
            }

            const outputFile = resultsPathFor(file.filepath);
            const outputDirectory = dirname(outputFile);

            if (!existsSync(outputDirectory)) {
                await mkdir(outputDirectory, { recursive: true });
            }

            const report = { files: [{ filepath: file.filepath, groups }] };
            await writeFile(outputFile, JSON.stringify(report, null, 2));

            this.log(`Benchmark report written to ${outputFile}`);
        }
    }
}
