import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import * as ts from 'typescript';

/**
 * Supported test file extensions.
 *
 * `.test.ts` and `.spec.ts` represent source tests in src, while
 * `.test.js` and `.spec.js` are compiled test files that run from dist.
 */
type TestExtension = '.test.js' | '.test.ts' | '.spec.js' | '.spec.ts';

const compiledTestExtensions = [
  '.test.js',
  '.spec.js'
] as const satisfies readonly TestExtension[];

/**
 * Diagnostic message output function.
 *
 * Passed as a dependency so tests can capture messages
 * without replacing console.warn.
 */
type Log = (message: string) => void;

/**
 * Options for checking compiled tests before running the test runner.
 *
 * The check links compiled JS tests to the corresponding source TS tests
 * and protects against running stale compiled files.
 */
type CompiledTestCleanupOptions = {
  /**
   * Directory with compiled JS files.
   *
   * Usually matches dist. All discovered compiled tests are interpreted
   * relative to this directory.
   */
  distDir: string;

  /**
   * Directory with source TS files.
   *
   * Usually matches src. The runner uses it to restore the expected path
   * to the source test for each compiled test.
   */
  sourceDir: string;

  /**
   * Project root for human-readable diagnostics.
   *
   * Used only to format paths in messages about removed
   * or outdated tests.
   */
  projectDir: string;

  /**
   * Optional diagnostic message output.
   *
   * The property must be absent when no custom logger is passed.
   * This matters for projects with `exactOptionalPropertyTypes: true`.
   */
  log?: Log;
};

/**
 * Test suite run options.
 *
 * Most parameters are optional because the runner can restore
 * the standard project structure from the location of the current compiled file.
 */
type SuiteRunnerOptions = Partial<CompiledTestCleanupOptions> & {
  /**
   * Path to the runner file.
   *
   * Used to exclude the runner itself from the list of runnable tests
   * when it is also located inside dist.
   */
  runnerFile?: string;
};

type ResolvedSuiteRunnerOptions = CompiledTestCleanupOptions & {
  runnerFile: string;
};

type TsConfigDirectories = {
  sourceDir: string;
  distDir: string;
};

/**
 * Description of a compiled test that is older than its source TS file.
 *
 * Both paths are stored in project-relative format so the error message
 * is identical in local environments, containers, and CI.
 */
type OutdatedCompiledTest = {
  /**
   * Path to the outdated compiled JS test relative to the project root.
   */
  compiled: string;

  /**
   * Path to the source TS test relative to the project root.
   */
  source: string;
};

/**
 * Recursively collects test files with the specified extension or extensions.
 *
 * Traversal order is stabilized by sorting so test execution does not depend
 * on the order in which the filesystem returns directory contents.
 */
export function collectTestFiles(
  dir: string,
  extensions: TestExtension | readonly TestExtension[]
): string[] {
  const acceptedExtensions: readonly TestExtension[] = Array.isArray(extensions)
    ? extensions
    : [extensions];

  return collectTestFilesByExtension(dir, acceptedExtensions);
}

