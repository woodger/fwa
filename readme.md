# fwa

[![npm version](https://img.shields.io/npm/v/fwa.svg)](https://www.npmjs.com/package/fwa)
[![node](https://img.shields.io/node/v/fwa.svg)](https://www.npmjs.com/package/fwa)
[![types](https://img.shields.io/npm/types/fwa.svg)](https://www.npmjs.com/package/fwa)
[![license](https://img.shields.io/npm/l/fwa.svg)](LICENSE)

Compiled TypeScript test runner for [Node.js®](https://nodejs.org).

`fwa` runs JavaScript tests emitted by TypeScript, while keeping recursive test
discovery deterministic and independent from shell glob behavior.

It does not replace `node:test`. It prepares a safe file list before delegating
execution to the native Node.js test runner.

## Documentation

- [CLI usage](https://github.com/woodger/fwa/blob/develop/docs/usage.md)
- [TypeScript config](https://github.com/woodger/fwa/blob/develop/docs/typescript-config.md)
- [Stale compiled tests](https://github.com/woodger/fwa/blob/develop/docs/stale-compiled-tests.md)
- [Public API](https://github.com/woodger/fwa/blob/develop/docs/api.md)

## When To Use

Use `fwa` when a project:

- writes tests in TypeScript;
- runs compiled tests from `outDir`;
- has nested test files;
- wants deterministic recursive test discovery;
- wants protection from stale compiled test files.

It is usually not needed when tests are executed directly from TypeScript
without compiled JavaScript output.

## Requirements

- Node.js `>=20.19.0`
- TypeScript `^6.0.0` installed in the consuming project
- TypeScript project with `compilerOptions.outDir`
- compiled tests must keep the same relative path as source tests

`typescript` must be installed in the consuming project because `fwa` reads
tsconfig through the TypeScript compiler API.

Some CLI options depend on newer `node:test` runtime features:

- `--isolation` requires Node.js `>=22.8.0`;
- `--node-args` requires Node.js `>=22.10.0`.

When these options are used on an older Node.js version, `fwa` fails with an
explicit error instead of silently ignoring unsupported runtime behavior.

## Installation

```sh
npm install --save-dev fwa
```

## Quick Start

Recommended script:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "fwa"
  }
}
```

Run:

```sh
npm run build
npm test
```

`fwa` does not compile TypeScript. It expects compiled JavaScript tests to
already exist in `outDir`.

## CLI

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
```

Pass Node.js flags to isolated test child processes:

```sh
fwa --node-args --no-warnings --conditions=development
```

`--node-args` must be the last `fwa` option because all following arguments are
passed to Node.js test processes.

## Public API

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
