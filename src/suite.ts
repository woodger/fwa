import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';

/**
 * Поддерживаемые расширения тестовых файлов.
 *
 * `.test.ts` представляет исходный тест в src, а `.test.js` —
 * скомпилированный тестовый файл, который запускается из dist.
 */
type TestExtension = '.test.js' | '.test.ts';

/**
 * Функция вывода диагностических сообщений.
 *
 * Передается как зависимость, чтобы тесты могли перехватывать сообщения
 * без подмены console.warn.
 */
type Log = (message: string) => void;

/**
 * Настройки проверки compiled tests перед запуском test runner-а.
 *
 * Проверка связывает dist/*.test.js с соответствующими src/*.test.ts и
 * защищает от запуска устаревших compiled-файлов.
 */
type CompiledTestCleanupOptions = {
  /**
   * Директория со скомпилированными JS-файлами.
   *
   * Обычно соответствует dist. Все найденные compiled tests интерпретируются
   * относительно этой директории.
   */
  distDir: string;

  /**
   * Директория с исходными TS-файлами.
   *
   * Обычно соответствует src. По ней runner восстанавливает ожидаемый путь
   * к source test для каждого compiled test.
   */
  sourceDir: string;

  /**
   * Корень проекта для человекочитаемой диагностики.
   *
   * Используется только для форматирования путей в сообщениях об удаленных
   * или устаревших тестах.
   */
  projectDir: string;

  /**
   * Опциональный вывод диагностических сообщений.
   *
   * Свойство должно отсутствовать, если кастомный logger не передан.
   * Это важно для проектов с `exactOptionalPropertyTypes: true`.
   */
  log?: Log;
};

/**
 * Настройки запуска test suite.
 *
 * Большая часть параметров опциональна, потому что runner умеет восстановить
 * стандартную структуру проекта из расположения текущего compiled-файла.
 */
type SuiteRunnerOptions = Partial<CompiledTestCleanupOptions> & {
  /**
   * Путь к файлу runner-а.
   *
   * Используется, чтобы исключить сам runner из списка запускаемых тестов,
   * если он тоже находится внутри dist.
   */
  runnerFile?: string;
};

/**
 * Описание compiled test, который старше своего исходного TS-файла.
 *
 * Оба пути хранятся в project-relative формате, чтобы сообщение об ошибке
 * было одинаковым в локальной среде, контейнере и CI.
 */
type OutdatedCompiledTest = {
  /**
   * Путь к устаревшему compiled JS-тесту относительно корня проекта.
   */
  compiled: string;

  /**
   * Путь к исходному TS-тесту относительно корня проекта.
   */
  source: string;
};

/**
 * Рекурсивно собирает тестовые файлы с указанным расширением.
 *
 * Порядок обхода стабилизирован сортировкой, чтобы запуск тестов не зависел
 * от порядка, в котором файловая система возвращает содержимое директорий.
 */
export function collectTestFiles(dir: string, extension: TestExtension): string[] {
  const files: string[] = [];

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath, extension));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Преобразует абсолютный путь в путь относительно корня проекта.
 *
 * Такой формат используется в диагностике, чтобы сообщения были стабильными
 * между локальной машиной, контейнером и CI.
 */
function toProjectPath(file: string, projectDir: string): string {
  return path
    .relative(projectDir, file)
    .split(path.sep)
    .join('/');
}

/**
 * Восстанавливает ожидаемый путь к исходному test-файлу по compiled JS-файлу.
 *
 * Runner запускает тесты из dist, но источник истины находится в src.
 * Это позволяет обнаружить удаленные или измененные TS-тесты, после которых
 * в dist остались старые JS-файлы.
 */
function toSourceTestPath(
  compiledFile: string,
  distDir: string,
  sourceDir: string
): string {
  const relativeCompiledPath = path.relative(distDir, compiledFile);
  const relativeSourcePath = relativeCompiledPath.replace(/\.js$/, '.ts');

  return path.join(sourceDir, relativeSourcePath);
}

/**
 * Читает stat только для обычного файла.
 *
 * Отсутствующий файл считается нормальным результатом, потому что cleanup
 * как раз проверяет ситуацию, когда source test уже удален, а compiled test
 * еще остался в dist.
 */
