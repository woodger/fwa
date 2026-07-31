# TypeScript 配置

[English](../typescript-config.md) | [Русский](../ru/typescript-config.md) | 简体中文

`fwa` 从目标项目的 TypeScript 配置中读取源文件目录和输出目录。

默认读取：

```text
<project-root>/tsconfig.json
```

默认查找不会向上搜索父目录。如果配置位于其他位置，请显式使用 `--project`。

`fwa` 不会将 TypeScript 声明为对等依赖（peer dependency），也不会加载
使用方项目中的 `typescript` 包。使用方项目所采用的编译器版本仍由该项目
自行控制。

配置路径通过仅供 `fwa` 使用的轻量专用解析器进行解析。这样无需将编译器作为
运行时依赖发布，也能避免使用方依赖图中的 TypeScript API 变化影响运行器行为。

使用 `--project` 可以选择其他配置文件，或包含 `tsconfig.json` 的目录：

```sh
fwa --project tsconfig.test.json
fwa ./packages/example --project tsconfig.test.json
```

`--project` 接受文件或目录，与 `tsc --project` 的形式相同。

## 编译器选项

`compilerOptions.outDir` 是必需的，因为 `fwa` 运行已编译的 JavaScript 测试。
如果没有 `outDir`，运行器无法确定已编译输出的位置。

`compilerOptions.rootDir` 是可选的。省略时，`fwa` 会将包含
`tsconfig.json` 的目录视为源文件根目录。

为了稳定地映射源文件和输出文件，应显式设置 `compilerOptions.rootDir`。
大多数项目通常使用 `"src"` 或 `"."`。

`fwa` 会按照 TypeScript 配置的行为解析 `extends`，以及相对的 `rootDir` 和
`outDir` 路径。

运行器不会验证无关的编译器选项、枚举源文件或对项目执行类型检查。这些检查
由使用方项目在启动 `fwa` 之前的构建过程负责。不过，所选配置及其 `extends`
链仍必须可读取、语法有效且能够解析。已配置的 `compilerOptions.rootDir` 和
必需的 `compilerOptions.outDir` 必须解析为路径字符串。

## 预期目录结构

源测试相对于 `rootDir` 的路径必须与已编译测试相对于 `outDir` 的路径一致。

示例：

```text
src/feature/example.test.ts
dist/feature/example.test.js

src/feature/example.spec.ts
dist/feature/example.spec.js
```

支持 `.test` 和 `.spec` 文件：

```text
source:   *.test.ts, *.spec.ts
compiled: *.test.js, *.spec.js
```

## 权威来源

运行时行为实现在以下文件中：

- `src/infrastructure/tsconfig-parser.ts`
- `src/infrastructure/tsconfig-directories.ts`
- `src/bootstrap/suite.ts`

本文档是使用指南。解析行为的精确约定仍以代码和测试为准。
