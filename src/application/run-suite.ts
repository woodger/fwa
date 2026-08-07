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
 * Stable event categories exposed by the programmatic test execution API.
 */
export type SuiteEventType =
  | 'pass'
  | 'fail'
  | 'summary'
  | 'stdout'
  | 'stderr';

/**
 * A test-execution event normalized for library consumers.
 */
export type SuiteEvent = {
  type: SuiteEventType;
  data: Readonly<Record<string, unknown>>;
};

/**
 * Writable destination accepted by the asynchronous reporter API.
 *
 * The structural contract limits this boundary to the operations used by the
 * reporter while remaining compatible with native writable streams.
 */
export type SuiteOutput = {
  write(
    chunk: Uint8Array | string,
    callback?: (error?: Error | null) => void
  ): boolean;
  on(event: 'error', listener: (error: unknown) => void): unknown;
  removeListener(event: 'error', listener: (error: unknown) => void): unknown;
};

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

/**
 * Options used to prepare a suite without selecting how it will be executed.
 */
export type SuitePreparationOptions = Omit<
  SuiteRunnerOptions,
  'isolation' | 'nodeArgs'
>;

/**
 * Options that affect native test execution but not suite preparation.
 */
export type SuiteExecutionOptions = {
  isolation?: TestIsolation;
  nodeArgs?: readonly string[];
  output?: SuiteOutput;
  onEvent?: (event: SuiteEvent) => void;
  signal?: AbortSignal;
};

/**
 * Options for the asynchronous programmatic suite API.
 */
export type AsyncSuiteRunnerOptions = SuiteRunnerOptions & SuiteExecutionOptions;

/**
 * Resolved test files and project paths ready for native test execution.
 */
export type SuitePlan = {
  projectDir: string;
  sourceDir: string;
  distDir: string;
  runnerFile: string;
  testFiles: readonly string[];
};

/**
 * Counts reported by the native Node.js test runner.
 */
export type SuiteTestCounts = {
  cancelled: number;
  failed: number;
  passed: number;
  skipped: number;
  suites: number;
  tests: number;
  todo: number;
};

/**
 * Structured result returned after asynchronous suite execution.
 */
export type SuiteRunResult = {
  status: 'passed' | 'failed' | 'empty';
  exitCode: 0 | 1;
  testFiles: readonly string[];
  counts: SuiteTestCounts;
  durationMs: number;
};

/**
 * Fully resolved suite options used by the application use case.
 */
export type ResolvedSuiteRunnerOptions = CompiledTestCheckOptions & {
  runnerFile: string;
  isolation: TestIsolation;
  nodeArgs: readonly string[];
};

/**
 * Dependencies required to prepare a suite without executing tests or changing
 * process state.
 */
export type PrepareSuiteUseCaseDependencies = Pick<
  RunSuiteUseCaseDependencies,
  | 'assertDirectory'
  | 'collectTestFiles'
  | 'checkCompiledTests'
  | 'resolvePath'
  | 'toProjectPath'
  | 'warn'
>;

/**
 * Runtime side effects required by the suite use case.
 */
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
 * Resolves directories, discovers compiled tests, and validates stale output.
 *
 * The preparation step deliberately does not run tests or set an exit code.
 */
export function prepareSuiteUseCase(
  options: ResolvedSuiteRunnerOptions,
  dependencies: PrepareSuiteUseCaseDependencies
): SuitePlan {
  const log = options.log ?? dependencies.warn;
  const checkOptions: CompiledTestCheckOptions = {
    distDir: options.distDir,
    sourceDir: options.sourceDir,
    projectDir: options.projectDir,
    prune: options.prune,
    log
  };

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
    log(
      `No test files found in ${dependencies.toProjectPath(options.distDir, options.projectDir) || '.'}`
    );
  }

  return {
    projectDir: options.projectDir,
    sourceDir: options.sourceDir,
    distDir: options.distDir,
    runnerFile: options.runnerFile,
    testFiles
  };
}

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
  const preparedSuite = prepareSuiteUseCase(options, dependencies);

  if (!preparedSuite.testFiles.length) {
    dependencies.setExitCode(1);
    return;
  }

  dependencies.runTestFiles(
    [...preparedSuite.testFiles],
    options.isolation,
    options.nodeArgs
  );
}
