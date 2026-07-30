import assert from 'node:assert';
import { PassThrough } from 'node:stream';
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
  test('sets exit code when the native test runner reports a failure', (t) => {
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

    testStream.emit('test:fail');

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

    t.mock.method(testStream, 'compose', () => reporterStream);
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
    testStream.emit('end');

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

    t.mock.method(testStream, 'compose', () => reporterStream);
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
    testStream.emit('end');

    const result = await resultPromise;

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.counts.failed, 1);
  });
});
