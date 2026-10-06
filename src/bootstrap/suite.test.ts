import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { describe, test } from 'node:test';

import type { SuitePlan } from '../application/run-suite';
import * as nodeTestAdapter from '../infrastructure/node-test';
import {
  prepareSuite,
  resolveSuiteOptions,
  runPreparedSuite,
  runSuite,
  runSuiteAsync
} from './suite';

describe('resolveSuiteOptions', () => {
  test('resolves sourceDir and distDir from tsconfig', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        }
      })
    );

    const options = resolveSuiteOptions({
      projectDir
    });

    assert.strictEqual(options.projectDir, projectDir);
    assert.strictEqual(options.sourceDir, path.join(projectDir, 'source'));
    assert.strictEqual(options.distDir, path.join(projectDir, 'build'));
  });

  test('keeps the selected runner file', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: 'build' } })
    );

    const options = resolveSuiteOptions({ projectDir, runnerFile: 'runner.js' });

    assert.strictEqual(options.runnerFile, 'runner.js');
  });

  test('uses default prune mode', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: 'build' } })
    );

    const options = resolveSuiteOptions({ projectDir });

    assert.strictEqual(options.prune, false);
  });

  test('uses default node args', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: 'build' } })
    );

    const options = resolveSuiteOptions({ projectDir });

    assert.deepStrictEqual(options.nodeArgs, []);
  });

  test('uses selected prune mode', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        }
      })
    );

    const options = resolveSuiteOptions({
      projectDir,
      prune: true
    });

    assert.strictEqual(options.prune, true);
  });

  test('uses default test isolation', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        }
      })
    );

    const options = resolveSuiteOptions({
      projectDir
    });

    assert.strictEqual(options.isolation, 'process');
  });

  test('uses selected test isolation', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        }
      })
    );

    const options = resolveSuiteOptions({
      projectDir,
      isolation: 'none'
    });

    assert.strictEqual(options.isolation, 'none');
  });

  test('uses selected node args', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        }
      })
    );

    const options = resolveSuiteOptions({
      projectDir,
      nodeArgs: [
        '--no-warnings',
        '--conditions=development'
      ]
    });

    assert.deepStrictEqual(options.nodeArgs, [
      '--no-warnings',
      '--conditions=development'
    ]);
  });

  test('rejects node args without process isolation', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        }
      })
    );

    assert.throws(
      () => {
        resolveSuiteOptions({
          projectDir,
          isolation: 'none',
          nodeArgs: [
            '--no-warnings'
          ]
        });
      },
      /Node args cannot be used with isolation "none"\./
    );
  });

  test('resolves sourceDir and distDir from selected TypeScript project config', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.test.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'test-source',
          outDir: 'test-build'
        }
      })
    );

    const options = resolveSuiteOptions({
      projectDir,
      tsConfigPath: 'tsconfig.test.json'
    });

    assert.strictEqual(options.projectDir, projectDir);
    assert.strictEqual(options.sourceDir, path.join(projectDir, 'test-source'));
    assert.strictEqual(options.distDir, path.join(projectDir, 'test-build'));
  });
});

describe('prepareSuite', () => {
  test('preserves the caller exit code for an empty project', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
    const previousExitCode = process.exitCode;

    t.after(() => {
      process.exitCode = previousExitCode;
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'build'));
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: 'build' } })
    );

    process.exitCode = 23;

    prepareSuite({ projectDir });

    assert.strictEqual(process.exitCode, 23);
  });

  test('throws when a compiled test has no source', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'build'));
    fs.writeFileSync(path.join(projectDir, 'build', 'orphan.test.js'), '');
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: 'build' } })
    );

    assert.throws(
      () => prepareSuite({ projectDir }),
      /Stale compiled tests without source found\./
    );
  });
});

describe('runPreparedSuite', () => {
  test('returns an empty result without accessing project files', async () => {
    const plan: SuitePlan = {
      projectDir: '/project',
      sourceDir: '/project/src',
      distDir: '/project/dist',
      runnerFile: '/project/dist/bin.js',
      testFiles: []
    };

    const result = await runPreparedSuite(plan);

    assert.deepStrictEqual(result, {
      status: 'empty',
      exitCode: 1,
      testFiles: [],
      counts: {
        cancelled: 0,
        failed: 0,
        passed: 0,
        skipped: 0,
        suites: 0,
        tests: 0,
        todo: 0
      },
      durationMs: 0
    });
  });

  test('preserves the caller exit code after failed execution', async (t) => {
    const previousExitCode = process.exitCode;
    const plan: SuitePlan = {
      projectDir: '/project',
      sourceDir: '/project/src',
      distDir: '/project/dist',
      runnerFile: '/project/dist/bin.js',
      testFiles: ['/project/dist/example.test.js']
    };

    t.after(() => {
      process.exitCode = previousExitCode;
    });
    t.mock.method(nodeTestAdapter, 'runNodeTestFilesAsync', async () => ({
      success: false,
      counts: {
        cancelled: 0,
        failed: 1,
        passed: 0,
        skipped: 0,
        suites: 0,
        tests: 1,
        todo: 0
      },
      durationMs: 1
    }));

    process.exitCode = 23;

    await runPreparedSuite(plan);

    assert.strictEqual(process.exitCode, 23);
  });
});

describe('runSuiteAsync', () => {
  test('rejects when the project config is missing', async (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    await assert.rejects(
      runSuiteAsync({ projectDir }),
      /Cannot find tsconfig\.json/
    );
  });
});

describe('runSuite', () => {
  test('warns and sets failure exit code when no compiled tests are found', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
    const previousExitCode = process.exitCode;
    const warnings: string[] = [];

    t.after(() => {
      process.exitCode = previousExitCode;
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'source'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'build'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        }
      })
    );

    t.mock.method(console, 'warn', (message: unknown) => {
      warnings.push(String(message));
    });
    process.exitCode = undefined;

    runSuite({
      projectDir
    });

    assert.deepStrictEqual(warnings, ['No test files found in build']);
    assert.strictEqual(process.exitCode, 1);
  });
});
