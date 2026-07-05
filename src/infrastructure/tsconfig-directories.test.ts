import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';

import { readTsConfigDirectories } from './tsconfig-directories';

describe('readTsConfigDirectories', () => {
  test('reads rootDir and outDir from tsconfig', (t) => {
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

    const directories = readTsConfigDirectories(projectDir);

    assert.strictEqual(directories.sourceDir, path.join(projectDir, 'source'));
    assert.strictEqual(directories.distDir, path.join(projectDir, 'build'));
  });

  test('uses tsconfig directory as source root when rootDir is not configured', (t) => {
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

    const directories = readTsConfigDirectories(projectDir);

    assert.strictEqual(directories.sourceDir, projectDir);
    assert.strictEqual(directories.distDir, path.join(projectDir, 'dist'));
  });

  test('reads explicit TypeScript project config file', (t) => {
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

    const directories = readTsConfigDirectories(projectDir, 'tsconfig.test.json');

    assert.strictEqual(directories.sourceDir, path.join(projectDir, 'test-source'));
    assert.strictEqual(directories.distDir, path.join(projectDir, 'test-build'));
  });

  test('reads explicit TypeScript project directory', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
    const packageDir = path.join(projectDir, 'packages', 'feature');

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(packageDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(packageDir, 'src', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(packageDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'src',
          outDir: 'dist'
        },
        include: [
          'src/**/*.ts'
        ]
      })
    );

    const directories = readTsConfigDirectories(projectDir, path.join('packages', 'feature'));

    assert.strictEqual(directories.sourceDir, path.join(packageDir, 'src'));
    assert.strictEqual(directories.distDir, path.join(packageDir, 'dist'));
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
        readTsConfigDirectories(projectDir);
      },
      /compilerOptions\.outDir is required/
    );
  });
});
