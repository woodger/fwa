# 公共 API

[English](../api.md) | [Русский](../ru/api.md) | 简体中文

可以从包根目录导入编程 API：

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd()
});
```

`runSuite` 会同步执行配置和已编译测试的验证，启动原生测试流，并在测试流连接
完成后返回 `void`。它不返回 `Promise`，因此不能通过 `await` 等待测试套件
完成。这是 CLI 使用的兼容 API。

对于编排代码，请使用两阶段 API：

```ts
import {
  prepareSuite,
  runPreparedSuite
} from 'fwa';

const plan = prepareSuite({
  projectDir: process.cwd(),
  prune: true
});

const result = await runPreparedSuite(plan, {
  onEvent: (event) => {
    if (event.type === 'summary') {
      console.info(event.data);
    }
  }
});

if (result.status === 'failed') {
  // 由编排器决定该测试套件如何影响整体运行。
}
```

`prepareSuite` 会解析 TypeScript 项目、发现已编译测试并检查过期输出，但不会
启动测试或更改 `process.exitCode`。它返回一个 `SuitePlan`，其中包含解析后的
目录和测试文件列表。准备选项涵盖项目解析、清理、运行器文件排除和诊断日志。
`isolation` 和 `nodeArgs` 等执行选项属于 `runPreparedSuite`；
`prepareSuite` 有意不接受这些选项，也不会将它们保存在计划中。

`runPreparedSuite` 执行该快照。空计划会返回
`{ status: 'empty', exitCode: 1 }`，并且不会启动 Node.js 测试运行器。

常见的单次调用场景可以使用 `runSuiteAsync`：

```ts
import { runSuiteAsync } from 'fwa';

const result = await runSuiteAsync({
  projectDir: process.cwd(),
  output: process.stdout
});
```

`runSuiteAsync` 等价于先准备再执行，并返回 `Promise<SuiteRunResult>`。
配置和准备错误会拒绝 Promise。测试失败时，Promise 会以
`status: 'failed'` 兑现；运行器、报告器和输出流错误会拒绝 Promise。结果
包含 `testFiles`、测试计数、执行时长和 `exitCode`，可供编排逻辑使用。

异步 API 面向库使用：除非显式提供 `output`，否则它不会写入报告器输出，并且
永远不会修改 `process.exitCode`。调用方仍拥有所提供的输出流：`fwa` 会等待
报告器写入完成，但不会结束该流。

`output` 接受任何符合导出类型 `SuiteOutput` 的可写目标。标准 Node.js
可写流（例如 `process.stdout`）均与其兼容。

可以使用 `AbortSignal` 取消正在进行的运行：

```ts
const controller = new AbortController();

const resultPromise = runSuiteAsync({
  projectDir: process.cwd(),
  signal: controller.signal
});

controller.abort();

const result = await resultPromise;
```

取消会表示为一次已经完成但未成功的运行：Promise 以 `status: 'failed'`、
`exitCode: 1` 和已取消测试的计数兑现。Promise 不会仅因为信号被中止而遭到
拒绝。原生运行器或流错误仍会拒绝 Promise。

以上四个函数以及从包根目录导出的 TypeScript 类型构成公共 API。`dist` 中的
内部文件属于实现细节。

## TypeScript 项目配置

使用 `tsConfigPath` 可以选择配置文件，或包含 `tsconfig.json` 的目录：

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  tsConfigPath: 'tsconfig.test.json'
});
```

该选项接受文件或目录，与 `tsc --project` 的形式相同。相对路径从
`projectDir` 开始解析。

配置解析是 `fwa` 的内部职责。调用 `runSuite` 不会加载或限制使用方项目中的
`typescript` 包。

## 清理过期文件

使用 `prune` 可以删除已经没有对应源文件的已编译测试：

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  prune: true
});
```

默认不启用清理。

为了安全，清理要求已配置的 `outDir` 是 `projectDir` 内的专用目录。

如果清理删除了所有发现的测试，文件仍会被删除；随后本次运行会通过 `log`
报告空测试套件，并设置 `process.exitCode = 1`。

## 诊断输出

使用 `log` 可以接收准备阶段的诊断信息，而无需替换 `console.warn`：

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  log: (message) => {
    console.info(message);
  }
});
```

该回调会接收成功清理的诊断信息和空测试套件消息。无法解析所选 TypeScript
配置、其 `extends` 链或其 `rootDir` 和 `outDir` 路径时会抛出错误；已编译
测试过期时同样如此。其他 TypeScript 编译器诊断仍由使用方项目的构建负责。
在异步 API 中，使用 `log` 接收准备阶段诊断，使用 `output` 或 `onEvent`
接收执行输出。

`onEvent` 接收标准化的 `pass`、`fail`、`summary`、`stdout` 和 `stderr`
事件。`data` 字段会保留对应的原生 `node:test` 事件数据。使用进程隔离时，
提供原生 `summary` 事件的 Node.js 版本可能先发送单个文件的汇总，再发送累计
汇总。在不提供原生 `summary` 事件的受支持运行时上，`fwa` 会在执行结束时
发送一个兼容的累计汇总，并自行测量执行耗时。`onEvent` 抛出的异常会拒绝
测试套件的 Promise。

## 排除运行器文件

`runnerFile` 会从发现的测试列表中排除一个 JavaScript 文件。它适用于自定义
CLI 或 bootstrap 入口点，因为这些文件本身也可能被生成到目标 `outDir` 中。

普通编程 API 调用方应省略此选项。需要使用时，应优先提供绝对路径；在执行排除
时，相对值以进程当前工作目录为基准。

## Node.js 测试运行器选项

`runSuite` 使用当前进程的 Node.js 可执行文件。它不接受外部 Node.js 可执行
文件，也不管理其他运行时。

使用 `isolation: 'process'` 时，原生测试子进程使用当前运行时。使用
`isolation: 'none'` 时，测试在当前进程中运行。`nodeArgs` 只会更改传递给
隔离子进程的参数。

一次 `runSuite` 调用只能确认在该运行时上的行为。与其他 Node.js 版本的
兼容性必须由使用方项目通过独立的 CI 矩阵验证。

禁用进程隔离：

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  isolation: 'none'
});
```

显式配置 `isolation` 选项时要求 Node.js `>=22.8.0`。

向隔离的测试子进程传递 Node.js 参数：

```ts
import { runSuite } from 'fwa';

runSuite({
  projectDir: process.cwd(),
  nodeArgs: [
    '--no-warnings',
    '--conditions=development'
  ]
});
```

显式配置 `nodeArgs` 选项时要求 Node.js `>=22.10.0`。该选项不能与
`isolation: 'none'` 一起使用。

## 错误和退出码

兼容 API `runSuite` 会向调用方同步抛出配置和验证错误。

执行兼容测试套件期间，`fwa` 不会直接调用 `process.exit()`。测试失败或没有
找到可运行的测试时，它会设置：

```ts
process.exitCode = 1;
```

由于原生测试执行基于流，测试失败会在 `runSuite` 返回后报告。异步编排 API
将退出码策略交给调用方，并通过 `SuiteRunResult` 报告同样的结果。

## 当前工作目录

`projectDir` 控制配置解析和已编译测试发现。Node.js 原生测试运行器仍会在
调用方当前进程的上下文中启动；API 不会临时调用 `process.chdir`，也不会为
单个测试套件修改环境。需要独立工作目录或环境的编排器应在隔离的工作进程中
启动 `fwa`。

## 权威来源

公共 API 的范围由以下文件定义：

- `src/index.ts`
- `src/application/run-suite.ts`

本文档是使用指南。精确的选项结构仍以导出的 TypeScript 声明为准。
