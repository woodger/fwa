import { performance } from 'node:perf_hooks';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { run, type RunOptions } from 'node:test';
import { spec } from 'node:test/reporters';

import type {
  SuiteEvent,
  SuiteOutput,
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
  output?: SuiteOutput;
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
    failed?: number;
    passed: number;
    skipped: number;
    suites: number;
    tests: number;
    todo: number;
  };
  duration_ms: number;
  success: boolean;
};

type NativeTestResultEvent = {
  details?: {
    error?: {
      failureType?: string;
    };
    type?: string;
  };
  nesting?: number;
  skip?: string | boolean;
  todo?: string | boolean;
};

const cancelledFailureTypes = new Set([
  'cancelledByParent',
  'testAborted',
  'testTimeoutFailure'
]);

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
  summary: NativeSummary
): SuiteTestCounts {
  const failed = summary.counts.failed ?? Math.max(
    0,
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

function recordFallbackResult(
  counts: SuiteTestCounts,
  event: NativeTestResultEvent,
  passed: boolean
): boolean {
  if (event.details?.type === 'suite') {
    counts.suites += 1;

    return !passed
      && event.skip === undefined
      && event.todo === undefined;
  }

  counts.tests += 1;

  if (event.skip !== undefined) {
    counts.skipped += 1;
    return false;
  }

  if (event.todo !== undefined) {
    counts.todo += 1;
    return false;
  }

  if (
    event.details?.error?.failureType !== undefined
    && cancelledFailureTypes.has(event.details.error.failureType)
  ) {
    counts.cancelled += 1;
    return true;
  }

  if (passed) {
    counts.passed += 1;
    return false;
  }

  counts.failed += 1;
  return true;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function createOutputForwarder(output: SuiteOutput): {
  dispose(): void;
  stream: Writable;
} {
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      try {
        output.write(chunk, (error?: Error | null) => {
          callback(error ?? undefined);
        });
      } catch (error) {
        callback(toError(error));
      }
    }
  });
  const handleOutputError = (error: unknown): void => {
    stream.destroy(toError(error));
  };

  output.on('error', handleOutputError);

  return {
    dispose: () => {
      output.removeListener('error', handleOutputError);
    },
    stream
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

  testStream.on('test:fail', (data) => {
    const event = data as unknown as NativeTestResultEvent;

    // node:test reports failed TODO tests through test:fail even though they do
    // not make the native run unsuccessful.
    if (event.skip === undefined && event.todo === undefined) {
      dependencies.setExitCode(1);
    }
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
 * The returned promise resolves with test results and rejects for runner,
 * reporter, output, or event-callback failures. Test assertion failures are
 * represented in the result.
 */
export async function runNodeTestFilesAsync(
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
  const startedAt = performance.now();
  const testStream = run(runOptions);
  let rejectExecution: ((error: unknown) => void) | undefined;
  const resultPromise = new Promise<NodeTestExecutionResult>((resolve, reject) => {
    const fallbackCounts = createEmptyCounts();
    let fallbackTopLevel = 0;
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

    rejectExecution = rejectOnce;

    const notify = (
      type: SuiteEvent['type'],
      data: object
    ): void => {
      if (settled || options.onEvent === undefined) {
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

      const success = summary?.success ?? !hasFailure;
      const counts = summary === undefined
        ? { ...fallbackCounts }
        : normalizeSummaryCounts(summary);
      const durationMs = summary?.duration_ms
        ?? performance.now() - startedAt;
      const result = {
        success,
        counts,
        durationMs
      };

      if (summary === undefined) {
        notify('summary', {
          success,
          counts: {
            ...counts,
            topLevel: fallbackTopLevel
          },
          duration_ms: durationMs,
          file: undefined
        });

        if (settled) {
          return;
        }
      }

      settled = true;
      resolve(result);
    };

    testStream.on('test:pass', (data) => {
      const event = data as unknown as NativeTestResultEvent;

      if (event.nesting === 0) {
        fallbackTopLevel += 1;
      }

      recordFallbackResult(fallbackCounts, event, true);
      notify('pass', data);
    });

    testStream.on('test:fail', (data) => {
      const event = data as unknown as NativeTestResultEvent;

      if (event.nesting === 0) {
        fallbackTopLevel += 1;
      }

      if (recordFallbackResult(fallbackCounts, event, false)) {
        hasFailure = true;
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
  });

  if (options.output === undefined) {
    testStream.resume();

    try {
      return await resultPromise;
    } catch (error) {
      testStream.destroy(toError(error));
      throw error;
    }
  }

  let reporter: ReturnType<typeof testStream.compose>;

  try {
    reporter = testStream.compose(spec);
  } catch (error) {
    const executionError = toError(error);

    rejectExecution?.(executionError);
    testStream.destroy(executionError);
    throw error;
  }

  const outputForwarder = createOutputForwarder(options.output);

  try {
    const [result] = await Promise.all([
      resultPromise,
      pipeline(reporter, outputForwarder.stream)
    ]);

    return result;
  } catch (error) {
    const executionError = toError(error);

    rejectExecution?.(executionError);
    testStream.destroy(executionError);
    outputForwarder.stream.destroy(executionError);
    throw error;
  } finally {
    outputForwarder.dispose();
  }
}
