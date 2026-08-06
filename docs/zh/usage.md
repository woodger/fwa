# CLI 用法

[English](../usage.md) | [Русский](../ru/usage.md) | 简体中文

`fwa` 是对原生 `node:test` 的 CLI 封装，用于运行已编译的 TypeScript 测试。

它不会编译 TypeScript，也不会取代 `node:test`。它会读取目标项目的
TypeScript 配置，查找已编译的 JavaScript 测试文件，检查它们是否仍与
TypeScript 源测试对应，然后将最终文件列表传递给 Node.js 原生测试运行器。

该运行器不会限制项目所使用的 TypeScript 版本，也不会加载使用方项目中的
`typescript` 包。

## Node.js 运行时

`fwa` 使用启动 CLI 的同一个 Node.js 可执行文件来运行已编译测试。它不会选择、
下载或管理其他 Node.js 运行时。

使用默认的 `process` 隔离时，原生测试运行器会通过当前运行时启动子进程。
使用 `none` 隔离时，测试在当前进程中运行。`--node-args` 会向隔离的测试进程
传递参数，但不会选择其他可执行文件。

`fwa` 本身要求 Node.js `>=20.19.0`。因此，成功运行 `fwa` 只能确认代码在
当前运行时上的行为。对于项目支持的其他 Node.js 版本，包括低于 `fwa`
`engines` 范围的旧版本，使用方项目必须在 CI 的兼容性或冒烟任务中单独验证。

## 推荐脚本

```json
{
  "scripts": {
    "build": "tsc",
    "test": "fwa --prune"
  }
}
```

运行：

```sh
npm run build
npm test
```

从其他 npm 包中使用 `fwa` 时，应优先调用 `fwa` 命令，而不是直接调用
`dist` 中的文件。

## 常用命令

为当前工作目录运行测试：

```sh
fwa
```

为其他项目根目录运行测试：

```sh
fwa ./packages/example
```

使用指定的 TypeScript 项目配置：

```sh
fwa --project tsconfig.test.json
fwa -p tsconfig.test.json
fwa ./packages/example --project tsconfig.test.json
```

删除已经没有对应源文件的过期已编译测试：

```sh
fwa --prune
```

向隔离的测试子进程传递 Node.js 参数：

```sh
fwa --node-args --no-warnings --conditions=development
fwa ./packages/example --node-args --no-warnings
```

`--node-args` 必须是最后一个 `fwa` 选项，因为它之后的所有参数都会传递给
Node.js 测试进程。

## 选项

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

规则：

- 未提供项目根目录位置参数时，使用当前工作目录；
- 最多只能提供一个项目根目录位置参数；
- `--project` 只能使用一次；
- `--project` 的值必须作为独立参数提供：`--project tsconfig.test.json`；
- `--project` 接受配置文件，或包含 `tsconfig.json` 的目录；
- `--project <path>` 相对于所选项目根目录解析；
- `--prune` 删除已经没有对应源文件的过期已编译测试；
- 使用 `--prune` 时，`outDir` 必须是所选项目根目录内的专用目录；
- `--isolation` 可以是 `process` 或 `none`；
- `--isolation` 要求 Node.js `>=22.8.0`；
- `--node-args` 会接收所有剩余参数；
- `--node-args` 必须是最后一个 `fwa` 选项；
- `--node-args` 要求 Node.js `>=22.10.0`；
- `--node-args` 不能与 `--isolation none` 一起使用；
- `--help`、`-h`、`--version` 和 `-v` 必须作为唯一参数使用；
- 不支持 `--source-dir` 和 `--dist-dir`。

## 退出码行为

`fwa` 不会直接调用 `process.exit()`。

执行失败或没有可运行的测试时，它会设置：

```ts
process.exitCode = 1;
```

这样可以让进程生命周期继续由 Node.js 管理，也使运行器更易于测试。

## 为什么不使用 shell glob

以下命令可能依赖 shell 的行为：

```sh
node --test dist/**/*.test.js dist/**/*.spec.js
```

不同的 shell 和环境可能以不同方式展开 `**`。因此，在 npm 脚本中递归发现
测试的行为可能在本地计算机、容器和 CI 之间产生差异。

`fwa` 会自行遍历 `outDir`，并将明确的文件路径传递给 `node:test`，从而避免
这一问题。
