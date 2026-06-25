# Compiled Suite Runner

Модуль запускает скомпилированные TypeScript-тесты из `dist` через нативный Node.js test runner.

Runner решает две практические проблемы:

1. Надежно находит вложенные `*.test.js` файлы в `dist` без зависимости от shell glob.
2. Защищает проект от запуска устаревших compiled tests, которые остались после удаления или изменения исходных `*.test.ts`.

## Назначение

В TypeScript-проекте тесты пишутся в `src`:

```text
src/feature/sample.test.ts
```

После сборки появляется compiled-файл:

```text
dist/feature/sample.test.js
```

Если запускать тесты напрямую через glob:

```bash
node --test dist/**/*.test.js
```

результат может зависеть от shell, через который выполняется команда.

В npm scripts команда обычно проходит через shell. Не каждый shell одинаково обрабатывает `**`, и в некоторых случаях `dist/**/*.test.js` может найти только тесты на одном уровне вложенности, пропустив более глубокие файлы.

Например, могут быть найдены:

```text
dist/feature/sample.test.js
```

но пропущены:

```text
dist/feature/nested/sample.test.js
dist/feature/nested/deep/sample.test.js
```

Поэтому проект использует отдельный suite entrypoint:

```json
{
  "scripts": {
    "test": "fwa"
  }
}
```

`suite.js` сам рекурсивно обходит `dist`, собирает все `*.test.js` файлы на любой глубине и передает готовый список файлов в нативный `node:test`.

## Отличие от `node --test`

Этот runner не заменяет нативный Node.js test runner.

Он использует `node:test` внутри, но берет на себя подготовку списка файлов перед запуском.

Обычный запуск:

```bash
node --test dist/**/*.test.js
```

полагается на обработку glob-паттерна снаружи или внутри Node.js. На практике это может быть неочевидно и зависеть от окружения, shell и формы команды.

Запуск через suite:

```bash
node dist/suite.js
```

не зависит от shell glob.

Runner выполняет собственный рекурсивный обход `dist`, исключает сам файл suite runner-а из списка тестов, проверяет актуальность compiled-файлов и только после этого запускает тесты через `node:test`.

Иными словами:

```text
node:test отвечает за выполнение тестов.
suite.js отвечает за безопасный выбор test-файлов из dist.
```

## Что делает runner

Перед запуском тестов runner выполняет preflight-проверку:

1. Рекурсивно находит все `*.test.js` файлы в `dist`.
2. Исключает из списка сам runner-файл.
3. Для каждого `dist/**/*.test.js` восстанавливает ожидаемый путь к `src/**/*.test.ts`.
4. Удаляет compiled test, если соответствующий source test больше не существует.
5. Прерывает запуск, если source test новее compiled test.
6. Передает оставшиеся файлы в нативный `node:test`.

## Пример структуры проекта

```text
project/
├── src/
│   ├── suite.ts
│   └── feature/
│       ├── sample.test.ts
│       └── nested/
│           └── deep.test.ts
├── dist/
│   ├── suite.js
│   └── feature/
│       ├── sample.test.js
│       └── nested/
│           └── deep.test.js
├── package.json
└── tsconfig.json
```

## Использование

После установки пакета стандартный запуск:

```bash
fwa
```

Команда `fwa` запускает тесты проекта из текущей рабочей директории:

```text
distDir = <cwd>/dist
sourceDir = <cwd>/src
projectDir = <cwd>
```

Прямой запуск compiled entrypoint-а внутри самого проекта также поддерживается:

```bash
node dist/suite.js
```

Рекомендуемый script в `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "npm run build && fwa"
  }
}
```

Runner не требует полного удаления `dist` перед запуском тестов.

Он удаляет только те compiled test-файлы, для которых больше нет соответствующих source test-файлов.

## Почему не `dist/**/*.test.js`

Команда вида:

```bash
node --test dist/**/*.test.js
```

выглядит короче, но у нее есть два недостатка.

Во-первых, `**` может быть обработан shell до запуска Node.js. В этом случае Node.js получает уже готовый список файлов, а не исходный glob-паттерн.

Во-вторых, поведение может отличаться между окружениями. Локальная машина, CI, Docker-контейнер и разные shell могут обрабатывать такой glob по-разному.

Runner избегает этой неоднозначности:

```text
dist обходится через fs.readdirSync()
список test-файлов формируется явно
node:test получает уже готовые пути к файлам
```

Это делает запуск тестов стабильным и предсказуемым.

## Защита от stale compiled tests

Runner предполагает, что `src` и `dist` имеют одинаковую относительную структуру.

Например:

```text
src/feature/sample.test.ts
dist/feature/sample.test.js
```

Для каждого найденного compiled test runner проверяет соответствующий source test.

### Source test существует

Если source test существует и compiled test не старше него, файл считается пригодным для запуска:

```text
src/feature/sample.test.ts
dist/feature/sample.test.js
```

### Source test удален

Если source test больше не существует, compiled test считается stale-файлом и удаляется:

