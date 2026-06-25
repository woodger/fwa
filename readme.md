# Compiled Suite Runner

The module runs compiled TypeScript tests from `dist` through the native Node.js test runner.

The runner solves two practical problems:

1. Reliably finds nested `*.test.js` and `*.spec.js` files in `dist` without depending on shell glob behavior.
2. Protects the project from running stale compiled tests that remain after source `*.test.ts` or `*.spec.ts` files were deleted or changed.

## Purpose

In a TypeScript project, tests are written in `src`:

```
src/feature/sample.test.ts
src/feature/sample.spec.ts
```

After build, compiled files appear:

```
dist/feature/sample.test.js
dist/feature/sample.spec.js
```

If tests are run directly through shell globs:

```sh
node --test dist/**/*.test.js dist/**/*.spec.js
```

the result may depend on the shell that executes the command.

In npm scripts, a command usually goes through a shell. Not every shell handles `**` in the same way, and in some cases `dist/**/*.test.js` or `dist/**/*.spec.js` may find only tests at one nesting level while missing deeper files.

For example, these files may be found:

```
dist/feature/sample.test.js
dist/feature/sample.spec.js
```

but these files may be missed:

```
dist/feature/nested/sample.test.js
dist/feature/nested/sample.spec.js
dist/feature/nested/deep/sample.test.js
```

For this reason, the project uses a separate suite entrypoint:

```json
{
  "scripts": {
    "test": "fwa"
  }
}
```

`suite.js` recursively walks `dist` itself, collects all `*.test.js` and `*.spec.js` files at any depth, and passes the final file list to native `node:test`.

## Difference From `node --test`

This runner does not replace the native Node.js test runner.

It uses `node:test` internally, but takes responsibility for preparing the file list before execution.

Regular execution:

```sh
node --test dist/**/*.test.js dist/**/*.spec.js
```

relies on glob pattern handling outside Node.js or inside Node.js. In practice, this can be non-obvious and can depend on the environment, shell, and command form.

Execution through the suite:

```sh
node dist/suite.js
```

does not depend on shell glob behavior.

The runner performs its own recursive walk of `dist`, excludes the suite runner file itself from the test list, checks freshness of compiled files, and only then runs tests through `node:test`.

In other words:

```
node:test is responsible for executing tests.
suite.js is responsible for safely selecting test files from dist.
```

## What The Runner Does

Before running tests, the runner performs a preflight check:

1. Recursively finds all `*.test.js` and `*.spec.js` files in `dist`.
2. Excludes the runner file itself from the list.
3. Restores the expected source path for each compiled JS test.
4. Removes a compiled test if the corresponding source test no longer exists.
5. Aborts execution if the source test is newer than the compiled test.
6. Passes the remaining files to native `node:test`.

## Example Project Structure

```
project/
|-- src/
|   |-- suite.ts
|   `-- feature/
|       |-- sample.test.ts
|       |-- sample.spec.ts
|       `-- nested/
|           `-- deep.test.ts
|-- dist/
|   |-- suite.js
|   `-- feature/
|       |-- sample.test.js
|       |-- sample.spec.js
|       `-- nested/
|           `-- deep.test.js
|-- package.json
`-- tsconfig.json
```

## Usage

After installing the package, the standard run command is:

```sh
fwa
```

The `fwa` command runs project tests from the current working directory:

```
distDir = <cwd>/dist
sourceDir = <cwd>/src
projectDir = <cwd>
```

Direct execution of the compiled entrypoint inside the project itself is also supported:

```sh
node dist/suite.js
```

Recommended script in `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "npm run build && fwa"
  }
}
```

The runner does not require full deletion of `dist` before running tests.

It removes only compiled test files for which the corresponding source test file no longer exists.

## Why Not Shell Globs

A command like:

```sh
node --test dist/**/*.test.js dist/**/*.spec.js
```

looks shorter, but it has two drawbacks.

First, `**` may be processed by the shell before Node.js starts. In that case, Node.js receives an already prepared file list, not the original glob pattern.

Second, behavior may differ between environments. A local machine, CI, Docker container, and different shells may handle this glob differently.

The runner avoids this ambiguity:

```
dist is walked through fs.readdirSync()
the test file list is formed explicitly
node:test receives already prepared file paths
```

This makes test execution stable and predictable.

## Protection From Stale Compiled Tests

The runner assumes that `src` and `dist` have the same relative structure.

For example:

```
src/feature/sample.test.ts
dist/feature/sample.test.js
src/feature/sample.spec.ts
dist/feature/sample.spec.js
```

For each discovered compiled test, the runner checks the corresponding source test.

### Source Test Exists

If the source test exists and the compiled test is not older than it, the file is considered runnable:

```
src/feature/sample.test.ts
dist/feature/sample.test.js
```

### Source Test Was Deleted

If the source test no longer exists, the compiled test is considered a stale file and is removed:

```
dist/feature/old.test.js
```

Diagnostic:

```
Removed stale compiled tests without source:
- dist/feature/old.test.js
```

### Source Test Is Newer Than Compiled Test

If the source test was changed after the compiled test, execution aborts with an error:

```
Compiled tests are older than source tests.

