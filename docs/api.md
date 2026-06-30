# Public API

The documented programmatic API is the package root import:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd()
});
```

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

The programmatic API throws configuration and validation errors to the caller.

During suite execution, `fwa` does not call `process.exit()` directly. On test
failure, or when no runnable tests are found, it sets:

```ts
process.exitCode = 1;
```

## Source Of Truth

The public API surface is defined by:

- `src/index.ts`
- `src/application/run-suite.ts`

Use this document as a usage guide. The exported TypeScript declarations remain
the source of truth for the exact option shape.
