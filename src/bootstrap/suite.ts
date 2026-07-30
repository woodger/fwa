import path from 'node:path';
import process from 'node:process';

import { defaultRunnerConfig } from '../config';
import {
  prepareSuiteUseCase,
  runSuiteUseCase,
  type AsyncSuiteRunnerOptions,
  type ResolvedSuiteRunnerOptions,
  type SuiteExecutionOptions,
  type SuitePlan,
  type SuiteRunResult,
  type SuiteRunnerOptions
} from '../application/run-suite';
import {
  runNodeTestFiles,
  runNodeTestFilesAsync
} from '../infrastructure/node-test';
import {
  assertDirectory,
  checkCompiledTests,
  collectTestFiles
} from '../infrastructure/test-files';
import { readTsConfigDirectories } from '../infrastructure/tsconfig-directories';
import { toProjectPath } from '../infrastructure/project-path';
import { assertExplicitNodeTestOptionsSupported } from '../infrastructure/node-runtime';

/**
 * Resolves all runner options into absolute paths.
 *
 * Source and output directories always come from tsconfig so the runner follows
 * the same project layout rules as a normal TypeScript build.
 */
export function resolveSuiteOptions(
  options: SuiteRunnerOptions
): ResolvedSuiteRunnerOptions {
  const projectDir = path.resolve(options.projectDir);
  const tsConfigDirectories = readTsConfigDirectories(
    projectDir,
    options.tsConfigPath
  );

  const resolvedOptions: ResolvedSuiteRunnerOptions = {
    projectDir,
    distDir: path.resolve(
      projectDir,
      tsConfigDirectories.distDir
    ),
    sourceDir: path.resolve(
      projectDir,
      tsConfigDirectories.sourceDir
    ),
    runnerFile: options.runnerFile ?? __filename,
    prune: options.prune ?? defaultRunnerConfig.pruneStaleCompiledTests,
    isolation: options.isolation ?? defaultRunnerConfig.nodeTest.defaultIsolation,
    nodeArgs: options.nodeArgs ?? defaultRunnerConfig.nodeTest.defaultNodeArgs
  };

  if (resolvedOptions.isolation === 'none' && resolvedOptions.nodeArgs.length > 0) {
    throw new Error('Node args cannot be used with isolation "none".');
  }

  if (options.log !== undefined) {
    resolvedOptions.log = options.log;
  }

  return resolvedOptions;
}

function prepareSuiteWithResolvedOptions(
  options: ResolvedSuiteRunnerOptions
): SuitePlan {
  return prepareSuiteUseCase(
    options,
    {
      assertDirectory,
      collectTestFiles,
      checkCompiledTests,
      resolvePath: (file) => path.resolve(file),
      toProjectPath,
      // Library calls are quiet by default. A caller-provided `log` has
      // already been retained in the resolved options.
      warn: () => undefined
    }
  );
}

/**
 * Resolves and validates a suite without starting native test execution.
 *
 * This is the first phase of the programmatic orchestration API and has no
 * process exit-code or reporter-output side effects.
 */
export function prepareSuite(options: SuiteRunnerOptions): SuitePlan {
  return prepareSuiteWithResolvedOptions(resolveSuiteOptions(options));
}

function createEmptySuiteResult(testFiles: readonly string[]): SuiteRunResult {
  return {
    status: 'empty',
    exitCode: 1,
    testFiles,
    counts: {
      cancelled: 0,
      failed: 0,
      passed: 0,
      skipped: 0,
      suites: 0,
      tests: 0,
      todo: 0
    },
    durationMs: 0
  };
}

function resolveExecutionOptions(
  options: SuiteExecutionOptions
): Required<Pick<SuiteExecutionOptions, 'isolation' | 'nodeArgs'>>
  & Omit<SuiteExecutionOptions, 'isolation' | 'nodeArgs'> {
  const isolation = options.isolation ?? defaultRunnerConfig.nodeTest.defaultIsolation;
  const nodeArgs = options.nodeArgs ?? defaultRunnerConfig.nodeTest.defaultNodeArgs;

  if (isolation === 'none' && nodeArgs.length > 0) {
    throw new Error('Node args cannot be used with isolation "none".');
  }

  return {
    ...options,
    isolation,
    nodeArgs
  };
}

/**
 * Executes a previously prepared plan and returns structured test results.
 *
 * The library does not write output or mutate `process.exitCode`; callers can
 * opt into native reporter output with `output` or consume normalized events.
 */
export async function runPreparedSuite(
  plan: SuitePlan,
  options: SuiteExecutionOptions = {}
): Promise<SuiteRunResult> {
  assertExplicitNodeTestOptionsSupported(options);

  const executionOptions = resolveExecutionOptions(options);

  if (plan.testFiles.length === 0) {
    return createEmptySuiteResult(plan.testFiles);
  }

  const executionResult = await runNodeTestFilesAsync(
    [...plan.testFiles],
    executionOptions.isolation,
    executionOptions.nodeArgs,
    executionOptions
  );

  return {
    status: executionResult.success ? 'passed' : 'failed',
    exitCode: executionResult.success ? 0 : 1,
    testFiles: plan.testFiles,
    counts: executionResult.counts,
    durationMs: executionResult.durationMs
  };
}

/**
 * Prepares and executes a suite for library consumers.
 *
 * Configuration and preparation failures reject the promise. Test failures
 * resolve to a result with `status: 'failed'`.
 */
export async function runSuiteAsync(
  options: AsyncSuiteRunnerOptions
): Promise<SuiteRunResult> {
  assertExplicitNodeTestOptionsSupported(options);

  const plan = prepareSuite(options);

  return runPreparedSuite(plan, options);
}

/**
 * Runs a suite using the default Node.js runtime adapters.
 *
 * This bootstrap entrypoint owns process-level side effects such as
 * `process.exitCode` and console warnings; application code receives them
 * as injected dependencies.
 */
export function runSuite(options: SuiteRunnerOptions): void {
  assertExplicitNodeTestOptionsSupported(options);

  runSuiteUseCase(
    resolveSuiteOptions(options),
    {
      assertDirectory,
      collectTestFiles,
      checkCompiledTests,
      runTestFiles: (testFiles, isolation, nodeArgs) => {
        runNodeTestFiles(
          testFiles,
          isolation,
          nodeArgs,
          {
            output: process.stdout,
            reportError: (error) => console.error(error),
            setExitCode: (code) => {
              process.exitCode = code;
            }
          }
        );
      },
      resolvePath: (file) => path.resolve(file),
      setExitCode: (code) => {
        process.exitCode = code;
      },
      toProjectPath,
      warn: (message) => console.warn(message)
    }
  );
}
