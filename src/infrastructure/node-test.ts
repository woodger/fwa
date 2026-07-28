import { run, type RunOptions } from 'node:test';
import { spec } from 'node:test/reporters';

import { defaultRunnerConfig } from '../config';
import type { TestIsolation } from '../config.types';
import {
  assertNodeTestExecArgvSupported,
  assertNodeTestIsolationSupported,
  supportsNodeTestIsolation
} from './node-runtime';

export type RunNodeTestFilesDependencies = {
  output: NodeJS.WritableStream;
  reportError(error: unknown): void;
  setExitCode(code: number): void;
};

/**
 * Runs compiled JS tests through the native Node.js test runner.
 *
 * Process status, diagnostics, and output destinations are supplied by
 * bootstrap so the adapter does not own global process side effects.
 */
export function runNodeTestFiles(
  testFiles: string[],
  isolation: TestIsolation,
  nodeArgs: readonly string[],
  dependencies: RunNodeTestFilesDependencies
): void {
  const runOptions: RunOptions = {
    files: testFiles,
    concurrency: defaultRunnerConfig.nodeTest.concurrency
  };

  // Older supported Node.js versions ignore newer run() options. Keep the
  // default path compatible, but fail if a non-default behavior is required.
  if (supportsNodeTestIsolation()) {
    runOptions.isolation = isolation;
  } else if (isolation === 'none') {
    assertNodeTestIsolationSupported();
  }

  if (nodeArgs.length > 0) {
    assertNodeTestExecArgvSupported();
    runOptions.execArgv = nodeArgs;
  }

  const testStream = run(runOptions);

  testStream.on('test:fail', () => {
    dependencies.setExitCode(1);
  });

  testStream.on('error', (error) => {
    dependencies.setExitCode(1);
    dependencies.reportError(error);
  });

  testStream
    .compose(spec)
    .on('error', (error) => {
      dependencies.setExitCode(1);
      dependencies.reportError(error);
    })
    .pipe(dependencies.output);
}
