import path from 'node:path';
import process from 'node:process';

import {
  runSuiteUseCase,
  type ResolvedSuiteRunnerOptions,
  type SuiteRunnerOptions
} from '../application/run-suite.use-case';
import { runNodeTestFiles } from '../infrastructure/node-test-runner.adapter';
import {
  assertDirectory,
  collectTestFiles,
  removeCompiledTestsWithoutSource
} from '../infrastructure/suite-filesystem.adapter';
import { readTsConfigDirectories } from '../infrastructure/tsconfig-directories.adapter';
import { toProjectPath } from '../internal/project-path';

/**
 * Resolves all runner options into absolute paths.
 *
 * Explicit `sourceDir` and `distDir` win. If either is missing, the missing
 * value is resolved from tsconfig so partial caller options still follow the
 * same project layout rules as a normal TypeScript build.
 */
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

export function runSuite(options: SuiteRunnerOptions = {}): void {
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
