import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { describe, test } from 'node:test';

import {
  prepareSuite,
  runPreparedSuite,
  runSuiteAsync
} from './index';

function createEmptyProject(): string {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwa-orchestration-'));

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

  return projectDir;
}

describe('package orchestration API', () => {
  test('prepares a plan and runs an empty suite without process side effects', async (t) => {
    const projectDir = createEmptyProject();
    const previousExitCode = process.exitCode;

    t.after(() => {
      process.exitCode = previousExitCode;
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    process.exitCode = undefined;

    const plan = prepareSuite({ projectDir });
    const preparedResult = await runPreparedSuite(plan);
    const result = await runSuiteAsync({ projectDir });

    assert.strictEqual(plan.projectDir, projectDir);
    assert.deepStrictEqual(plan.testFiles, []);
    assert.strictEqual(preparedResult.status, 'empty');
    assert.strictEqual(result.status, 'empty');
    assert.strictEqual(result.exitCode, 1);
    assert.deepStrictEqual(result.testFiles, []);
    assert.strictEqual(process.exitCode, undefined);
  });

  test('runs compiled tests and returns a structured summary', async (t) => {
    const projectDir = createEmptyProject();
    const sourceFile = path.join(projectDir, 'source', 'example.test.ts');
    const compiledFile = path.join(projectDir, 'build', 'example.test.js');
    const previousExitCode = process.exitCode;

    t.after(() => {
      process.exitCode = previousExitCode;
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(sourceFile, '');
    fs.writeFileSync(
      compiledFile,
      [
        "const { test } = require('node:test');",
        "test('example', () => {});",
        "test('expected failure', { todo: true }, () => { throw new Error('expected'); });",
        ''
      ].join('\n')
    );
    fs.utimesSync(
      sourceFile,
      new Date('2000-01-01T00:00:00.000Z'),
      new Date('2000-01-01T00:00:00.000Z')
    );
    process.exitCode = undefined;

    const orchestrationScript = path.join(projectDir, 'orchestrator.cjs');

    fs.writeFileSync(orchestrationScript, [
      `const { runSuiteAsync } = require(${JSON.stringify(path.join(__dirname, 'index.js'))});`,
      'const projectDir = process.argv[2];',
      'const events = [];',
      'runSuiteAsync({ projectDir, onEvent: (event) => events.push(event.type) })',
      '  .then((result) => {',
      '    console.log(JSON.stringify({ result, events }));',
      '    process.exitCode = result.exitCode;',
      '  })',
      '  .catch((error) => {',
      '    console.error(error);',
      '    process.exitCode = 2;',
      '  });',
      ''
    ].join('\n'));
    const childEnvironment = { ...process.env };

    delete childEnvironment['NODE_TEST_CONTEXT'];

    const childResult = spawnSync(
      process.execPath,
      [orchestrationScript, projectDir],
      {
        encoding: 'utf8',
        env: childEnvironment
      }
    );

    assert.strictEqual(childResult.status, 0, childResult.stderr);

    const payload = JSON.parse(childResult.stdout) as {
      result?: {
        status?: string;
        exitCode?: number;
        counts?: {
          failed?: number;
          passed?: number;
          todo?: number;
        };
      };
      events?: string[];
    };
    const result = payload.result;

    assert.ok(result !== undefined);

    assert.strictEqual(result.status, 'passed');
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.counts?.failed, 0);
    assert.strictEqual(result.counts?.passed, 1);
    assert.strictEqual(result.counts?.todo, 1);
    assert.ok(payload.events?.includes('pass'));
    assert.ok(payload.events?.includes('summary'));
    assert.strictEqual(process.exitCode, undefined);
  });

  test('cancels execution through AbortSignal without changing process state', async (t) => {
    const projectDir = createEmptyProject();
    const sourceFile = path.join(projectDir, 'source', 'slow.test.ts');
    const compiledFile = path.join(projectDir, 'build', 'slow.test.js');
    const previousExitCode = process.exitCode;

    t.after(() => {
      process.exitCode = previousExitCode;
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(sourceFile, '');
    fs.writeFileSync(
      compiledFile,
      [
        "const { test } = require('node:test');",
        "test('slow', async () => new Promise((resolve) => setTimeout(resolve, 5000)));",
        ''
      ].join('\n')
    );
    fs.utimesSync(
      sourceFile,
      new Date('2000-01-01T00:00:00.000Z'),
      new Date('2000-01-01T00:00:00.000Z')
    );
    process.exitCode = undefined;

    const orchestrationScript = path.join(projectDir, 'abort-orchestrator.cjs');

    fs.writeFileSync(orchestrationScript, [
      `const { runSuiteAsync } = require(${JSON.stringify(path.join(__dirname, 'index.js'))});`,
      'const projectDir = process.argv[2];',
      'const controller = new AbortController();',
      'setTimeout(() => controller.abort(), 25);',
      'runSuiteAsync({ projectDir, signal: controller.signal })',
      '  .then((result) => {',
      '    console.log(JSON.stringify({ result, exitCode: process.exitCode ?? null }));',
      '  })',
      '  .catch((error) => {',
      '    console.error(error);',
      '    process.exitCode = 2;',
      '  });',
      ''
    ].join('\n'));
    const childEnvironment = { ...process.env };

    delete childEnvironment['NODE_TEST_CONTEXT'];

    const childResult = spawnSync(
      process.execPath,
      [orchestrationScript, projectDir],
      {
        encoding: 'utf8',
        env: childEnvironment
      }
    );

    assert.strictEqual(childResult.status, 0, childResult.stderr);

    const payload = JSON.parse(childResult.stdout) as {
      exitCode?: number | null;
      result?: {
        counts?: {
          cancelled?: number;
          failed?: number;
        };
        exitCode?: number;
        status?: string;
      };
    };

    assert.strictEqual(payload.result?.status, 'failed');
    assert.strictEqual(payload.result?.exitCode, 1);
    assert.strictEqual(payload.result?.counts?.cancelled, 1);
    assert.strictEqual(payload.result?.counts?.failed, 0);
    assert.strictEqual(payload.exitCode, null);
    assert.strictEqual(process.exitCode, undefined);
  });
});
