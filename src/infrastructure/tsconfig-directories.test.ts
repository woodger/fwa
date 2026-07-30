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

  test('reads inherited rootDir and outDir relative to the extended config', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(projectDir, 'config'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'source'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'source', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(projectDir, 'config', 'tsconfig.base.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: '../source',
          outDir: '../build'
        }
      })
    );
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        extends: './config/tsconfig.base.json',
        include: [
          'source/**/*.ts'
        ]
      })
    );

    const directories = readTsConfigDirectories(projectDir);

    assert.strictEqual(directories.sourceDir, path.join(projectDir, 'source'));
    assert.strictEqual(directories.distDir, path.join(projectDir, 'build'));
  });

  test('throws when an extended TypeScript config cannot be read', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        extends: './missing.json',
        compilerOptions: {
          rootDir: 'src',
          outDir: 'dist'
        }
      })
    );

    assert.throws(
      () => {
        readTsConfigDirectories(projectDir);
      },
      /error TS5083: Cannot read file/
    );
  });

  test('throws when an extended TypeScript config is malformed', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.base.json'),
      '{"compilerOptions":'
    );
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        extends: './tsconfig.base.json',
        compilerOptions: {
          rootDir: 'src',
          outDir: 'dist'
        }
      })
    );

    assert.throws(
      () => {
        readTsConfigDirectories(projectDir);
      },
      /error TS1109: Expression expected/
    );
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

  test('reads directories without requiring TypeScript input files', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'src',
          outDir: 'dist'
        }
      })
    );

    const directories = readTsConfigDirectories(projectDir);

    assert.strictEqual(directories.sourceDir, path.join(projectDir, 'src'));
    assert.strictEqual(directories.distDir, path.join(projectDir, 'dist'));
  });

  test('reads directories without validating unrelated compiler options', (t) => {
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
          target: 'invalid',
          strict: 'invalid',
          rootDir: 'src',
          outDir: 'dist'
        },
        include: [
          'src/**/*.ts'
        ]
      })
    );

    const directories = readTsConfigDirectories(projectDir);

    assert.strictEqual(directories.sourceDir, path.join(projectDir, 'src'));
    assert.strictEqual(directories.distDir, path.join(projectDir, 'dist'));
  });

  test('throws when rootDir is not a string', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 123,
          outDir: 'dist'
        }
      })
    );

    assert.throws(
      () => {
        readTsConfigDirectories(projectDir);
      },
      /error TS5024: Compiler option 'rootDir' requires a value of type string/
    );
  });

  test('throws when outDir is not a string', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'src',
          outDir: 123
        }
      })
    );

    assert.throws(
      () => {
        readTsConfigDirectories(projectDir);
      },
      /error TS5024: Compiler option 'outDir' requires a value of type string/
    );
  });

  test('throws when an explicit TypeScript config cannot be read', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    assert.throws(
      () => {
        readTsConfigDirectories(projectDir, 'missing.json');
      },
      /error TS5083: Cannot read file/
    );
  });

  test('throws when the selected TypeScript config is malformed', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      '{"compilerOptions":'
    );

    assert.throws(
      () => {
        readTsConfigDirectories(projectDir);
      },
      /error TS\d+:/
    );
  });

  test('does not use a parent TypeScript config by default', (t) => {
    const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
    const projectDir = path.join(parentDir, 'packages', 'feature');

    t.after(() => {
      fs.rmSync(parentDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(parentDir, 'src'), { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(parentDir, 'src', 'sample.ts'), '');
    fs.writeFileSync(
      path.join(parentDir, 'tsconfig.json'),
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

    assert.throws(
      () => {
        readTsConfigDirectories(projectDir);
      },
      /Cannot find tsconfig\.json/
    );
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
