import path from 'node:path';
import process from 'node:process';

import { defaultRunnerConfig } from '../config';
import {
  runSuiteUseCase,
  type ResolvedSuiteRunnerOptions,
  type SuiteRunnerOptions
} from '../application/run-suite';
import { runNodeTestFiles } from '../infrastructure/node-test';
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
      runTestFiles: runNodeTestFiles,
      resolvePath: (file) => path.resolve(file),
      setExitCode: (code) => {
        process.exitCode = code;
      },
      toProjectPath,
      warn: (message) => console.warn(message)
    }
  );
}
