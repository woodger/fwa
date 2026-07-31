# 过期的已编译测试

[English](../stale-compiled-tests.md) | [Русский](../ru/stale-compiled-tests.md) | 简体中文

调用 `node:test` 之前，`fwa` 会检查每个发现的已编译测试是否都有对应的
TypeScript 源测试，并且已编译测试不早于该源文件。

这可以阻止运行失去源文件的已编译测试，并发现源测试在已编译输出生成后又被
修改的常见情况。检查依据是文件是否存在及其修改时间；它不能证明已编译内容
与源文件一致。

## 存在对应源文件

如果源测试存在，并且已编译文件不早于源文件，则可以运行该已编译测试：

```text
src/feature/example.test.ts
dist/feature/example.test.js
```

## 源测试已删除

如果源测试已不存在，执行会失败，但不会删除文件：

```text
Stale compiled tests without source found.

Run with --prune to remove them:
- dist/feature/old.test.js
```

使用 `--prune` 时，会删除已编译测试：

```text
Pruned stale compiled tests without source:
- dist/feature/old.test.js
```

删除 `outDir` 中的文件会改变文件系统状态，因此必须显式启用清理。默认行为是
执行失败，并报告应删除的文件。

如果清理删除了所有发现的测试，删除操作仍会成功。随后 `fwa` 会报告没有可运行
的测试，并设置 `process.exitCode = 1`。

为了安全，清理要求 `outDir` 是所选项目根目录内的专用目录。如果 `outDir`
就是项目根目录、解析到项目根目录之外，或是指向外部目录的符号链接，清理会被
拒绝。

删除前会验证完整的测试列表。如果其他已编译测试已过期，清理不会删除任何文件，
并且本次运行会失败，同时给出重新构建的诊断信息。

## 源测试较新

如果源测试比已编译测试更新，执行会失败：

```text
Compiled tests are older than source tests.

Rebuild before npm test:
- dist/feature/example.test.js (source: src/feature/example.test.ts)
```

运行测试前先构建项目：

```sh
npm run build
npm test
```

## 时效性检查范围

新旧检查会比较每个源测试及其已编译测试在文件系统中的修改时间。只有源测试的
时间戳比已编译文件更新时，检查才会拒绝该测试。

这只是针对常见过期测试产物的保护措施，不能证明整个项目的构建都是最新的。
它不会计算文件内容的哈希，也不会检查非测试的生产源文件是否已重新构建。
运行 `fwa` 前应始终先构建项目。

## 权威来源

过期已编译测试的检查实现在以下文件中：

- `src/infrastructure/test-files.ts`
- `src/application/run-suite.ts`

本文档是行为指南。精确的诊断信息和清理行为仍以代码和测试为准。
