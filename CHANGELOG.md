# Changelog

## 2.1.3

- Migrated linting from Biome to Oxlint 1.77.0 while preserving the accepted
  explicit rule set.
- Enabled four targeted type-aware Oxlint checks for promises, invalid awaits,
  and deprecated APIs through the `oxlint-tsgolint` backend.
- Validated reporter output chunks before forwarding them and normalized
  event-callback and test-stream rejection values to `Error` instances.
- Made npm the only supported package manager, replaced `yarn.lock` with
  `package-lock.json`, and added package-manager validation for development.
- Preserved native `node:test` success semantics when a failing test is marked
  as TODO.
- Exported a structural `SuiteOutput` contract so programmatic API declarations
  do not require the consumer's ambient `NodeJS` namespace solely for reporter
  output.
- Regenerated the npm lockfile with source and integrity metadata for every
  resolved package.

## 2.1.2

- Stopped generating JavaScript and declaration source maps and excluded map
  files from the published npm package.
- Updated the recommended npm test script to `fwa --prune` so compiled tests
  without matching source files are removed during normal test runs.
- Updated `get-tsconfig` to 4.14.1, Biome to 2.5.7, and the Node.js 22 type
  definitions to 22.20.1.

## 2.1.1

- Added Russian and Simplified Chinese translations for the README and
  user-facing guides, with cross-language navigation and English as the
  authoritative source.
- Included generated JavaScript and declaration source maps in the published
  npm package.

## 2.1.0

- Added `prepareSuite`, `runPreparedSuite`, and `runSuiteAsync` for
  programmatic orchestration with plans, execution events, structured results,
  `AbortSignal` cancellation, and no runner-owned `process.exitCode` changes.
- Kept asynchronous reporter output caller-owned and waited for pending writes
  and output errors before settling a suite result.
- Migrated project compilation to TypeScript 7.0.2 and linting from ESLint to
  Biome 2.5.6.
- Removed the TypeScript peer dependency so `fwa` no longer constrains or loads
  the consumer's compiler package.
- Moved `rootDir`, `outDir`, and `extends` resolution to a dedicated lightweight
  config parser without a compiler runtime dependency, native child process, or
  full project snapshot.
- Left validation of unrelated compiler options and source files to the
  consumer's build.
- Rejected config errors that prevent resolving `extends`, `rootDir`, or
  `outDir` instead of silently continuing with fallback paths.
- Kept package-root imports lightweight by deferring suite infrastructure and
  config parser initialization until an API operation is invoked.
- Reworked test discovery as iterative depth-first traversal with a shared
  accumulator while preserving deterministic execution order.
- Clarified that tests run on the current Node.js runtime and compatibility
  with other runtime versions remains the consuming project's CI responsibility.

## 2.0.7

- Restricted `--prune` to dedicated output directories inside the selected
  project root, including protection against symlinks to external directories.
- Deferred stale compiled test deletion until every remaining compiled test
  passes freshness validation.
- Made test discovery and diagnostics use locale-independent deterministic
  ordering.
- Stopped the default TypeScript config lookup from searching parent
  directories and made an omitted `rootDir` resolve to the directory containing
  the selected config.
- Routed custom log callbacks consistently for stale-test and empty-suite
  diagnostics.
- Reduced `--help` and `--version` startup work by loading suite infrastructure
  only when tests are executed.
- Routed native test-runner output, stream errors, and exit-code updates through
  explicit runtime dependencies.
- Aligned the CLI, programmatic API, and stale-artifact guides with current
  runtime behavior.

## 2.0.6

- Reconstructed the changelog history for the previous 2.0.x releases.

## 2.0.5

- Clarified the npm package description and keywords.
- Normalized package metadata for npm publication.
- Kept `bugs` and `homepage` out of package metadata.
- Stopped publishing source map files in the npm package.

## 2.0.4

- Refined the README as the main package entry point.
- Kept detailed usage, TypeScript config, stale test, and API material in
  separate documentation pages.

## 2.0.3

- Reworked README structure around the current runner contract.
- Added dedicated documentation pages for CLI usage, TypeScript config,
  stale compiled tests, and public API.
- Removed legacy git-flow documentation from the current package docs.

## 2.0.2

- Added Quick Start documentation for the build-then-test flow.
- Clarified that `fwa` does not compile TypeScript.
- Added `--node-args` usage examples.

## 2.0.1

- Added runtime validation for Node.js test runner features.
- Reported a clear CLI error when `--isolation` is used on unsupported Node.js
  versions.
- Reported a clear CLI error when `--node-args` is used on unsupported Node.js
  versions.
- Improved CLI error output so user-facing failures are printed without a stack
  trace.

## 2.0.0-alpha

- Reintroduced `fwa` as a compiled TypeScript test runner for Node.js.
- Added the `fwa` CLI entrypoint.
- Added the `runSuite` programmatic API from the package root.
- Added strict TypeScript build and lint configuration for the new codebase.
- Added TypeScript config based `rootDir` and `outDir` resolution.
- Added deterministic recursive discovery for compiled `*.test.js` files.
- Added support for compiled `*.spec.js` test files.
- Added stale compiled test detection.
- Added explicit stale compiled test pruning with `--prune`.
- Added `--help` / `-h` and `--version` / `-v`.
- Added current-directory execution when no project root is passed.
- Added positional project root support.
- Added `--project` / `-p` support matching the `tsc --project`
  file-or-directory shape.
- Added `--isolation` / `-i` support for native `node:test` isolation mode.
- Added `--node-args` support for passing Node.js flags to isolated test
  processes.
- Declared TypeScript as a peer dependency.
- Excluded source files, docs, tests, and local tooling from the published npm
  package.
- Added README documentation for the modern compiled runner flow.

## 1.1.4

- Updated the legacy package release for the Nebbia module.

## 1.1.3

- Improved legacy configuration file parsing.

## 1.1.2

- Added legacy configuration file loading.

## 1.0.1

- Published the original `fwa` package line for component views on JavaScript
  template literals.

## 0.0.0

- Published the initial npm package.
- The corresponding source snapshot is not present in the current git history.