function collectTestFilesByExtension(
  dir: string,
  extensions: readonly TestExtension[]
): string[] {
  const files: string[] = [];

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFilesByExtension(fullPath, extensions));
      continue;
    }

    if (
      entry.isFile()
      && extensions.some((extension) => entry.name.endsWith(extension))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Converts an absolute path to a path relative to the project root.
 *
 * This format is used in diagnostics so messages stay stable
 * between a local machine, container, and CI.
 */
function toProjectPath(file: string, projectDir: string): string {
  return path
    .relative(projectDir, file)
    .split(path.sep)
    .join('/');
}

/**
 * Restores the expected source test file path from a compiled JS file.
 *
 * The runner executes tests from dist, but the source of truth is in src.
 * This allows detection of deleted or changed TS tests after which
 * old JS files remain in dist.
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
 * Reads stat only for a regular file.
 *
 * A missing file is considered a normal result because cleanup
 * specifically checks the case where a source test has already been deleted
 * while the compiled test still remains in dist.
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

function formatTsDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n'
  });
}

function readTsConfigDirectories(projectDir: string): TsConfigDirectories {
  const configFile = ts.findConfigFile(
    projectDir,
    (file) => ts.sys.fileExists(file),
    'tsconfig.json'
  );

  if (configFile === undefined) {
    throw new Error(`Cannot find tsconfig.json from ${projectDir}`);
  }

  const configResult = ts.readConfigFile(
    configFile,
    (file) => ts.sys.readFile(file)
  );

  if (configResult.error !== undefined) {
    throw new Error(formatTsDiagnostics([configResult.error]));
  }

  const configDir = path.dirname(configFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configResult.config,
    ts.sys,
    configDir,
    {},
    configFile
  );

  if (parsedConfig.errors.length) {
    throw new Error(formatTsDiagnostics(parsedConfig.errors));
  }

  if (parsedConfig.options.outDir === undefined) {
    throw new Error(
      `compilerOptions.outDir is required in ${toProjectPath(configFile, projectDir)}`
    );
  }

  return {
    sourceDir: parsedConfig.options.rootDir ?? configDir,
    distDir: parsedConfig.options.outDir
  };
}

function assertDirectory(dir: string, name: string, projectDir: string): void {
  let stat: fs.Stats;

  try {
    stat = fs.statSync(dir);
  }
  catch (error) {
    if (isFileNotFoundError(error)) {
      throw new Error(
        `${name} does not exist: ${toProjectPath(dir, projectDir) || '.'}`,
        { cause: error }
      );
    }

    throw error;
  }

  if (!stat.isDirectory()) {
    throw new Error(`${name} is not a directory: ${toProjectPath(dir, projectDir) || '.'}`);
  }
}

export function resolveSuiteOptions(
  options: SuiteRunnerOptions = {}
): ResolvedSuiteRunnerOptions {
  const projectDir = path.resolve(options.projectDir ?? process.cwd());
  const tsConfigDirectories = (
    options.distDir === undefined
    || options.sourceDir === undefined
  )
    ? readTsConfigDirectories(projectDir)
    : undefined;
  const distDir = options.distDir ?? tsConfigDirectories?.distDir;
  const sourceDir = options.sourceDir ?? tsConfigDirectories?.sourceDir;

  if (distDir === undefined || sourceDir === undefined) {
    throw new Error('Unable to resolve sourceDir and distDir');
  }

  const resolvedOptions: ResolvedSuiteRunnerOptions = {
    projectDir,
    distDir: path.resolve(
      projectDir,
      distDir
    ),
    sourceDir: path.resolve(
      projectDir,
      sourceDir
    ),
    runnerFile: options.runnerFile ?? __filename
  };

  if (options.log !== undefined) {
    resolvedOptions.log = options.log;
  }

  return resolvedOptions;
}

/**
 * Removes compiled tests for which source TS files no longer exist.
 *
 * Additionally checks that an existing compiled test is not older than its source test.
 * This protects against a false-positive run of old compiled JS tests after
 * the corresponding source TS tests were changed or deleted.
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
 * Runs compiled JS tests from dist through the native Node.js test runner.
 *
 * The function intentionally does not call process.exit() so it can be safely
 * used from tests or other bootstrap scenarios. Process status is set
 * through process.exitCode.
 */
export function runSuite(options: SuiteRunnerOptions = {}): void {
  const {
    distDir,
    sourceDir,
    projectDir,
    runnerFile,
    log
  } = resolveSuiteOptions(options);

  const cleanupOptions: CompiledTestCleanupOptions = {
    distDir,
    sourceDir,
    projectDir
  };

  if (log !== undefined) {
    cleanupOptions.log = log;
  }

  assertDirectory(distDir, 'distDir', projectDir);
  assertDirectory(sourceDir, 'sourceDir', projectDir);

  const testFiles = removeCompiledTestsWithoutSource(
    collectTestFiles(distDir, compiledTestExtensions)
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
 * Checks that the file was run directly, not imported as a module.
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