```text
dist/feature/old.test.js
```

Диагностика:

```text
Removed stale compiled tests without source:
- dist/feature/old.test.js
```

### Source test новее compiled test

Если source test был изменен после compiled test, запуск прерывается ошибкой:

```text
Compiled tests are older than source tests.

Rebuild before npm test:
- dist/feature/sample.test.js (source: src/feature/sample.test.ts)
```

Это означает, что `dist` не соответствует текущему состоянию `src`, и проект нужно пересобрать.

## Публичный API

### `collectTestFiles(dir, extension)`

Рекурсивно собирает test-файлы с указанным расширением.

```ts
const files = collectTestFiles('dist', '.test.js');
```

Функция используется для явного обхода директории без shell glob.

Поддерживаемые расширения:

```ts
type TestExtension = '.test.js' | '.test.ts';
```

### `removeCompiledTestsWithoutSource(testFiles, options)`

Проверяет compiled test-файлы перед запуском.

```ts
const runnableFiles = removeCompiledTestsWithoutSource(testFiles, {
  distDir: 'dist',
  sourceDir: 'src',
  projectDir: process.cwd()
});
```

Функция возвращает только те compiled test-файлы, которые можно запускать.

Если source test отсутствует, compiled test удаляется.

Если source test новее compiled test, функция выбрасывает ошибку.

### `runSuite(options?)`

Запускает полный цикл проверки и выполнения тестов.

```ts
runSuite();
```

С параметрами:

```ts
runSuite({
  distDir: path.resolve(__dirname),
  projectDir: path.resolve(__dirname, '..'),
  sourceDir: path.resolve(__dirname, '../src'),
  runnerFile: __filename
});
```

Обычно параметры не нужны, если runner лежит в `src/suite.ts` и после сборки попадает в `dist/suite.js`.

## Опции

### `distDir`

Директория со скомпилированными JS-файлами.

Обычно это директория текущего compiled runner-а:

```ts
const distDir = path.resolve(__dirname);
```

### `sourceDir`

Директория с исходными TS-файлами.

Обычно:

```ts
const sourceDir = path.join(projectDir, 'src');
```

### `projectDir`

Корень проекта.

Используется для форматирования путей в диагностике:

```text
dist/feature/sample.test.js
src/feature/sample.test.ts
```

В сообщениях не используются абсолютные пути, чтобы вывод был одинаковым локально, в контейнере и в CI.

### `runnerFile`

Путь к runner-файлу.

Нужен, чтобы runner исключил сам себя из списка запускаемых тестов.

### `log`

Опциональная функция вывода диагностических сообщений.

```ts
runSuite({
  log: (message) => {
    console.warn(message);
  }
});
```

Это удобно для тестов, где нужно проверить диагностический вывод без подмены `console.warn`.

## Поведение exit code

`runSuite()` не вызывает `process.exit()` напрямую.

При ошибке запуска или отсутствии тестов runner выставляет:

```ts
process.exitCode = 1;
```

Такой подход безопаснее:

* процесс не завершается посреди теста;
* модуль проще покрывать unit-тестами;
* вызывающий код сохраняет контроль над жизненным циклом процесса.

## Ограничения

Runner рассчитан на стандартную TypeScript-сборку, где относительная структура `src` и `dist` совпадает.

Поддерживаемый случай:

```text
src/a/b/example.test.ts
dist/a/b/example.test.js
```

Если сборка меняет структуру директорий, runner не сможет корректно восстановить source path по compiled path без дополнительной настройки.

## Когда runner полезен

Runner полезен, если проект:

* пишет тесты на TypeScript;
* запускает compiled tests из `dist`;
* не хочет полагаться на `dist/**/*.test.js`;
* имеет вложенные test-файлы;
* не очищает `dist` полностью перед каждым запуском;
* хочет защититься от stale compiled tests;
* использует нативный Node.js test runner.

## Когда runner не нужен

Runner обычно не нужен, если проект запускает TypeScript-тесты напрямую без промежуточного `dist`.

Runner также может быть избыточен, если перед каждой сборкой `dist` полностью удаляется и затем создается заново, а запуск тестов не зависит от shell glob.

## Тестирование runner-а

Для unit-тестов runner-а удобно создавать временную структуру проекта:

```ts
const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-runner-'));
const distDir = path.join(projectDir, 'dist');
const sourceDir = path.join(projectDir, 'src');
```

Cleanup лучше делать внутри каждого теста через `t.after()`:

```ts
test('removes stale compiled test', (t) => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-runner-'));

  t.after(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  // test body
});
```

Так каждый тест остается самостоятельным и не зависит от общего mutable setup-а.

## Резюме

`suite.js` — это не отдельный тестовый фреймворк.

Это небольшой entrypoint поверх нативного `node:test`, который делает запуск compiled TypeScript-тестов более надежным:

```text
без shell glob
с рекурсивным обходом dist
с защитой от stale compiled tests
с явным списком файлов для node:test
```
