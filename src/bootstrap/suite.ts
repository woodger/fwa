import path from 'node:path';
import process from 'node:process';

import {
  runSuiteUseCase,
  type ResolvedSuiteRunnerOptions,
  type SuiteRunnerOptions
} from '../application/run-suite';
import { runNodeTestFiles } from '../infrastructure/node-test';
import {
  assertDirectory,
  collectTestFiles,
  removeCompiledTestsWithoutSource
} from '../infrastructure/test-files';
import { readTsConfigDirectories } from '../infrastructure/tsconfig-directories';
import { toProjectPath } from '../infrastructure/project-path';

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
  const tsConfigDirectories = readTsConfigDirectories(projectDir);

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
    runnerFile: options.runnerFile ?? __filename
  };

  if (options.log !== undefined) {
    resolvedOptions.log = options.log;
  }

  return resolvedOptions;
}

export function runSuite(options: SuiteRunnerOptions): void {
  runSuiteUseCase(
    resolveSuiteOptions(options),
    {
      assertDirectory,
      collectTestFiles,
      removeCompiledTestsWithoutSource,
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
