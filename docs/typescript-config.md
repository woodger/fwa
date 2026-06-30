# TypeScript Config

`fwa` reads source and output directories from the target project's TypeScript
config.

By default, it reads:

```text
<project-root>/tsconfig.json
```

Use `--project` to select a different config file or a directory containing
`tsconfig.json`:

```sh
fwa --project tsconfig.test.json
fwa ./packages/example --project tsconfig.test.json
```

`--project` follows the same file-or-directory shape as `tsc --project`.

## Compiler Options

`compilerOptions.outDir` is required because `fwa` runs compiled JavaScript
tests. Without `outDir`, compiled output location is ambiguous for this runner.

`compilerOptions.rootDir` is optional. If it is omitted, `fwa` uses the
TypeScript parser default.

`fwa` uses the TypeScript config parser, so `extends`, relative compiler
options, and config diagnostics follow TypeScript behavior.

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

## Source Of Truth

The runtime behavior is implemented in:

- `src/infrastructure/tsconfig-directories.ts`
- `src/bootstrap/suite.ts`

Use this document as the usage guide. The code and tests remain the source of
truth for exact parsing behavior.
