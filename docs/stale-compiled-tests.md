# Stale Compiled Tests

`fwa` checks every discovered compiled test against its source TypeScript test
before calling `node:test`.

This prevents old compiled JavaScript tests from passing after source tests were
deleted or changed.

## Matching Source Exists

If the source test exists and the compiled file is not older, the compiled test
is runnable:

```text
src/feature/example.test.ts
dist/feature/example.test.js
```

## Source Test Was Deleted

If the source test no longer exists, execution fails without deleting files:

```text
Stale compiled tests without source found.

Run with --prune to remove them:
- dist/feature/old.test.js
```

With `--prune`, the compiled test is removed:

```text
Pruned stale compiled tests without source:
- dist/feature/old.test.js
```

Pruning is explicit because deleting files from `outDir` changes filesystem
state. The default behavior is to fail and report what should be removed.

For safety, pruning requires `outDir` to be a dedicated directory inside the
selected project root. It is rejected when `outDir` is the project root,
resolves outside it, or is a symlink to an external directory.

The full test list is validated before deletion. If another compiled test is
outdated, pruning does not remove any files and the run fails with the rebuild
diagnostic.

## Source Test Is Newer

If the source test is newer than the compiled test, execution fails:

```text
Compiled tests are older than source tests.

Rebuild before npm test:
- dist/feature/example.test.js (source: src/feature/example.test.ts)
```

Run the project build before running tests:

```sh
npm run build
npm test
```

## Freshness Check Scope

The freshness check compares filesystem modification times for each source test
and its compiled test. It rejects a source test only when its timestamp is newer
than the compiled file.

This is a guard against common stale test artifacts, not proof that the entire
project build is current. It does not hash file contents or check whether
non-test production sources were rebuilt. Always run the project build before
`fwa`.

## Source Of Truth

The stale compiled test check is implemented in:

- `src/infrastructure/test-files.ts`
- `src/application/run-suite.ts`

Use this document as the behavior guide. The code and tests remain the source of
truth for exact diagnostics and pruning behavior.
