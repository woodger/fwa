import assert from 'node:assert';
import { describe, test } from 'node:test';

import { runCli } from './cli';

describe('runCli', () => {
  test('prints help for --help', () => {
    const stdout: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['--help'],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
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
        'Usage: fwa [project-root]',
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
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
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
        'Usage: fwa [project-root]',
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
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
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
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
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

  test('runs suite with project root', () => {
    let runnerProjectDir: string | undefined;
    let runnerFile: string | undefined;

    runCli({
      args: ['/workspace/project'],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
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

    assert.strictEqual(runnerProjectDir, '/workspace/project');
    assert.strictEqual(runnerFile, '/project/dist/bin.js');
  });

  test('runs suite with default project root', () => {
    let runnerProjectDir: string | undefined;
    let runnerFile: string | undefined;

    runCli({
      args: [],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
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
    assert.strictEqual(runnerFile, '/project/dist/bin.js');
  });

  test('rejects source directory option', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['--source-dir'],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
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
    assert.deepStrictEqual(stderr, ['Unknown option: --source-dir\n']);
  });

  test('rejects extra project root', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: [
        '/workspace/one',
        '/workspace/two'
      ],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
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
    assert.deepStrictEqual(stderr, ['Unexpected arguments: /workspace/two\n']);
  });
});