function readOptionalFileStat(file: string): fs.Stats | undefined {
  try {
    const stat = fs.statSync(file);

    if (!stat.isFile()) {
      return undefined;
    }

    return stat;
  }
  catch (error) {
    if (isFileNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error
    && 'code' in error
    && error.code === 'ENOENT'
  );
}

/**
 * Удаляет compiled tests, для которых больше нет исходных TS-файлов.
 *
 * Дополнительно проверяет, что существующий compiled test не старше source test.
 * Это защищает от ложноположительного запуска старого dist/*.test.js после
 * изменения или удаления соответствующего src/*.test.ts.
 */
export function removeCompiledTestsWithoutSource(
  testFiles: string[],
  options: CompiledTestCleanupOptions
): string[] {
  const runnableFiles: string[] = [];
  const removedFiles: string[] = [];
  const outdatedFiles: OutdatedCompiledTest[] = [];
  const log = options.log ?? ((message: string) => console.warn(message));

  for (const file of testFiles) {
    const compiledStat = fs.statSync(file);
    const sourceFile = toSourceTestPath(
      file,
      options.distDir,
      options.sourceDir
    );

    const sourceStat = readOptionalFileStat(sourceFile);

    if (sourceStat === undefined) {
      fs.unlinkSync(file);
      removedFiles.push(toProjectPath(file, options.projectDir));
      continue;
    }

    runnableFiles.push(file);

    if (sourceStat.mtimeMs > compiledStat.mtimeMs) {
      outdatedFiles.push({
        compiled: toProjectPath(file, options.projectDir),
        source: toProjectPath(sourceFile, options.projectDir)
      });
    }
  }

  if (removedFiles.length) {
    log(
      [
        'Removed stale compiled tests without source:',
        ...removedFiles
          .sort((left, right) => left.localeCompare(right))
          .map((file) => `- ${file}`)
      ].join('\n')
    );
  }

  if (outdatedFiles.length) {
    throw new Error(
      [
        'Compiled tests are older than source tests.',
        '',
        'Rebuild before npm test:',
        ...outdatedFiles
          .sort((left, right) => left.compiled.localeCompare(right.compiled))
          .map(({ compiled, source }) => `- ${compiled} (source: ${source})`)
      ].join('\n')
    );
  }

  return runnableFiles;
}

/**
 * Запускает compiled JS-тесты из dist через нативный Node.js test runner.
 *
 * Функция намеренно не вызывает process.exit(), чтобы ее можно было безопасно
 * использовать из тестов или других bootstrap-сценариев. Статус процесса
 * выставляется через process.exitCode.
 */
export function runSuite(options: SuiteRunnerOptions = {}): void {
  const distDir = options.distDir ?? path.resolve(__dirname);
  const projectDir = options.projectDir ?? path.resolve(distDir, '..');
  const sourceDir = options.sourceDir ?? path.join(projectDir, 'src');
  const runnerFile = options.runnerFile ?? __filename;

  const cleanupOptions: CompiledTestCleanupOptions = {
    distDir,
    sourceDir,
    projectDir
  };

  if (options.log !== undefined) {
    cleanupOptions.log = options.log;
  }

  const testFiles = removeCompiledTestsWithoutSource(
    collectTestFiles(distDir, '.test.js')
      .filter((file) => path.resolve(file) !== path.resolve(runnerFile)),
    cleanupOptions
  );

  if (!testFiles.length) {
    console.warn(`No test files found in ${toProjectPath(distDir, projectDir) || '.'}`);
    process.exitCode = 1;
    return;
  }

  const testStream = run({
    files: testFiles,
    concurrency: true,
    isolation: 'process'
  });

  testStream.on('test:fail', () => {
    process.exitCode = 1;
  });

  testStream.on('error', (error) => {
    process.exitCode = 1;
    console.error(error);
  });

  testStream
    .compose(spec)
    .on('error', (error) => {
      process.exitCode = 1;
      console.error(error);
    })
    .pipe(process.stdout);
}

/**
 * Проверяет, что файл запущен напрямую, а не импортирован как модуль.
 */
function isMainFile(file: string): boolean {
  return (
    process.argv[1] !== undefined
    && path.resolve(process.argv[1]) === path.resolve(file)
  );
}

if (isMainFile(__filename)) {
  runSuite();
}