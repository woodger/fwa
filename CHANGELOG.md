# Changelog

## 2.0.7

- Clarified the documented `rootDir` fallback when `compilerOptions.rootDir`
  is omitted.
- Renamed the related test so it describes `fwa` behavior instead of the
  TypeScript parser default.

## 2.0.6

- Added this changelog with reconstructed package history.

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
