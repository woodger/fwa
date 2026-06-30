import process from 'node:process';
import { run, type RunOptions } from 'node:test';
import { spec } from 'node:test/reporters';

import { defaultRunnerConfig } from '../config';
import type { TestIsolation } from '../config.types';
import {
  assertNodeTestExecArgvSupported,
  assertNodeTestIsolationSupported,
  supportsNodeTestIsolation
} from './node-runtime';

/**
 * Runs compiled JS tests through the native Node.js test runner.
 *
 * The adapter intentionally does not call process.exit() so it can be safely
 * used from tests or other bootstrap scenarios. Process status is set
 * through process.exitCode.
 */
export function runNodeTestFiles(
  testFiles: string[],
  isolation: TestIsolation,
  nodeArgs: readonly string[]
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
