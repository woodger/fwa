import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';

import { resolveSuiteOptions } from './run-suite.bootstrap';

describe('resolveSuiteOptions', () => {
  test('uses explicit sourceDir and distDir without tsconfig', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    const options = resolveSuiteOptions({
      projectDir,
      sourceDir: 'source',
      distDir: 'build',
      runnerFile: 'runner.js'
    });

    assert.strictEqual(options.projectDir, projectDir);
    assert.strictEqual(options.sourceDir, path.join(projectDir, 'source'));
    assert.strictEqual(options.distDir, path.join(projectDir, 'build'));
    assert.strictEqual(options.runnerFile, 'runner.js');
  });

  test('resolves sourceDir and distDir from tsconfig rootDir and outDir', (t) => {
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
  });

  test('uses TypeScript rootDir default when rootDir is not configured', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'src', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          outDir: 'dist'
        },
        include: [
          'src/**/*.ts'
        ]
      })
    );

    const options = resolveSuiteOptions({
      projectDir,
      runnerFile: 'runner.js'
    });

    assert.strictEqual(options.sourceDir, projectDir);
    assert.strictEqual(options.distDir, path.join(projectDir, 'dist'));
  });

  test('throws when tsconfig does not define outDir', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'src', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'src'
        },
        include: [
          'src/**/*.ts'
        ]
      })
    );

    assert.throws(
      () => {
        resolveSuiteOptions({
          projectDir
        });
      },
      /compilerOptions\.outDir is required/
    );
  });
});
