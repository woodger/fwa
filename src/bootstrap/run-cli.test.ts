import assert from 'node:assert';
import { describe, test } from 'node:test';

import { runCli } from './run-cli';

describe('runCli', () => {
  test('prints help for --help', () => {
    const stdout: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['--help'],
      projectDir: '/project',
      runnerFile: '/project/dist/bootstrap/cli.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: () => {
        suiteWasRun = true;
      },
      setExitCode: (code) => {
        exitCode = code;
      },
      writeStderr: (message) => {
        assert.fail(message);
      },
      writeStdout: (message) => {
        stdout.push(message);
      }
    });

    assert.strictEqual(suiteWasRun, false);
    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(stdout, [
      [
        'Usage: fwa [options]',
        '',
        'Options:',
        '  -h, --help     Show help.',
        '  -v, --version  Show version.',
        ''
      ].join('\n')
    ]);
  });

  test('prints help for -h', () => {
    const stdout: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['-h'],
      projectDir: '/project',
      runnerFile: '/project/dist/bootstrap/cli.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: () => {
        suiteWasRun = true;
      },
      setExitCode: (code) => {
        exitCode = code;
      },
      writeStderr: (message) => {
        assert.fail(message);
      },
      writeStdout: (message) => {
        stdout.push(message);
      }
    });

    assert.strictEqual(suiteWasRun, false);
    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(stdout, [
      [
        'Usage: fwa [options]',
        '',
        'Options:',
        '  -h, --help     Show help.',
        '  -v, --version  Show version.',
        ''
      ].join('\n')
    ]);
  });

  test('prints version for --version', () => {
    const stdout: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['--version'],
      projectDir: '/project',
      runnerFile: '/project/dist/bootstrap/cli.js'
    }, {
      readVersion: () => '2.0.0-alpha',
      runSuite: () => {
        suiteWasRun = true;
      },
      setExitCode: (code) => {
        exitCode = code;
      },
      writeStderr: (message) => {
        assert.fail(message);
      },
      writeStdout: (message) => {
        stdout.push(message);
      }
    });

    assert.strictEqual(suiteWasRun, false);
    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(stdout, ['2.0.0-alpha\n']);
  });

  test('prints version for -v', () => {
    const stdout: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['-v'],
      projectDir: '/project',
      runnerFile: '/project/dist/bootstrap/cli.js'
    }, {
      readVersion: () => '2.0.0-alpha',
      runSuite: () => {
        suiteWasRun = true;
      },
      setExitCode: (code) => {
        exitCode = code;
      },
      writeStderr: (message) => {
        assert.fail(message);
      },
      writeStdout: (message) => {
        stdout.push(message);
      }
    });

    assert.strictEqual(suiteWasRun, false);
    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(stdout, ['2.0.0-alpha\n']);
  });

  test('runs suite without args', () => {
    let runnerProjectDir: string | undefined;
    let runnerFile: string | undefined;

    runCli({
      args: [],
      projectDir: '/project',
      runnerFile: '/project/dist/bootstrap/cli.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: (options) => {
        runnerProjectDir = options.projectDir;
        runnerFile = options.runnerFile;
      },
      setExitCode: (code) => {
        assert.fail(`Unexpected exit code: ${String(code)}`);
      },
      writeStderr: (message) => {
        assert.fail(message);
      },
      writeStdout: (message) => {
        assert.fail(message);
      }
    });

    assert.strictEqual(runnerProjectDir, '/project');
    assert.strictEqual(runnerFile, '/project/dist/bootstrap/cli.js');
  });

  test('rejects unknown option', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['--wat'],
      projectDir: '/project',
      runnerFile: '/project/dist/bootstrap/cli.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: () => {
        suiteWasRun = true;
      },
      setExitCode: (code) => {
        exitCode = code;
      },
      writeStderr: (message) => {
        stderr.push(message);
      },
      writeStdout: (message) => {
        assert.fail(message);
      }
    });

    assert.strictEqual(suiteWasRun, false);
    assert.strictEqual(exitCode, 1);
    assert.deepStrictEqual(stderr, ['Unknown option: --wat\n']);
  });
});
