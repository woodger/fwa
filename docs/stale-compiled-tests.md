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

## Source Of Truth

The stale compiled test check is implemented in:

- `src/infrastructure/test-files.ts`
- `src/application/run-suite.ts`

Use this document as the behavior guide. The code and tests remain the source of
truth for exact diagnostics and pruning behavior.
