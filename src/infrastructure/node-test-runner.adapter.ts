import process from 'node:process';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';

/**
 * Runs compiled JS tests through the native Node.js test runner.
 *
 * The adapter intentionally does not call process.exit() so it can be safely
 * used from tests or other bootstrap scenarios. Process status is set
 * through process.exitCode.
 */
export function runNodeTestFiles(testFiles: string[]): void {
  const testStream = run({
    files: testFiles,
    concurrency: true,
    isolation: 'process'
  });

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