Rebuild before npm test:
- dist/feature/sample.test.js (source: src/feature/sample.test.ts)
```

This means that `dist` does not match the current state of `src`, and the project must be rebuilt.

## Public API

### `collectTestFiles(dir, extensions)`

Recursively collects test files with the specified extension or extensions.

```ts
const files = collectTestFiles('dist', ['.test.js', '.spec.js']);
```

The function is used for explicit directory traversal without shell glob.

Supported extensions:

```ts
type TestExtension = '.test.js' | '.test.ts' | '.spec.js' | '.spec.ts';
```

### `removeCompiledTestsWithoutSource(testFiles, options)`

Checks compiled test files before execution.

```ts
const runnableFiles = removeCompiledTestsWithoutSource(testFiles, {
  distDir: 'dist',
  sourceDir: 'src',
  projectDir: process.cwd()
});
```

The function returns only compiled test files that can be executed.

If the source test is missing, the compiled test is removed.

If the source test is newer than the compiled test, the function throws an error.

### `runSuite(options?)`

Runs the full check and test execution cycle.

```ts
runSuite();
```

With parameters:

```ts
runSuite({
  distDir: path.resolve(__dirname),
  projectDir: path.resolve(__dirname, '..'),
  sourceDir: path.resolve(__dirname, '../src'),
  runnerFile: __filename
});
```

Usually parameters are not needed if the runner is located in `src/suite.ts` and lands in `dist/suite.js` after build.

## Options

### `distDir`

Directory with compiled JS files.

Usually this is the directory of the current compiled runner:

```ts
const distDir = path.resolve(__dirname);
```

### `sourceDir`

Directory with source TS files.

Usually:

```ts
const sourceDir = path.join(projectDir, 'src');
```

### `projectDir`

Project root.

Used to format paths in diagnostics:

```
dist/feature/sample.test.js
src/feature/sample.test.ts
dist/feature/sample.spec.js
src/feature/sample.spec.ts
```

Messages do not use absolute paths so output is identical locally, in a container, and in CI.

### `runnerFile`

Path to the runner file.

Needed so the runner can exclude itself from the list of runnable tests.

### `log`

Optional function for diagnostic messages.

```ts
runSuite({
  log: (message) => {
    console.warn(message);
  }
});
```

This is convenient for tests where diagnostic output must be checked without replacing `console.warn`.

## Exit Code Behavior

`runSuite()` does not call `process.exit()` directly.

On execution failure or when no tests are found, the runner sets:

```ts
process.exitCode = 1;
```

This approach is safer:

* the process does not terminate in the middle of a test;
* the module is easier to cover with unit tests;
* calling code keeps control over the process lifecycle.

## Limitations

The runner is designed for a standard TypeScript build where the relative structure of `src` and `dist` matches.

Supported case:

```
src/a/b/example.test.ts
dist/a/b/example.test.js
src/a/b/example.spec.ts
dist/a/b/example.spec.js
```

If the build changes the directory structure, the runner cannot correctly restore the source path from the compiled path without additional configuration.

## When The Runner Is Useful

The runner is useful when a project:

* writes tests in TypeScript;
* runs compiled tests from `dist`;
* does not want to rely on shell globs such as `dist/**/*.test.js` and `dist/**/*.spec.js`;
* has nested test files;
* does not fully clean `dist` before each run;
* wants protection from stale compiled tests;
* uses the native Node.js test runner.

## When The Runner Is Not Needed

The runner is usually not needed if a project runs TypeScript tests directly without an intermediate `dist`.

The runner may also be excessive if `dist` is fully deleted before every build and then created again, and test execution does not depend on shell glob.

## Testing The Runner

For runner unit tests, it is convenient to create a temporary project structure:

```ts
const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-runner-'));
const distDir = path.join(projectDir, 'dist');
const sourceDir = path.join(projectDir, 'src');
```

Cleanup is better done inside each test through `t.after()`:

```ts
test('removes stale compiled test', (t) => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-runner-'));

  t.after(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  // test body
});
```

This keeps each test independent and avoids dependence on shared mutable setup.

## Summary

`suite.js` is not a separate test framework.

It is a small entrypoint on top of native `node:test` that makes running compiled TypeScript tests more reliable:

```
without shell glob
with recursive dist traversal
with protection from stale compiled tests
with an explicit file list for node:test
```
