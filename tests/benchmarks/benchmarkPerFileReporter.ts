import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { BenchmarkReporter } from "vitest/reporters";
import { experimental_getRunnerTask } from "vitest/node";
import type { SerializedError, TestModule, TestRunEndReason } from "vitest/node";

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

const resultsPathFor = (filepath: string): string => {
    const name = basename(filepath).replace(/\.bench\.[cm]?[jt]sx?$/, "");
    return join(dirname(filepath), `${name}.results.json`);
};

const collectGroups = (file: FileTask): BenchmarkGroup[] => {
    const groups: BenchmarkGroup[] = [];

    const walk = (task: BenchTask, parentName: string): void => {
        const fullName = parentName === "" ? task.name : `${parentName} > ${task.name}`;
        const benchmarks: Array<Record<string, unknown>> = [];

        for (const child of task.tasks ?? []) {
            const benchmark = child.meta?.benchmark === true ? child.result?.benchmark : undefined;
            if (benchmark != null) {
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
