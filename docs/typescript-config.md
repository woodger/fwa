# TypeScript Config

`fwa` reads source and output directories from the target project's TypeScript
config.

By default, it reads:

```text
<project-root>/tsconfig.json
```

The default lookup does not search parent directories. Use `--project`
explicitly when the config lives elsewhere.

`fwa` does not declare a TypeScript peer dependency and does not load the
consumer's `typescript` package. The compiler version used by the consuming
project remains under that project's control.

Config paths are resolved through a dedicated lightweight parser used only by
`fwa`. This keeps runner behavior independent from TypeScript API changes in the
consumer's dependency graph without shipping a compiler as a runtime
dependency.

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

`compilerOptions.rootDir` is optional. If it is omitted, `fwa` treats the
directory containing `tsconfig.json` as the source root.

For stable source-to-output mapping, set `compilerOptions.rootDir` explicitly.
In most projects this is usually `"src"` or `"."`.

`fwa` resolves `extends` and the relative `rootDir` and `outDir` paths according
to TypeScript config behavior.

The runner does not validate unrelated compiler options, enumerate source
files, or type-check the project. The consumer's build owns those checks before
`fwa` starts. The selected config and its `extends` chain must still be
readable, syntactically valid, and resolvable. A configured
`compilerOptions.rootDir` and the required `compilerOptions.outDir` must resolve
to path strings.

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

- `src/infrastructure/tsconfig-parser.ts`
- `src/infrastructure/tsconfig-directories.ts`
- `src/bootstrap/suite.ts`

Use this document as the usage guide. The code and tests remain the source of
truth for exact parsing behavior.
