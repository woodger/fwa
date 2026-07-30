# Public API

The programmatic API is available from the package root:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd()
});
```

`runSuite` performs configuration and compiled-test validation synchronously,
starts the native test stream, and returns `void` after the stream is wired. It
does not return a `Promise` and cannot be awaited for suite completion. This is
the compatibility API used by the CLI.

For orchestration code, use the two-phase API:

```ts
import {
  prepareSuite,
  runPreparedSuite
} from 'fwa';

const plan = prepareSuite({
  projectDir: process.cwd(),
  prune: true
});

const result = await runPreparedSuite(plan, {
  onEvent: (event) => {
    if (event.type === 'summary') {
      console.info(event.data);
    }
  }
});

if (result.status === 'failed') {
  // Decide how this suite affects the orchestration run.
}
```

`prepareSuite` resolves the TypeScript project, discovers compiled tests, and
checks stale output without starting tests or changing `process.exitCode`. It
returns a `SuitePlan` containing the resolved directories and test-file list.
`runPreparedSuite` executes that snapshot. An empty plan returns
`{ status: 'empty', exitCode: 1 }` and does not start Node's test runner.

For the common one-call case, use `runSuiteAsync`:

```ts
import { runSuiteAsync } from 'fwa';

const result = await runSuiteAsync({
  projectDir: process.cwd(),
  output: process.stdout
});
```

`runSuiteAsync` is equivalent to preparation followed by execution and returns
a `Promise<SuiteRunResult>`. Configuration and preparation errors reject the
promise. Test failures resolve with `status: 'failed'`; runner, reporter, and
output-stream errors reject it. The result includes `testFiles`, test counts,
the execution duration, and an `exitCode` value for orchestration decisions.

The asynchronous API is library-oriented: it does not write reporter output
unless `output` is supplied and never mutates `process.exitCode`.

The four functions shown above and the exported TypeScript types from the
package root are the public API. Internal files under `dist` are
implementation details.

## TypeScript Project Config

Use `tsConfigPath` to select a config file or a directory containing
`tsconfig.json`:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  tsConfigPath: 'tsconfig.test.json'
});
```

The option follows the same file-or-directory shape as `tsc --project`.
Relative paths are resolved from `projectDir`.

Config parsing is internal to `fwa`. Calling `runSuite` does not load or
constrain the consuming project's `typescript` package.

## Pruning

Use `prune` to remove compiled tests whose source files no longer exist:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  prune: true
});
```

Pruning is disabled by default.

For safety, pruning requires the configured `outDir` to be a dedicated
directory inside `projectDir`.

If pruning removes every discovered test, the files are still removed and the
run then reports an empty suite through `log` and sets `process.exitCode = 1`.

## Diagnostic Output

Use `log` to receive preparation diagnostics without replacing `console.warn`:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  log: (message) => {
    console.info(message);
  }
});
```

The callback receives successful prune diagnostics and the empty-suite message.
Errors that prevent resolving the selected TypeScript config, its `extends`
chain, or its `rootDir` and `outDir` paths are thrown, as are stale or outdated
compiled-test errors. Other TypeScript compiler diagnostics remain the
responsibility of the consumer's build. In the asynchronous API, use `log` for
preparation diagnostics and `output` or `onEvent` for execution output.

`onEvent` receives normalized `pass`, `fail`, `summary`, `stdout`, and `stderr`
events. The `data` field preserves the corresponding native `node:test` event
payload.

## Runner File Exclusion

`runnerFile` excludes one JavaScript file from the discovered test list. It is
intended for custom CLI or bootstrap entrypoints that may themselves be emitted
inside the target `outDir`.

Normal programmatic API callers should omit this option. When it is needed,
prefer an absolute path; relative values follow the process working directory
during exclusion.

## Node.js Test Runner Options

`runSuite` uses the Node.js executable of the current process. It does not
accept an external Node.js executable or manage another runtime.

With `isolation: 'process'`, native test child processes use the current
runtime. With `isolation: 'none'`, tests run in the current process. `nodeArgs`
changes only the flags passed to isolated child processes.

A `runSuite` call confirms behavior only on that runtime. Compatibility with
other Node.js versions must be verified separately by the consuming project's
CI matrix.

Disable process isolation:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  isolation: 'none'
});
```

The `isolation` option requires Node.js `>=22.8.0` when explicitly configured.

Pass Node.js flags to isolated test child processes:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  nodeArgs: [
    '--no-warnings',
    '--conditions=development'
  ]
});
```

The `nodeArgs` option requires Node.js `>=22.10.0` when explicitly configured.
It cannot be used with `isolation: 'none'`.

## Errors And Exit Code

The compatibility `runSuite` API throws synchronous configuration and
validation errors to the caller.

During compatibility suite execution, `fwa` does not call `process.exit()` directly.
On test failure, or when no runnable tests are found, it sets:

```ts
process.exitCode = 1;
```

Test failures are reported after `runSuite` returns because native test
execution is stream-based. The asynchronous orchestration API leaves exit-code
policy to the caller and reports the same outcome through `SuiteRunResult`.

## Current Working Directory

`projectDir` controls config resolution and compiled-test discovery. The native
Node test runner is still started in the caller's current process context; the
API does not temporarily call `process.chdir` or provide per-suite environment
mutation. Orchestrators that require a separate working directory or
environment should launch an isolated worker process around `fwa`.

## Source Of Truth

The public API surface is defined by:

- `src/index.ts`
- `src/application/run-suite.ts`

Use this document as a usage guide. The exported TypeScript declarations remain
the source of truth for the exact option shape.
