import assert from 'node:assert';
import process from 'node:process';
import nodeTest, {
  describe,
  test,
  type RunOptions,
  type TestsStream
} from 'node:test';
import { spec } from 'node:test/reporters';

import { defaultRunnerConfig } from '../config';
import { runNodeTestFiles } from './node-test';
import { supportsNodeTestIsolation } from './node-runtime';

type StreamListener = (...args: unknown[]) => void;

type TestStreamHarness = {
  stream: TestsStream;
  emitReporter(event: string, ...args: unknown[]): void;
  emitTest(event: string, ...args: unknown[]): void;
  getComposedReporter(): unknown;
  getPipeDestination(): unknown;
};

function createTestStreamHarness(): TestStreamHarness {
  const reporterListeners = new Map<string, StreamListener>();
  const testListeners = new Map<string, StreamListener>();
  let composedReporter: unknown;
  let pipeDestination: unknown;

  const reporterStream = {
    on(event: string, listener: StreamListener) {
      reporterListeners.set(event, listener);
      return reporterStream;
    },
    pipe(destination: unknown) {
      pipeDestination = destination;
      return destination;
    }
  };

  const stream = {
    on(event: string, listener: StreamListener) {
      testListeners.set(event, listener);
      return stream;
    },
    compose(reporter: unknown) {
      composedReporter = reporter;
      return reporterStream;
    }
  } as unknown as TestsStream;

  return {
    stream,
    emitReporter(event, ...args) {
      const listener = reporterListeners.get(event);

      assert.ok(listener, `Reporter listener is not registered for ${event}`);
      listener(...args);
    },
    emitTest(event, ...args) {
      const listener = testListeners.get(event);

      assert.ok(listener, `Test listener is not registered for ${event}`);
      listener(...args);
    },
    getComposedReporter: () => composedReporter,
    getPipeDestination: () => pipeDestination
  };
}

describe('runNodeTestFiles', () => {
  test('runs selected files through the native test runner and spec reporter', (t) => {
    const harness = createTestStreamHarness();
    const run = t.mock.method(nodeTest, 'run', () => harness.stream);
    const testFiles = [
      '/project/dist/example.test.js'
    ];

    runNodeTestFiles(testFiles, 'process', []);

    const expectedOptions: RunOptions = {
      files: testFiles,
      concurrency: defaultRunnerConfig.nodeTest.concurrency
    };

    if (supportsNodeTestIsolation()) {
      expectedOptions.isolation = 'process';
    }

    assert.deepStrictEqual(run.mock.calls[0]?.arguments, [expectedOptions]);
    assert.strictEqual(harness.getComposedReporter(), spec);
    assert.strictEqual(harness.getPipeDestination(), process.stdout);
  });

  test('sets exit code when the native test runner reports a failure', (t) => {
    const previousExitCode = process.exitCode;
    const harness = createTestStreamHarness();

    t.after(() => {
      process.exitCode = previousExitCode;
    });
    t.mock.method(nodeTest, 'run', () => harness.stream);

    runNodeTestFiles(['/project/dist/example.test.js'], 'process', []);
    harness.emitTest('test:fail');

    assert.strictEqual(process.exitCode, 1);
  });

  test('reports native test stream errors and sets exit code', (t) => {
    const previousExitCode = process.exitCode;
    const harness = createTestStreamHarness();
    const error = new Error('native test stream failed');
    const consoleError = t.mock.method(console, 'error', () => undefined);

    t.after(() => {
      process.exitCode = previousExitCode;
    });
    t.mock.method(nodeTest, 'run', () => harness.stream);

    runNodeTestFiles(['/project/dist/example.test.js'], 'process', []);
    harness.emitTest('error', error);

    assert.strictEqual(process.exitCode, 1);
    assert.deepStrictEqual(consoleError.mock.calls[0]?.arguments, [error]);
  });

  test('reports spec reporter errors and sets exit code', (t) => {
    const previousExitCode = process.exitCode;
    const harness = createTestStreamHarness();
    const error = new Error('spec reporter failed');
    const consoleError = t.mock.method(console, 'error', () => undefined);

    t.after(() => {
      process.exitCode = previousExitCode;
    });
    t.mock.method(nodeTest, 'run', () => harness.stream);

    runNodeTestFiles(['/project/dist/example.test.js'], 'process', []);
    harness.emitReporter('error', error);

    assert.strictEqual(process.exitCode, 1);
    assert.deepStrictEqual(consoleError.mock.calls[0]?.arguments, [error]);
  });
});
