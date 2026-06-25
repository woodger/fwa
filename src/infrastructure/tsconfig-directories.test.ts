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

    const directories = readTsConfigDirectories(projectDir);

    assert.strictEqual(directories.sourceDir, projectDir);
    assert.strictEqual(directories.distDir, path.join(projectDir, 'dist'));
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
