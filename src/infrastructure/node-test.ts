import { run, type RunOptions } from 'node:test';
import { spec } from 'node:test/reporters';

import type {
  SuiteEvent,
  SuiteTestCounts
} from '../application/run-suite';
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

export type RunNodeTestFilesAsyncOptions = {
  output?: NodeJS.WritableStream;
  onEvent?: (event: SuiteEvent) => void;
  signal?: AbortSignal;
};

export type NodeTestExecutionResult = {
  success: boolean;
  counts: SuiteTestCounts;
  durationMs: number;
};

type NativeSummary = {
  counts: {
    cancelled: number;
    passed: number;
    skipped: number;
    suites: number;
    tests: number;
    todo: number;
  };
  duration_ms: number;
  success: boolean;
};

function createRunOptions(
  testFiles: string[],
  isolation: TestIsolation,
  nodeArgs: readonly string[],
  signal?: AbortSignal
): RunOptions {
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

  if (signal !== undefined) {
    runOptions.signal = signal;
  }

  return runOptions;
}

function createEmptyCounts(): SuiteTestCounts {
  return {
    cancelled: 0,
    failed: 0,
    passed: 0,
    skipped: 0,
    suites: 0,
    tests: 0,
    todo: 0
  };
}

function eventData(data: object): Readonly<Record<string, unknown>> {
  return data as Readonly<Record<string, unknown>>;
}

function normalizeSummaryCounts(
  summary: NativeSummary,
  fallbackCounts: SuiteTestCounts
): SuiteTestCounts {
  const failed = Math.max(
    fallbackCounts.failed,
    summary.counts.tests
      - summary.counts.passed
      - summary.counts.skipped
      - summary.counts.todo
      - summary.counts.cancelled
  );

  return {
    cancelled: summary.counts.cancelled,
    failed,
    passed: summary.counts.passed,
    skipped: summary.counts.skipped,
    suites: summary.counts.suites,
    tests: summary.counts.tests,
    todo: summary.counts.todo
  };
}

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
  const testStream = run(createRunOptions(testFiles, isolation, nodeArgs));

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

/**
 * Executes compiled tests without owning process exit codes or output.
 *
 * The returned promise resolves with test results and rejects only for runner
 * or reporter failures. Test assertion failures are represented in the result.
 */
export function runNodeTestFilesAsync(
  testFiles: string[],
  isolation: TestIsolation,
  nodeArgs: readonly string[],
  options: RunNodeTestFilesAsyncOptions = {}
): Promise<NodeTestExecutionResult> {
  const runOptions = createRunOptions(
    testFiles,
    isolation,
    nodeArgs,
    options.signal
  );

  let testStream: ReturnType<typeof run>;

  try {
    testStream = run(runOptions);
  } catch (error) {
    return Promise.reject(error);
  }

  return new Promise<NodeTestExecutionResult>((resolve, reject) => {
    const fallbackCounts = createEmptyCounts();
    let summary: NativeSummary | undefined;
    let hasFailure = false;
    let settled = false;

    const rejectOnce = (error: unknown): void => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    };

    const notify = (
      type: SuiteEvent['type'],
      data: object
    ): void => {
      if (options.onEvent === undefined) {
        return;
      }

      try {
        options.onEvent({
          type,
          data: eventData(data)
        });
      } catch (error) {
        rejectOnce(error);
      }
    };

    const resolveResult = (): void => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({
        success: summary?.success ?? !hasFailure,
        counts: summary === undefined
          ? fallbackCounts
          : normalizeSummaryCounts(summary, fallbackCounts),
        durationMs: summary?.duration_ms ?? 0
      });
    };

    testStream.on('test:pass', (data) => {
      const event = data as unknown as {
        details?: { type?: string };
        skip?: string | boolean;
        todo?: string | boolean;
      };

      if (event.details?.type === 'suite') {
        fallbackCounts.suites += 1;
      } else if (event.todo !== undefined) {
        fallbackCounts.todo += 1;
        fallbackCounts.tests += 1;
      } else if (event.skip !== undefined) {
        fallbackCounts.skipped += 1;
        fallbackCounts.tests += 1;
      } else {
        fallbackCounts.passed += 1;
        fallbackCounts.tests += 1;
      }

      notify('pass', data);
    });

    testStream.on('test:fail', (data) => {
      const event = data as unknown as {
        details?: { type?: string };
        skip?: string | boolean;
      };

      hasFailure = true;

      if (event.details?.type === 'suite') {
        fallbackCounts.suites += 1;
      } else if (event.skip !== undefined) {
        fallbackCounts.skipped += 1;
        fallbackCounts.tests += 1;
      } else {
        fallbackCounts.failed += 1;
        fallbackCounts.tests += 1;
      }

      notify('fail', data);
    });

    testStream.on('test:summary', (data) => {
      summary = data as unknown as NativeSummary;
      notify('summary', data);
    });

    testStream.on('test:stdout', (data) => {
      notify('stdout', data);
    });

    testStream.on('test:stderr', (data) => {
      notify('stderr', data);
    });

    testStream.on('error', rejectOnce);
    testStream.once('end', resolveResult);

    try {
      if (options.output === undefined) {
        testStream.resume();
      } else {
        const reporter = testStream.compose(spec);

        reporter.on('error', rejectOnce);
        options.output.on('error', rejectOnce);
        reporter.pipe(options.output);
      }
    } catch (error) {
      rejectOnce(error);
    }
  });
}
