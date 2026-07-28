# Public API

The documented programmatic API is the package root import:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd()
});
```

`runSuite` performs configuration and compiled-test validation synchronously,
starts the native test stream, and returns `void` after the stream is wired. It
does not return a `Promise` and cannot be awaited for suite completion.

Only `runSuite` and the exported TypeScript types from the package root should
be treated as public API. Internal files under `dist` are implementation
details.

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

Use `log` to receive runner diagnostics without replacing `console.warn`:

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
Configuration errors and stale or outdated compiled-test errors are thrown
instead. Native test reporter output is still written to the process streams.

## Runner File Exclusion

`runnerFile` excludes one JavaScript file from the discovered test list. It is
intended for custom CLI or bootstrap entrypoints that may themselves be emitted
inside the target `outDir`.

Normal programmatic API callers should omit this option. When it is needed,
prefer an absolute path; relative values follow the process working directory
during exclusion.

## Node.js Test Runner Options

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

The programmatic API throws synchronous configuration and validation errors to
the caller.

During suite execution, `fwa` does not call `process.exit()` directly. On test
failure, or when no runnable tests are found, it sets:

```ts
process.exitCode = 1;
```

Test failures are reported after `runSuite` returns because native test
execution is stream-based.

## Source Of Truth

The public API surface is defined by:

- `src/index.ts`
- `src/application/run-suite.ts`

Use this document as a usage guide. The exported TypeScript declarations remain
the source of truth for the exact option shape.
