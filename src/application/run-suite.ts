import { defaultRunnerConfig } from '../config';
import type { TestExtension, TestIsolation } from '../config.types';

export type { TestExtension, TestIsolation } from '../config.types';

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
export type CompiledTestCheckOptions = {
  distDir: string;
  sourceDir: string;
  projectDir: string;
  prune: boolean;

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
 * Source and output directories are intentionally not configurable here.
 * They are resolved from the target project's tsconfig.
 */
export type SuiteRunnerOptions = {
  projectDir: string;

  /**
   * TypeScript project config file or directory.
   *
   * Mirrors `tsc --project`: accepts a path to a config file
   * or to a directory containing tsconfig.json.
   */
  tsConfigPath?: string;

  /**
   * Path to the runner file.
   *
   * Used to exclude the runner itself from the list of runnable tests
   * when it is also located inside dist.
   */
  runnerFile?: string;

  prune?: boolean;

  /**
   * Native Node.js test runner isolation mode.
   *
   * Requires Node.js >= 22.8.0 when explicitly configured.
   */
  isolation?: TestIsolation;

  /**
   * Node.js CLI flags passed to isolated test child processes.
   *
   * Requires Node.js >= 22.10.0 when explicitly configured.
   */
  nodeArgs?: readonly string[];

  log?: Log;
};

export type ResolvedSuiteRunnerOptions = CompiledTestCheckOptions & {
  runnerFile: string;
  isolation: TestIsolation;
  nodeArgs: readonly string[];
};

export type RunSuiteUseCaseDependencies = {
  assertDirectory(dir: string, name: string, projectDir: string): void;
  collectTestFiles(dir: string, extensions: readonly TestExtension[]): string[];
  checkCompiledTests(
    testFiles: string[],
    options: CompiledTestCheckOptions
  ): string[];
  runTestFiles(
    testFiles: string[],
    isolation: TestIsolation,
    nodeArgs: readonly string[]
  ): void;
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
  const checkOptions: CompiledTestCheckOptions = {
    distDir: options.distDir,
    sourceDir: options.sourceDir,
    projectDir: options.projectDir,
    prune: options.prune
  };

  if (options.log !== undefined) {
    checkOptions.log = options.log;
  }

  dependencies.assertDirectory(options.distDir, 'distDir', options.projectDir);
  dependencies.assertDirectory(options.sourceDir, 'sourceDir', options.projectDir);

  const testFiles = dependencies.checkCompiledTests(
    dependencies
      .collectTestFiles(
        options.distDir,
        defaultRunnerConfig.testFileExtensions.map(({ compiled }) => compiled)
      )
      .filter((file) => (
        dependencies.resolvePath(file) !== dependencies.resolvePath(options.runnerFile)
      )),
    checkOptions
  );

  if (!testFiles.length) {
    dependencies.warn(
      `No test files found in ${dependencies.toProjectPath(options.distDir, options.projectDir) || '.'}`
    );
    dependencies.setExitCode(1);
    return;
  }

  dependencies.runTestFiles(testFiles, options.isolation, options.nodeArgs);
}
