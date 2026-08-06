# fwa

[English](../../readme.md) | Русский | [简体中文](../zh/readme.md)

[![npm version](https://img.shields.io/npm/v/fwa.svg)](https://www.npmjs.com/package/fwa)
[![node](https://img.shields.io/node/v/fwa.svg)](https://www.npmjs.com/package/fwa)
[![types](https://img.shields.io/npm/types/fwa.svg)](https://www.npmjs.com/package/fwa)
[![license](https://img.shields.io/npm/l/fwa.svg)](../../LICENSE)

Раннер скомпилированных TypeScript-тестов для
[Node.js®](https://nodejs.org).

`fwa` запускает JavaScript-тесты, сгенерированные TypeScript, и обеспечивает
детерминированный рекурсивный поиск, не зависящий от раскрытия glob-шаблонов
командной оболочкой.

Он не заменяет `node:test`: `fwa` подготавливает безопасный список файлов и
передаёт их нативному тест-раннеру Node.js.

[Использование CLI](usage.md) | [Конфигурация TypeScript](typescript-config.md) | [Устаревшие скомпилированные тесты](stale-compiled-tests.md) | [Публичный API](api.md)

## Установка

```sh
npm install --save-dev fwa
```

`fwa` не ограничивает версию TypeScript в проекте и не загружает пакет
`typescript` проекта-потребителя.

## Быстрый старт

Рекомендуемый скрипт:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "fwa --prune"
  }
}
```

Запуск:

```sh
npm run build
npm test
```

`fwa` не компилирует TypeScript. Он ожидает, что скомпилированные JavaScript-тесты
уже находятся в `outDir`.

## Когда использовать

`fwa` подходит проектам, которым нужен раннер, выполняющий следующие задачи:

- чтение `rootDir` и `outDir` из конфигурации TypeScript;
- рекурсивный поиск скомпилированных `*.test.js` и `*.spec.js`;
- блокирование скомпилированных тестов, исходники которых больше не существуют;
- удаление таких файлов только при использовании `--prune`;
- завершение с ошибкой, если исходные тесты новее скомпилированных;
- передача итогового списка файлов нативному `node:test`.
