import assert from 'node:assert';
import { PassThrough, Writable } from 'node:stream';
import nodeTest, {
  describe,
  test,
  type TestsStream
} from 'node:test';

import {
  runNodeTestFiles,
  runNodeTestFilesAsync
} from './node-test';

describe('runNodeTestFiles', () => {
  test('sets exit code for an unmarked native test failure', (t) => {
    const testStream = new PassThrough({ objectMode: true });
    const reporterStream = new PassThrough();
    const output = new PassThrough();
    const exitCodes: number[] = [];

    t.mock.method(testStream, 'compose', () => reporterStream);
    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    runNodeTestFiles(
      ['/project/dist/example.test.js'],
      'process',
      [],
      {
        output,
        reportError: () => {
          assert.fail('Unexpected test runner error');
        },
        setExitCode: (code) => {
          exitCodes.push(code);
        }
      }
    );

    testStream.emit('test:fail', {
      details: {
        error: {
          failureType: 'testCodeFailure'
        },
        type: 'test'
      },
      name: 'example',
      nesting: 0,
      testNumber: 1
    });

    assert.deepStrictEqual(exitCodes, [1]);
  });

  test('reports native test stream errors and sets exit code', (t) => {
    const testStream = new PassThrough({ objectMode: true });
    const reporterStream = new PassThrough();
    const output = new PassThrough();
    const error = new Error('native test stream failed');
    const errors: unknown[] = [];
    const exitCodes: number[] = [];

    t.mock.method(testStream, 'compose', () => reporterStream);
    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    runNodeTestFiles(
      ['/project/dist/example.test.js'],
      'process',
      [],
      {
        output,
        reportError: (reportedError) => {
          errors.push(reportedError);
        },
        setExitCode: (code) => {
          exitCodes.push(code);
        }
      }
    );

    testStream.emit('error', error);

    assert.deepStrictEqual(exitCodes, [1]);
    assert.deepStrictEqual(errors, [error]);
  });

  test('reports spec reporter errors and sets exit code', (t) => {
    const testStream = new PassThrough({ objectMode: true });
    const reporterStream = new PassThrough();
    const output = new PassThrough();
    const error = new Error('spec reporter failed');
    const errors: unknown[] = [];
    const exitCodes: number[] = [];

    t.mock.method(testStream, 'compose', () => reporterStream);
    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    runNodeTestFiles(
      ['/project/dist/example.test.js'],
      'process',
      [],
      {
        output,
        reportError: (reportedError) => {
          errors.push(reportedError);
        },
        setExitCode: (code) => {
          exitCodes.push(code);
        }
      }
    );

    reporterStream.emit('error', error);

    assert.deepStrictEqual(exitCodes, [1]);
    assert.deepStrictEqual(errors, [error]);
  });
});

