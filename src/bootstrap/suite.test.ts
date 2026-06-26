import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';

import { resolveSuiteOptions } from './suite';

describe('resolveSuiteOptions', () => {
  test('resolves sourceDir and distDir from tsconfig', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'source'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'source', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        },
        include: [
          'source/**/*.ts'
        ]
      })
    );

    const options = resolveSuiteOptions({
      projectDir,
      runnerFile: 'runner.js'
    });

    assert.strictEqual(options.projectDir, projectDir);
    assert.strictEqual(options.sourceDir, path.join(projectDir, 'source'));
    assert.strictEqual(options.distDir, path.join(projectDir, 'build'));
    assert.strictEqual(options.runnerFile, 'runner.js');
    assert.strictEqual(options.clear, false);
  });

  test('uses selected clear mode', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'source'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'source', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        },
        include: [
          'source/**/*.ts'
        ]
      })
    );

    const options = resolveSuiteOptions({
      projectDir,
      clear: true
    });

    assert.strictEqual(options.clear, true);
  });

  test('uses default test isolation', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'source'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'source', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        },
        include: [
          'source/**/*.ts'
        ]
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

    fs.mkdirSync(path.join(projectDir, 'source'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'source', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'source',
          outDir: 'build'
        },
        include: [
          'source/**/*.ts'
        ]
      })
    );

    const options = resolveSuiteOptions({
      projectDir,
      isolation: 'none'
    });

    assert.strictEqual(options.isolation, 'none');
  });

  test('resolves sourceDir and distDir from selected TypeScript project config', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'test-source'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'test-source', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.test.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'test-source',
          outDir: 'test-build'
        },
        include: [
          'test-source/**/*.ts'
        ]
      })
    );

    const options = resolveSuiteOptions({
      projectDir,
      tsConfigPath: 'tsconfig.test.json',
      runnerFile: 'runner.js'
    });

    assert.strictEqual(options.projectDir, projectDir);
    assert.strictEqual(options.sourceDir, path.join(projectDir, 'test-source'));
    assert.strictEqual(options.distDir, path.join(projectDir, 'test-build'));
    assert.strictEqual(options.runnerFile, 'runner.js');
  });
});
