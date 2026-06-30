
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

[CLI usage](https://github.com/woodger/fwa/blob/main/docs/usage.md) | [TypeScript config](https://github.com/woodger/fwa/blob/main/docs/typescript-config.md) | [Stale compiled tests](https://github.com/woodger/fwa/blob/main/docs/stale-compiled-tests.md) | [Public API](https://github.com/woodger/fwa/blob/main/docs/api.md)

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

## When To Use

Use `fwa` when a project:

- reads `rootDir` and `outDir` from TypeScript config;
- recursively finds compiled `*.test.js` and `*.spec.js` files;
- blocks compiled tests whose source files no longer exist;
- prunes those files only when `--prune` is used;
- fails when source tests are newer than compiled tests;
- passes the final file list to native `node:test`.

It does not replace `node:test`. It prepares a safe file list before delegating
execution to the native Node.js test runner.

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
