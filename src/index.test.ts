import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { describe, test } from 'node:test';

import type { SuitePlan, SuiteRunResult } from './index';

describe('index', () => {
  test('imports the package without loading suite infrastructure in a child process', () => {
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        [
          "const Module = require('node:module');",
          'const loadModule = Module._load;',
          '',
          'Module._load = function guardedLoad(request, parent, isMain) {',
          "  if (request === './bootstrap/suite') {",
          "    throw new Error('suite infrastructure loaded during import');",
          '  }',
          '',
          '  return loadModule.call(this, request, parent, isMain);',
          '};',
          '',
          'require(process.argv[1]);'
        ].join('\n'),
        path.resolve(__dirname, '..')
      ],
      { encoding: 'utf8' }
    );

    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(result.stdout, '');
    assert.strictEqual(result.stderr, '');
  });

  describe('prepareSuite', () => {
    test('returns a filesystem plan without executing compiled tests in a child process', (t) => {
      const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwa-api-'));
      const sourceDir = path.join(projectDir, 'src');
      const distDir = path.join(projectDir, 'dist');
      const sourceFile = path.join(sourceDir, 'fixture.test.ts');
      const compiledFile = path.join(distDir, 'fixture.test.js');

      t.after(() => {
        fs.rmSync(projectDir, { recursive: true, force: true });
      });

      fs.mkdirSync(sourceDir);
      fs.mkdirSync(distDir);
      fs.writeFileSync(
        path.join(projectDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { rootDir: 'src', outDir: 'dist' } })
      );
      fs.writeFileSync(sourceFile, '');
      fs.writeFileSync(compiledFile, "throw new Error('preparation executed a test');");
      fs.utimesSync(sourceFile, new Date('2000-01-01'), new Date('2000-01-01'));
      fs.utimesSync(compiledFile, new Date('2000-01-02'), new Date('2000-01-02'));

      const result = spawnSync(
        process.execPath,
        [
          '-e',
          [
            'const { prepareSuite } = require(process.argv[1]);',
            'const plan = prepareSuite({ projectDir: process.argv[2] });',
            'process.stdout.write(JSON.stringify(plan));'
          ].join('\n'),
          path.resolve(__dirname, '..'),
          projectDir
        ],
        { encoding: 'utf8' }
      );

      assert.strictEqual(result.status, 0, result.stderr);

      const plan = JSON.parse(result.stdout) as SuitePlan;

      assert.strictEqual(plan.projectDir, projectDir);
      assert.strictEqual(plan.sourceDir, sourceDir);
      assert.strictEqual(plan.distDir, distDir);
      assert.deepStrictEqual(plan.testFiles, [compiledFile]);
      assert.strictEqual(result.stderr, '');
    });
  });

  describe('runPreparedSuite', () => {
    test('returns success for recorded files without revalidating project sources in a child process', (t) => {
      const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwa-api-'));
      const compiledFile = path.join(projectDir, 'fixture.test.js');
      const runnerFile = path.join(projectDir, 'run-prepared.cjs');

      t.after(() => {
        fs.rmSync(projectDir, { recursive: true, force: true });
      });

      fs.writeFileSync(
        compiledFile,
        "require('node:test').test('prepared fixture passes', () => {});"
      );
      fs.writeFileSync(
        runnerFile,
        [
          "const path = require('node:path');",
          'const { runPreparedSuite } = require(process.argv[2]);',
          'const projectDir = process.argv[3];',
          'const plan = {',
          '  projectDir,',
          "  sourceDir: path.join(projectDir, 'missing-source'),",
          '  distDir: projectDir,',
          '  runnerFile: __filename,',
          '  testFiles: [process.argv[4]]',
          '};',
          '',
          'runPreparedSuite(plan).then((result) => {',
          '  process.stdout.write(JSON.stringify(result));',
          '});'
        ].join('\n')
      );

      const childEnvironment = { ...process.env };

      delete childEnvironment['NODE_TEST_CONTEXT'];

      const result = spawnSync(
        process.execPath,
        [
          runnerFile,
          path.resolve(__dirname, '..'),
          projectDir,
          compiledFile
        ],
        { encoding: 'utf8', env: childEnvironment }
      );

      assert.strictEqual(result.status, 0, result.stderr);

      const suiteResult = JSON.parse(result.stdout) as SuiteRunResult;

      assert.strictEqual(suiteResult.status, 'passed');
      assert.strictEqual(suiteResult.exitCode, 0);
      assert.deepStrictEqual(suiteResult.testFiles, [compiledFile]);
      assert.strictEqual(suiteResult.counts.passed, 1);
      assert.strictEqual(suiteResult.counts.tests, 1);
      assert.strictEqual(result.stderr, '');
    });
  });

  describe('runSuiteAsync', () => {
    test('returns a failed result for a failing filesystem project in a child process', (t) => {
      const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwa-api-'));
      const sourceDir = path.join(projectDir, 'src');
      const distDir = path.join(projectDir, 'dist');
      const sourceFile = path.join(sourceDir, 'fixture.test.ts');
      const compiledFile = path.join(distDir, 'fixture.test.js');
      const runnerFile = path.join(projectDir, 'run-suite-async.cjs');

      t.after(() => {
        fs.rmSync(projectDir, { recursive: true, force: true });
      });

      fs.mkdirSync(sourceDir);
      fs.mkdirSync(distDir);
      fs.writeFileSync(
        path.join(projectDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { rootDir: 'src', outDir: 'dist' } })
      );
      fs.writeFileSync(sourceFile, '');
      fs.writeFileSync(
        compiledFile,
        [
          "require('node:test').test('async fixture fails', () => {",
          "  throw new Error('expected fixture failure');",
          '});'
        ].join('\n')
      );
      fs.utimesSync(sourceFile, new Date('2000-01-01'), new Date('2000-01-01'));
      fs.utimesSync(compiledFile, new Date('2000-01-02'), new Date('2000-01-02'));
      fs.writeFileSync(
        runnerFile,
        [
          'const { runSuiteAsync } = require(process.argv[2]);',
          'const failures = [];',
          '',
          'runSuiteAsync({',
          '  projectDir: process.argv[3],',
          '  onEvent: (event) => {',
          "    if (event.type === 'fail') {",
          '      failures.push(event.data.name);',
          '    }',
          '  }',
          '}).then((result) => {',
          '  process.stdout.write(JSON.stringify({ result, failures }));',
          '});'
        ].join('\n')
      );

      const childEnvironment = { ...process.env };

      delete childEnvironment['NODE_TEST_CONTEXT'];

      const result = spawnSync(
        process.execPath,
        [
          runnerFile,
          path.resolve(__dirname, '..'),
          projectDir
        ],
        { encoding: 'utf8', env: childEnvironment }
      );

      assert.strictEqual(result.status, 0, result.stderr);

      const execution = JSON.parse(result.stdout) as {
        result: SuiteRunResult;
        failures: string[];
      };

      assert.strictEqual(execution.result.status, 'failed');
      assert.strictEqual(execution.result.exitCode, 1);
      assert.deepStrictEqual(execution.result.testFiles, [compiledFile]);
      assert.strictEqual(execution.result.counts.failed, 1);
      assert.strictEqual(execution.result.counts.tests, 1);
      assert.deepStrictEqual(execution.failures, ['async fixture fails']);
      assert.strictEqual(result.stderr, '');
    });
  });

  describe('runSuite', () => {
    test('sets failure exit code for an empty filesystem project in a child process', (t) => {
      const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwa-api-'));

      t.after(() => {
        fs.rmSync(projectDir, { recursive: true, force: true });
      });

      fs.mkdirSync(path.join(projectDir, 'dist'));
      fs.writeFileSync(
        path.join(projectDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { outDir: 'dist' } })
      );

      const result = spawnSync(
        process.execPath,
        [
          '-e',
          [
            'const { runSuite } = require(process.argv[1]);',
            'runSuite({ projectDir: process.argv[2] });'
          ].join('\n'),
          path.resolve(__dirname, '..'),
          projectDir
        ],
        { encoding: 'utf8' }
      );

      assert.strictEqual(result.status, 1, result.stderr);
      assert.strictEqual(result.stdout, '');
      assert.strictEqual(result.stderr, 'No test files found in dist\n');
    });
  });
});