describe('runNodeTestFilesAsync', () => {
  test('returns native summary and forwards execution events', async (t) => {
    const testStream = new PassThrough({ objectMode: true });
    const reporterStream = new PassThrough();
    const output = new PassThrough();
    const events: string[] = [];

    t.mock.method(testStream, 'compose', () => {
      testStream.resume();
      return reporterStream;
    });
    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    const resultPromise = runNodeTestFilesAsync(
      ['/project/dist/example.test.js'],
      'process',
      [],
      {
        output,
        onEvent: (event) => {
          events.push(event.type);
        }
      }
    );

    testStream.emit('test:pass', {
      details: {
        duration_ms: 1
      },
      name: 'example',
      nesting: 0,
      testNumber: 1
    } as never);
    testStream.emit('test:summary', {
      counts: {
        cancelled: 0,
        failed: 0,
        passed: 1,
        skipped: 0,
        suites: 0,
        tests: 1,
        todo: 0,
        topLevel: 1
      },
      duration_ms: 12,
      file: undefined,
      success: true
    } as never);
    testStream.end();
    reporterStream.end();

    const result = await resultPromise;

    assert.deepStrictEqual(events, ['pass', 'summary']);
    assert.deepStrictEqual(result, {
      success: true,
      counts: {
        cancelled: 0,
        failed: 0,
        passed: 1,
        skipped: 0,
        suites: 0,
        tests: 1,
        todo: 0
      },
      durationMs: 12
    });
  });

  test('represents failed tests in the resolved result', async (t) => {
    const testStream = new PassThrough({ objectMode: true });
    const reporterStream = new PassThrough();

    t.mock.method(testStream, 'compose', () => {
      testStream.resume();
      return reporterStream;
    });
    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    const resultPromise = runNodeTestFilesAsync(
      ['/project/dist/example.test.js'],
      'process',
      [],
      {
        output: new PassThrough()
      }
    );

    testStream.emit('test:fail', {
      details: {
        duration_ms: 1,
        error: new Error('failed')
      },
      name: 'example',
      nesting: 0,
      testNumber: 1
    } as never);
    testStream.emit('test:summary', {
      counts: {
        cancelled: 0,
        failed: 1,
        passed: 0,
        skipped: 0,
        suites: 0,
        tests: 1,
        todo: 0,
        topLevel: 1
      },
      duration_ms: 8,
      file: undefined,
      success: false
    } as never);
    testStream.end();
    reporterStream.end();

    const result = await resultPromise;

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.counts.failed, 1);
  });

  test('normalizes TODO failures without a native summary', async (t) => {
    const testStream = new PassThrough({ objectMode: true });
    const events: string[] = [];

    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    const resultPromise = runNodeTestFilesAsync(
      ['/project/dist/example.test.js'],
      'process',
      [],
      {
        onEvent: (event) => {
          events.push(event.type);
        }
      }
    );

    testStream.emit('test:fail', {
      details: {
        duration_ms: 1,
        error: {
          failureType: 'testCodeFailure'
        }
      },
      name: 'expected failure',
      nesting: 0,
      testNumber: 1,
      todo: true
    } as never);
    testStream.end();

    const result = await resultPromise;

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.counts, {
      cancelled: 0,
      failed: 0,
      passed: 0,
      skipped: 0,
      suites: 0,
      tests: 1,
      todo: 1
    });
    assert.ok(result.durationMs >= 0);
    assert.deepStrictEqual(events, ['fail', 'summary']);
  });

  test('normalizes cancellations without a native summary', async (t) => {
    const testStream = new PassThrough({ objectMode: true });

    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    const resultPromise = runNodeTestFilesAsync(
      ['/project/dist/example.test.js'],
      'process',
      []
    );

    testStream.emit('test:fail', {
      details: {
        duration_ms: 1,
        error: {
          failureType: 'testAborted'
        }
      },
      name: 'cancelled',
      nesting: 0,
      testNumber: 1
    } as never);
    testStream.end();

    const result = await resultPromise;

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.counts, {
      cancelled: 1,
      failed: 0,
      passed: 0,
      skipped: 0,
      suites: 0,
      tests: 1,
      todo: 0
    });
  });

  test('rejects errors thrown by the event callback', async (t) => {
    const testStream = new PassThrough({ objectMode: true });
    const callbackError = new Error('event callback failed');

    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    const resultPromise = runNodeTestFilesAsync(
      ['/project/dist/example.test.js'],
      'process',
      [],
      {
        onEvent: () => {
          throw callbackError;
        }
      }
    );

    testStream.emit('test:pass', {
      details: {
        duration_ms: 1
      },
      name: 'example',
      nesting: 0,
      testNumber: 1
    } as never);

    await assert.rejects(resultPromise, callbackError);
  });

  test('waits for reporter writes without ending caller output', async (t) => {
    const testStream = new PassThrough({ objectMode: true });
    const reporterStream = new PassThrough();
    let completeWrite: (() => void) | undefined;
    const output = new Writable({
      write(_chunk, _encoding, callback) {
        completeWrite = callback;
      }
    });
    const initialErrorListeners = output.listenerCount('error');

    t.after(() => {
      output.destroy();
    });
    t.mock.method(testStream, 'compose', () => {
      testStream.resume();
      return reporterStream;
    });
    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    let settled = false;
    const resultPromise = runNodeTestFilesAsync(
      ['/project/dist/example.test.js'],
      'process',
      [],
      {
        output
      }
    );

    void resultPromise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      }
    );

    testStream.emit('test:summary', {
      counts: {
        cancelled: 0,
        failed: 0,
        passed: 1,
        skipped: 0,
        suites: 0,
        tests: 1,
        todo: 0,
        topLevel: 1
      },
      duration_ms: 4,
      file: undefined,
      success: true
    } as never);
    testStream.end();
    reporterStream.end('formatted output');

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    assert.strictEqual(settled, false);
    assert.ok(completeWrite !== undefined);

    completeWrite();
    await resultPromise;

    assert.strictEqual(output.writableEnded, false);
    assert.strictEqual(
      output.listenerCount('error'),
      initialErrorListeners
    );
  });

  test('rejects output errors after native test completion', async (t) => {
    const testStream = new PassThrough({ objectMode: true });
    const reporterStream = new PassThrough();
    let completeWrite: ((error: Error) => void) | undefined;
    const output = new Writable({
      write(_chunk, _encoding, callback) {
        completeWrite = callback;
      }
    });
    const initialErrorListeners = output.listenerCount('error');

    t.mock.method(testStream, 'compose', () => {
      testStream.resume();
      return reporterStream;
    });
    t.mock.method(
      nodeTest,
      'run',
      () => testStream as unknown as TestsStream
    );

    const resultPromise = runNodeTestFilesAsync(
      ['/project/dist/example.test.js'],
      'process',
      [],
      {
        output
      }
    );

    testStream.emit('test:summary', {
      counts: {
        cancelled: 0,
        failed: 0,
        passed: 1,
        skipped: 0,
        suites: 0,
        tests: 1,
        todo: 0,
        topLevel: 1
      },
      duration_ms: 4,
      file: undefined,
      success: true
    } as never);
    testStream.end();
    reporterStream.end('formatted output');

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    assert.ok(completeWrite !== undefined);
    completeWrite(new Error('output failed'));

    await assert.rejects(resultPromise, /output failed/);
    assert.strictEqual(
      output.listenerCount('error'),
      initialErrorListeners
    );
  });
});
