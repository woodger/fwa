# CLI Usage

`fwa` is a CLI wrapper around native `node:test` execution for compiled
TypeScript tests.

It does not compile TypeScript and does not replace `node:test`. It reads the
target project's TypeScript config, finds compiled JavaScript test files, checks
that they still match source TypeScript tests, and then passes the final file
list to the native Node.js test runner.

## Recommended Script

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

When `fwa` is used from another npm package, prefer the `fwa` command instead
of calling files inside `dist` directly.

## Common Commands

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

Prune stale compiled tests whose source files no longer exist:

```sh
fwa --prune
```

Pass Node.js flags to isolated test child processes:

```sh
fwa --node-args --no-warnings --conditions=development
fwa ./packages/example --node-args --no-warnings
```

`--node-args` must be the last `fwa` option because all following arguments are
passed to Node.js test processes.

## Options

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
- `--project` accepts a config file or a directory containing `tsconfig.json`;
- `--project <path>` is resolved relative to the selected project root;
- `--prune` prunes stale compiled tests whose source files no longer exist;
- `--isolation` can be `process` or `none`;
- `--isolation` requires Node.js `>=22.8.0`;
- `--node-args` consumes all remaining arguments;
- `--node-args` must be the last `fwa` option;
- `--node-args` requires Node.js `>=22.10.0`;
- `--node-args` cannot be used with `--isolation none`;
- `--source-dir` and `--dist-dir` are not supported.

## Exit Code Behavior

`fwa` does not call `process.exit()` directly.

On execution failure, or when no runnable tests are found, it sets:

```ts
process.exitCode = 1;
```

This keeps process lifecycle under Node.js control and makes the runner easier
to test.

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
