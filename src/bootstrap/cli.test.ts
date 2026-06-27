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
        'Usage: fwa [project-root] [options]',
        '',
        'Options:',
        '  -p, --project <path>     TypeScript config file or directory.',
        '  --prune                  Prune stale compiled tests without source.',
        '  -i, --isolation <mode>   Test isolation: process or none. Default: process.',
        '  --node-args <args...>    Pass remaining args to Node test processes.',
        '  -h, --help               Show help.',
        '  -v, --version            Show version.',
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
        'Usage: fwa [project-root] [options]',
        '',
        'Options:',
        '  -p, --project <path>     TypeScript config file or directory.',
        '  --prune                  Prune stale compiled tests without source.',
        '  -i, --isolation <mode>   Test isolation: process or none. Default: process.',
        '  --node-args <args...>    Pass remaining args to Node test processes.',
        '  -h, --help               Show help.',
        '  -v, --version            Show version.',
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

  test('runs suite with TypeScript project config', () => {
    let runnerProjectDir: string | undefined;
    let runnerTsConfigPath: string | undefined;
    let runnerFile: string | undefined;

    runCli({
      args: [
        '--project',
        'tsconfig.test.json'
      ],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: (options) => {
        runnerProjectDir = options.projectDir;
        runnerTsConfigPath = options.tsConfigPath;
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
    assert.strictEqual(runnerTsConfigPath, 'tsconfig.test.json');
    assert.strictEqual(runnerFile, '/project/dist/bin.js');
  });

  test('runs suite with short TypeScript project option', () => {
    let runnerProjectDir: string | undefined;
    let runnerTsConfigPath: string | undefined;

    runCli({
      args: [
        '/workspace/project',
        '-p',
        'tsconfig.test.json'
      ],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: (options) => {
        runnerProjectDir = options.projectDir;
        runnerTsConfigPath = options.tsConfigPath;
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
    assert.strictEqual(runnerTsConfigPath, 'tsconfig.test.json');
  });

  test('runs suite with prune mode', () => {
    let runnerPrune: boolean | undefined;

    runCli({
      args: [
        '--prune'
      ],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: (options) => {
        runnerPrune = options.prune;
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

    assert.strictEqual(runnerPrune, true);
  });

  test('runs suite with test isolation', () => {
    let runnerIsolation: string | undefined;

    runCli({
      args: [
        '--isolation',
        'none'
      ],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: (options) => {
        runnerIsolation = options.isolation;
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

    assert.strictEqual(runnerIsolation, 'none');
  });

  test('runs suite with short test isolation option', () => {
    let runnerIsolation: string | undefined;

    runCli({
      args: [
        '/workspace/project',
        '-i',
        'process'
      ],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: (options) => {
        runnerIsolation = options.isolation;
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

    assert.strictEqual(runnerIsolation, 'process');
  });

  test('runs suite with node args', () => {
    let runnerNodeArgs: readonly string[] | undefined;

    runCli({
      args: [
        '--node-args',
        '--no-warnings',
        '--conditions=development'
      ],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: (options) => {
        runnerNodeArgs = options.nodeArgs;
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

    assert.deepStrictEqual(runnerNodeArgs, [
      '--no-warnings',
      '--conditions=development'
    ]);
  });

  test('passes remaining args after node args boundary', () => {
    let runnerProjectDir: string | undefined;
    let runnerNodeArgs: readonly string[] | undefined;

    runCli({
      args: [
        '/workspace/project',
        '--node-args',
        '--help'
      ],
      defaultProjectDir: '/project',
      runnerFile: '/project/dist/bin.js'
    }, {
      readVersion: () => {
        assert.fail('Unexpected version read');
      },
      runSuite: (options) => {
        runnerProjectDir = options.projectDir;
        runnerNodeArgs = options.nodeArgs;
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
    assert.deepStrictEqual(runnerNodeArgs, ['--help']);
  });

  test('rejects TypeScript project option without value', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['--project'],
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
    assert.deepStrictEqual(stderr, ['Option --project expects a value.\n']);
  });

  test('rejects duplicate TypeScript project option', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: [
        '--project',
        'tsconfig.test.json',
        '-p',
        'tsconfig.build.json'
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
    assert.deepStrictEqual(stderr, ['Option --project cannot be specified more than once.\n']);
  });

  test('rejects test isolation option without value', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['--isolation'],
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
    assert.deepStrictEqual(stderr, ['Option --isolation expects a value.\n']);
  });

  test('rejects duplicate test isolation option', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: [
        '--isolation',
        'none',
        '-i',
        'process'
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
    assert.deepStrictEqual(stderr, ['Option --isolation cannot be specified more than once.\n']);
  });

  test('rejects duplicate prune option', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: [
        '--prune',
        '--prune'
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
    assert.deepStrictEqual(stderr, ['Option --prune cannot be specified more than once.\n']);
  });

  test('rejects node args option without value', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: ['--node-args'],
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
    assert.deepStrictEqual(stderr, ['Option --node-args expects at least one value.\n']);
  });

  test('rejects node args without process isolation', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: [
        '--isolation',
        'none',
        '--node-args',
        '--no-warnings'
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
    assert.deepStrictEqual(stderr, ['Option --node-args cannot be used with isolation "none".\n']);
  });

  test('rejects unknown test isolation value', () => {
    const stderr: string[] = [];
    let exitCode: number | undefined;
    let suiteWasRun = false;

    runCli({
      args: [
        '--isolation',
        'thread'
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
    assert.deepStrictEqual(stderr, ['Option --isolation expects "process" or "none".\n']);
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
