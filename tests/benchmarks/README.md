# Benchmarks

Micro-benchmarks for the hot utilities behind `KertyForm`: field path parsing,
value reads, value writes and dirty-check comparisons.

## Running

```bash
npm run bench          # single run, all benchmarks (~4 min)
npm run bench:watch    # watch mode
```

Both use `vitest.bench.config.ts`, which runs in the `node` environment without
the React plugin, jsdom or the RTL cleanup hook — the utilities under test are
plain TypeScript, so that setup would only add noise and startup cost.

Benchmarks are **not** picked up by `npm test`: `vitest.config.ts` only includes
`tests/**/*.spec.{ts,tsx}`.

To run a single file or group:

```bash
npx vitest bench --run --config vitest.bench.config.ts tests/benchmarks/isEqual.performance.bench.ts
npx vitest bench --run --config vitest.bench.config.ts -t "data size"
```

## Saved reports

Every run writes a JSON report **per benchmark file**, next to the source:

```
tests/benchmarks/getFieldPath.performance.bench.ts
tests/benchmarks/getFieldPath.performance.results.json   ← generated
```

These are gitignored. A filtered run only rewrites the files it actually
measured, so `npm run bench -- isEqual` leaves the other reports intact — which
is why this uses the custom `PerFileBenchmarkReporter` instead of vitest's
built-in `benchmark.outputJson`, whose single combined path would be overwritten
by every filtered run.

Use a saved report as a baseline to see what a change did:

```bash
npm run bench -- isEqual                                                  # baseline
# …edit isEqual.ts…
npm run bench -- isEqual --compare tests/benchmarks/isEqual.performance.results.json
```

Each task then prints a `[1.07x] ⇑` / `⇓` delta and the baseline row underneath.
Note the compared run overwrites the report afterwards, so copy it somewhere
first if you want to keep a fixed baseline:

```bash
cp tests/benchmarks/isEqual.performance.results.json tests/benchmarks/isEqual.baseline.json
```

`--outputJson <path>` still works and writes an additional combined report for
whatever ran.

## Reading the results

Vitest compares tasks **within a `describe`**, so every group is written to hold
alternatives that are meant to be compared against each other (mutable vs
immutable, cached vs cold parse, small vs large data). A number is only
meaningful relative to its neighbours in the same group — absolute `hz` values
move with machine, load and Node version.

Watch the `rme` column: anything above ~5% means the sample is noisy and the
ratio should not be trusted without a rerun on an idle machine.

## Conventions

- **Setup stays out of the measured function.** Data sets, replacement values
  and parsed paths are built at module or `describe` scope. Building the
  benchmark data inside `bench()` would measure `createBenchmarkData`, not the
  function under test.
- **`setObjectValueImmutable` never mutates its input**, so immutable benches
  share one source object across iterations.
- **`setObjectValue` mutates in place**, so each mutating bench gets its own
  data instance and only writes shape-preserving values. Writing, say, `[]` over
  `orders` would shrink the data after the first iteration and the remaining
  iterations would measure a different object.
- **Growing `KertyForm` arrays are restored inside the bench.** Vitest does not
  expose tinybench's per-iteration hooks, so `prependItems` / `insertItems`
  benches first put the original rows back with a silent `setFieldValue`.
  Without that the array would grow by one item on every iteration. The restore
  costs about 0.1 µs; the "add one item" group reports it as a separate row.
- **Throwing paths live in their own group.** `getFieldPath` rejects
  non-numeric array keys and whitespace; the throw dominates the measurement, so
  those cases are isolated and never mixed with valid shapes.
- **Sizes come from `SIZES` in `benchmarkData.ts`** so "small/medium/large" mean
  the same thing in every file.

## Files

| File | Covers |
| --- | --- |
| `benchmarkData.ts` | Deterministic form-like fixture + shared size presets |
| `perFileBenchmarkReporter.ts` | Default reporter + one JSON report per benchmark file |
| `getFieldPath.performance.bench.ts` | Path parsing by shape, cached vs uncached, invalid paths |
| `getObjectValue.performance.bench.ts` | Reads by path shape, parse strategy, data size, guards |
| `setObjectValue.performance.bench.ts` | Mutable vs immutable writes, data-size scaling, redundant-write guard |
| `removeObjectValue.performance.bench.ts` | Immutable removal vs `set(undefined)`, array splice position, data-size scaling |
| `isEqual.performance.bench.ts` | Primitives, arrays, objects, dates, circular refs, `treatNullAsDefault` |
| `kertyForm.performance.bench.ts` | `KertyForm.setFieldValue` / `prependItems` / `insertItems` / `validate` / `applyValidationResults` / `reset` by form size, with and without field listeners |
