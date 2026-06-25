import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';

import {
  collectTestFiles,
  removeCompiledTestsWithoutSource,
  resolveSuiteOptions
} from './suite';

describe('collectTestFiles', () => {
  test('collects matching test files recursively in deterministic order', (t) => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(rootDir, 'unit', 'nested'), { recursive: true });

    fs.writeFileSync(path.join(rootDir, 'b.test.js'), '');
    fs.writeFileSync(path.join(rootDir, 'a.test.js'), '');
    fs.writeFileSync(path.join(rootDir, 'unit', 'nested', 'c.test.js'), '');
    fs.writeFileSync(path.join(rootDir, 'unit', 'nested', 'source.test.ts'), '');
    fs.writeFileSync(path.join(rootDir, 'unit', 'nested', 'ignore.js'), '');

    const files = collectTestFiles(rootDir, '.test.js')
      .map((file) => path.relative(rootDir, file).split(path.sep).join('/'));

    assert.deepStrictEqual(files, [
      'a.test.js',
      'b.test.js',
      'unit/nested/c.test.js'
    ]);
  });

  test('collects only files with the requested extension', (t) => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

    t.after(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(rootDir, 'nested'), { recursive: true });

    fs.writeFileSync(path.join(rootDir, 'compiled.test.js'), '');
    fs.writeFileSync(path.join(rootDir, 'source.test.ts'), '');
    fs.writeFileSync(path.join(rootDir, 'nested', 'nested.test.ts'), '');

    const files = collectTestFiles(rootDir, '.test.ts')
      .map((file) => path.relative(rootDir, file).split(path.sep).join('/'));

    assert.deepStrictEqual(files, [
      'nested/nested.test.ts',
      'source.test.ts'
    ]);
  });
});

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

describe('removeCompiledTestsWithoutSource', () => {
  test('keeps compiled test when matching source test exists and is not newer', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
    const distDir = path.join(projectDir, 'dist');
    const sourceDir = path.join(projectDir, 'src');

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });

    const compiledFile = path.join(distDir, 'sample.test.js');
    const sourceFile = path.join(sourceDir, 'sample.test.ts');

    fs.writeFileSync(compiledFile, '');
    fs.writeFileSync(sourceFile, '');

    fs.utimesSync(
      sourceFile,
      new Date('2000-01-01T00:00:00.000Z'),
      new Date('2000-01-01T00:00:00.000Z')
    );

    fs.utimesSync(
      compiledFile,
      new Date('2000-01-02T00:00:00.000Z'),
      new Date('2000-01-02T00:00:00.000Z')
    );

    const messages: string[] = [];

    const runnableFiles = removeCompiledTestsWithoutSource(
      [compiledFile],
      {
        distDir,
        sourceDir,
        projectDir,
        log: (message) => {
          messages.push(message);
        }
      }
    );

    assert.deepStrictEqual(runnableFiles, [compiledFile]);
    assert.strictEqual(fs.existsSync(compiledFile), true);
    assert.deepStrictEqual(messages, []);
  });

  test('removes compiled test when matching source test does not exist', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
    const distDir = path.join(projectDir, 'dist');
    const sourceDir = path.join(projectDir, 'src');

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });

    const compiledFile = path.join(distDir, 'orphan.test.js');
    fs.writeFileSync(compiledFile, '');

    const messages: string[] = [];

    const runnableFiles = removeCompiledTestsWithoutSource(
      [compiledFile],
      {
        distDir,
        sourceDir,
        projectDir,
        log: (message) => {
          messages.push(message);
        }
      }
    );

    assert.deepStrictEqual(runnableFiles, []);
    assert.strictEqual(fs.existsSync(compiledFile), false);
    assert.deepStrictEqual(messages, [
      [
        'Removed stale compiled tests without source:',
        '- dist/orphan.test.js'
      ].join('\n')
    ]);
  });

  test('throws when source test is newer than compiled test', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
    const distDir = path.join(projectDir, 'dist');
    const sourceDir = path.join(projectDir, 'src');

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });

    const compiledFile = path.join(distDir, 'stale.test.js');
    const sourceFile = path.join(sourceDir, 'stale.test.ts');

    fs.writeFileSync(compiledFile, '');
    fs.writeFileSync(sourceFile, '');

    fs.utimesSync(
      compiledFile,
      new Date('2000-01-01T00:00:00.000Z'),
      new Date('2000-01-01T00:00:00.000Z')
    );

    fs.utimesSync(
      sourceFile,
      new Date('2000-01-02T00:00:00.000Z'),
      new Date('2000-01-02T00:00:00.000Z')
    );

    const ignoredMessages: string[] = [];

    assert.throws(
      () => {
        removeCompiledTestsWithoutSource(
          [compiledFile],
          {
            distDir,
            sourceDir,
            projectDir,
            log: (message) => {
              ignoredMessages.push(message);
            }
          }
        );
      },
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(
          error.message,
          /Compiled tests are older than source tests\./
        );
        assert.match(
          error.message,
          /- dist\/stale\.test\.js \(source: src\/stale\.test\.ts\)/
        );

        return true;
      }
    );

    assert.deepStrictEqual(ignoredMessages, []);
  });

  test('checks nested compiled tests against matching nested source tests', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
    const distDir = path.join(projectDir, 'dist');
    const sourceDir = path.join(projectDir, 'src');

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(distDir, 'feature', 'nested'), { recursive: true });
    fs.mkdirSync(path.join(sourceDir, 'feature', 'nested'), { recursive: true });

    const compiledFile = path.join(
      distDir,
      'feature',
      'nested',
      'sample.test.js'
    );

    const sourceFile = path.join(
      sourceDir,
      'feature',
      'nested',
      'sample.test.ts'
    );

    fs.writeFileSync(compiledFile, '');
    fs.writeFileSync(sourceFile, '');

    fs.utimesSync(
      sourceFile,
      new Date('2000-01-01T00:00:00.000Z'),
      new Date('2000-01-01T00:00:00.000Z')
    );

    fs.utimesSync(
      compiledFile,
      new Date('2000-01-02T00:00:00.000Z'),
      new Date('2000-01-02T00:00:00.000Z')
    );

    const ignoredMessages: string[] = [];

    const runnableFiles = removeCompiledTestsWithoutSource(
      [compiledFile],
      {
        distDir,
        sourceDir,
        projectDir,
        log: (message) => {
          ignoredMessages.push(message);
        }
      }
    );

    assert.deepStrictEqual(runnableFiles, [compiledFile]);
    assert.deepStrictEqual(ignoredMessages, []);
  });
});
