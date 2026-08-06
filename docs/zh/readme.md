# fwa

[English](../../readme.md) | [Русский](../ru/readme.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/fwa.svg)](https://www.npmjs.com/package/fwa)
[![node](https://img.shields.io/node/v/fwa.svg)](https://www.npmjs.com/package/fwa)
[![types](https://img.shields.io/npm/types/fwa.svg)](https://www.npmjs.com/package/fwa)
[![license](https://img.shields.io/npm/l/fwa.svg)](../../LICENSE)

面向 [Node.js®](https://nodejs.org) 的已编译 TypeScript 测试运行器。

`fwa` 运行由 TypeScript 生成的 JavaScript 测试，同时保证递归查找测试的结果
具有确定性，并且不依赖 shell 对 glob 模式的展开行为。

它不会取代 `node:test`：`fwa` 会先准备一份安全的文件列表，再交给 Node.js
原生测试运行器执行。

[CLI 用法](usage.md) | [TypeScript 配置](typescript-config.md) | [过期的已编译测试](stale-compiled-tests.md) | [公共 API](api.md)

## 安装

```sh
npm install --save-dev fwa
```

`fwa` 不会限制项目所使用的 TypeScript 版本，也不会加载使用方项目中的
`typescript` 包。

## 快速开始

推荐脚本：

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

`fwa` 不负责编译 TypeScript。它要求已编译的 JavaScript 测试已经存在于
`outDir` 中。

## 适用场景

如果项目需要具备以下能力的测试运行器，可以使用 `fwa`：

- 从 TypeScript 配置中读取 `rootDir` 和 `outDir`；
- 递归查找已编译的 `*.test.js` 和 `*.spec.js` 文件；
- 阻止运行已经没有对应源文件的已编译测试；
- 仅在使用 `--prune` 时删除这些文件；
- 当源测试比已编译测试更新时以失败结束；
- 将最终文件列表传递给原生 `node:test`。
