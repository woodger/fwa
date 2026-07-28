import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import nodeTest, {
  describe,
  test,
  type TestsStream
} from 'node:test';

import { runNodeTestFiles } from './node-test';

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
