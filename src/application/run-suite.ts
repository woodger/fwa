import { defaultRunnerConfig } from '../config';
import type { TestExtension } from '../config.types';

export type { TestExtension } from '../config.types';

/**
 * Supported test file extensions.
 *
 * `.test.ts` and `.spec.ts` represent source tests in src, while
 * `.test.js` and `.spec.js` are compiled test files that run from dist.
 */

/**
 * Diagnostic message output function.
 *
 * Passed as a dependency so tests can capture messages
 * without replacing console.warn.
 */
export type Log = (message: string) => void;

/**
 * Options for checking compiled tests before running the test runner.
 *
 * The check links compiled JS tests to the corresponding source TS tests
 * and protects against running stale compiled files.
 */
export type CompiledTestCleanupOptions = {
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
 * the standard project structure from the current project's tsconfig.
 */
export type SuiteRunnerOptions = Partial<CompiledTestCleanupOptions> & {
  /**
   * Path to the runner file.
   *
   * Used to exclude the runner itself from the list of runnable tests
   * when it is also located inside dist.
   */
  runnerFile?: string;
};

export type ResolvedSuiteRunnerOptions = CompiledTestCleanupOptions & {
  runnerFile: string;
};

export type RunSuiteUseCaseDependencies = {
  assertDirectory(dir: string, name: string, projectDir: string): void;
  collectTestFiles(dir: string, extensions: readonly TestExtension[]): string[];
  removeCompiledTestsWithoutSource(
    testFiles: string[],
    options: CompiledTestCleanupOptions
  ): string[];
  runTestFiles(testFiles: string[]): void;
  resolvePath(file: string): string;
  setExitCode(code: number): void;
  toProjectPath(file: string, projectDir: string): string;
  warn(message: string): void;
};

/**
 * Runs the compiled test suite through injected runtime dependencies.
 *
 * The use case owns execution order and fallback decisions, while filesystem
 * access and process-level side effects stay outside application code.
 */
export function runSuiteUseCase(
  options: ResolvedSuiteRunnerOptions,
  dependencies: RunSuiteUseCaseDependencies
): void {
  const cleanupOptions: CompiledTestCleanupOptions = {
    distDir: options.distDir,
    sourceDir: options.sourceDir,
    projectDir: options.projectDir
  };

  if (options.log !== undefined) {
    cleanupOptions.log = options.log;
  }

  dependencies.assertDirectory(options.distDir, 'distDir', options.projectDir);
  dependencies.assertDirectory(options.sourceDir, 'sourceDir', options.projectDir);

  const testFiles = dependencies.removeCompiledTestsWithoutSource(
    dependencies
      .collectTestFiles(
        options.distDir,
        defaultRunnerConfig.testFileExtensions.map(({ compiled }) => compiled)
      )
      .filter((file) => (
        dependencies.resolvePath(file) !== dependencies.resolvePath(options.runnerFile)
      )),
    cleanupOptions
  );

  if (!testFiles.length) {
    dependencies.warn(
      `No test files found in ${dependencies.toProjectPath(options.distDir, options.projectDir) || '.'}`
    );
    dependencies.setExitCode(1);
    return;
  }

  dependencies.runTestFiles(testFiles);
}
