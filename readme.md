# fwa

[![npm version](https://img.shields.io/npm/v/fwa.svg)](https://www.npmjs.com/package/fwa)
[![node](https://img.shields.io/node/v/fwa.svg)](https://www.npmjs.com/package/fwa)
[![types](https://img.shields.io/npm/types/fwa.svg)](https://www.npmjs.com/package/fwa)
[![license](https://img.shields.io/npm/l/fwa.svg)](LICENSE)

Compiled TypeScript test runner for Node.js.

`fwa` runs JavaScript tests emitted by TypeScript, while keeping test discovery
independent from shell glob behavior.

## What It Does

`fwa`:

- reads `rootDir` and `outDir` from TypeScript config;
- recursively finds compiled `*.test.js` and `*.spec.js` files;
- blocks compiled tests whose source files no longer exist;
- prunes those files only when `--prune` is used;
- fails when source tests are newer than compiled tests;
- passes the final file list to native `node:test`.

It does not replace `node:test`. It prepares a safe file list before delegating
execution to the native Node.js test runner.

## Requirements

- Node.js `>=20.19.0`
- TypeScript project with `compilerOptions.outDir`
- compiled tests must keep the same relative path as source tests

`compilerOptions.rootDir` is optional. When it is not configured, `fwa` uses
TypeScript's parsed default.

## Installation

```sh
npm install --save-dev fwa
```

## Usage

Run tests for the current working directory:

```sh
fwa
```

Run tests for another project root:

```sh
fwa ./packages/example
```

Use a specific TypeScript project config:

```sh
fwa --project tsconfig.test.json
fwa -p tsconfig.test.json
fwa ./packages/example --project tsconfig.test.json
```

`--project` follows `tsc --project` semantics: it accepts a path to a
TypeScript config file or to a directory containing `tsconfig.json`.

The `--project <path>` value is resolved relative to the selected project root.

## package.json

Recommended script:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "fwa"
  }
}
```

When `fwa` is used from another npm package, prefer the `fwa` command instead
of calling files inside `dist` directly.

## TypeScript Config

By default, `fwa` reads:

```text
<project-root>/tsconfig.json
```

It uses the TypeScript config parser, so `extends`, relative compiler options,
and config diagnostics follow TypeScript behavior.

`compilerOptions.outDir` is required because `fwa` runs compiled JavaScript
tests. Without `outDir`, compiled output location is ambiguous for this runner.

`compilerOptions.rootDir` is optional. If it is omitted, the TypeScript parser
provides the default used by `fwa`.

## Expected Layout

The relative path from `rootDir` to a source test must match the relative path
from `outDir` to the compiled test.

Example:

```text
src/feature/example.test.ts
dist/feature/example.test.js

src/feature/example.spec.ts
dist/feature/example.spec.js
```

Both `.test` and `.spec` files are supported:

```text
source:   *.test.ts, *.spec.ts
compiled: *.test.js, *.spec.js
```

## Why Not Shell Globs

A command like this may depend on shell behavior:

```sh
node --test dist/**/*.test.js dist/**/*.spec.js
```

Different shells and environments can expand `**` differently. In npm scripts,
that makes recursive test discovery less predictable across local machines,
containers, and CI.

`fwa` avoids this by walking `outDir` itself and passing explicit file paths to
`node:test`.

## Stale Compiled Tests

`fwa` checks every discovered compiled test against its source test.

If the source test exists and the compiled file is not older, the compiled test
is runnable:

```text
src/feature/example.test.ts
dist/feature/example.test.js
```

If the source test no longer exists, execution fails without deleting files:

```text
Stale compiled tests without source found.

Run with --prune to remove them:
- dist/feature/old.test.js
```

With `--prune`, the compiled test is pruned:

```text
Pruned stale compiled tests without source:
- dist/feature/old.test.js
```

If the source test is newer than the compiled test, execution fails:

```text
Compiled tests are older than source tests.

Rebuild before npm test:
- dist/feature/example.test.js (source: src/feature/example.test.ts)
```

This prevents old compiled JavaScript tests from passing after the TypeScript
source changed.

## CLI

```text
Usage: fwa [project-root] [options]

Options:
  -p, --project <path>     TypeScript config file or directory.
  --prune                  Prune stale compiled tests without source.
  -i, --isolation <mode>   Test isolation: process or none. Default: process.
  --node-args <args...>    Pass remaining args to Node test processes.
  -h, --help               Show help.
  -v, --version            Show version.
```

Rules:

- no positional project root means current working directory;
- at most one positional project root is allowed;
- `--project` can be used once;
- `--project` expects a separate value: `--project tsconfig.test.json`;
- `--prune` prunes stale compiled tests whose source files no longer exist;
- `--isolation` can be `process` or `none`;
- `--node-args` consumes all remaining arguments;
- `--node-args` cannot be used with `--isolation none`;
- `--source-dir` and `--dist-dir` are not supported.

## Public API

The documented programmatic API is the package root import:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd()
});
```

With a custom TypeScript project config:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  tsConfigPath: 'tsconfig.test.json'
});
```

With explicit stale compiled test pruning:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  prune: true
});
```

With process isolation disabled:

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  isolation: 'none'
});
```

With custom Node.js flags for isolated test child processes:

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

Only `runSuite` and the exported TypeScript types from the package root should
be treated as public API. Internal files under `dist` are implementation
details.

## Exit Code Behavior

`fwa` does not call `process.exit()` directly.

On execution failure, or when no runnable tests are found, it sets:

```ts
process.exitCode = 1;
```

This keeps process lifecycle under Node.js control and makes the runner easier
to test.

## When It Is Useful

`fwa` is useful when a project:

- writes tests in TypeScript;
- runs compiled tests from `outDir`;
- has nested test files;
- wants deterministic recursive test discovery;
- does not want shell-specific glob behavior;
- wants protection from stale compiled tests;
- uses native `node:test`.

It is usually not needed when tests are executed directly from TypeScript
without compiled JavaScript output.
