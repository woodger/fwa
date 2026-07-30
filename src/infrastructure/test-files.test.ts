import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { describe, test } from 'node:test';

import {
  collectTestFiles,
  checkCompiledTests
} from './test-files';

describe('test-files', () => {
  describe('collectTestFiles', () => {
    test('collects matching files recursively', (t) => {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

      t.after(() => {
        fs.rmSync(rootDir, { recursive: true, force: true });
      });

      fs.mkdirSync(path.join(rootDir, 'unit', 'nested'), { recursive: true });

      fs.writeFileSync(path.join(rootDir, 'root.test.js'), '');
      fs.writeFileSync(path.join(rootDir, 'unit', 'nested', 'c.test.js'), '');

      const files = collectTestFiles(rootDir, '.test.js')
        .map((file) => path.relative(rootDir, file).split(path.sep).join('/'));

      assert.deepStrictEqual(files, [
        'root.test.js',
        'unit/nested/c.test.js'
      ]);
    });

    test('preserves sorted depth-first order across files and directories', (t) => {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

      t.after(() => {
        fs.rmSync(rootDir, { recursive: true, force: true });
      });

      fs.mkdirSync(path.join(rootDir, 'a-directory'));
      fs.mkdirSync(path.join(rootDir, 'c-directory'));

      fs.writeFileSync(path.join(rootDir, 'a-directory', 'nested.test.js'), '');
      fs.writeFileSync(path.join(rootDir, 'b.test.js'), '');
      fs.writeFileSync(path.join(rootDir, 'c-directory', 'nested.test.js'), '');

      const files = collectTestFiles(rootDir, '.test.js')
        .map((file) => path.relative(rootDir, file).split(path.sep).join('/'));

      assert.deepStrictEqual(files, [
        'a-directory/nested.test.js',
        'b.test.js',
        'c-directory/nested.test.js'
      ]);
    });

    test('collects all requested extensions', (t) => {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

      t.after(() => {
        fs.rmSync(rootDir, { recursive: true, force: true });
      });

      fs.writeFileSync(path.join(rootDir, 'sample.spec.js'), '');
      fs.writeFileSync(path.join(rootDir, 'sample.test.js'), '');
      fs.writeFileSync(path.join(rootDir, 'sample.js'), '');

      const files = collectTestFiles(rootDir, ['.test.js', '.spec.js'])
        .map((file) => path.relative(rootDir, file).split(path.sep).join('/'));

      assert.deepStrictEqual(files, [
        'sample.spec.js',
        'sample.test.js'
      ]);
    });

    test('returns files in locale-independent order', (t) => {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));

      t.after(() => {
        fs.rmSync(rootDir, { recursive: true, force: true });
      });

      fs.writeFileSync(path.join(rootDir, 'ä.test.js'), '');
      fs.writeFileSync(path.join(rootDir, 'z.test.js'), '');
      fs.writeFileSync(path.join(rootDir, 'a.test.js'), '');

      const files = collectTestFiles(rootDir, '.test.js')
        .map((file) => path.relative(rootDir, file).split(path.sep).join('/'));

      assert.deepStrictEqual(files, [
        'a.test.js',
        'z.test.js',
        'ä.test.js'
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
      fs.writeFileSync(path.join(rootDir, 'source.spec.ts'), '');
      fs.writeFileSync(path.join(rootDir, 'nested', 'nested.test.ts'), '');

      const files = collectTestFiles(rootDir, '.test.ts')
        .map((file) => path.relative(rootDir, file).split(path.sep).join('/'));

      assert.deepStrictEqual(files, [
        'nested/nested.test.ts',
        'source.test.ts'
      ]);
    });
  });

  describe('checkCompiledTests', () => {
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

      const runnableFiles = checkCompiledTests(
        [compiledFile],
        {
          distDir,
          sourceDir,
          projectDir,
          prune: false,
          log: (message) => {
            messages.push(message);
          }
        }
      );

      assert.deepStrictEqual(runnableFiles, [compiledFile]);
      assert.strictEqual(fs.existsSync(compiledFile), true);
      assert.deepStrictEqual(messages, []);
    });

    test('throws when compiled test has no source and prune is disabled', (t) => {
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

      assert.throws(
        () => {
          checkCompiledTests(
            [compiledFile],
            {
              distDir,
              sourceDir,
              projectDir,
              prune: false,
              log: (message) => {
                messages.push(message);
              }
            }
          );
        },
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.match(
            error.message,
            /Stale compiled tests without source found\./
          );
          assert.match(
            error.message,
            /Run with --prune to remove them:/
          );
          assert.match(
            error.message,
            /- dist\/orphan\.test\.js/
          );

          return true;
        }
      );

      assert.strictEqual(fs.existsSync(compiledFile), true);
      assert.deepStrictEqual(messages, []);
    });

    test('removes compiled test when matching source test does not exist and prune is enabled', (t) => {
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

      const runnableFiles = checkCompiledTests(
        [compiledFile],
        {
          distDir,
          sourceDir,
          projectDir,
          prune: true,
          log: (message) => {
            messages.push(message);
          }
        }
      );

      assert.deepStrictEqual(runnableFiles, []);
      assert.strictEqual(fs.existsSync(compiledFile), false);
      assert.deepStrictEqual(messages, [
        [
          'Pruned stale compiled tests without source:',
          '- dist/orphan.test.js'
        ].join('\n')
      ]);
    });

    test('does not prune compiled tests outside the project', (t) => {
      const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
      const projectDir = path.join(workspaceDir, 'project');
      const distDir = path.join(workspaceDir, 'outside');
      const sourceDir = path.join(projectDir, 'src');

      t.after(() => {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      });

      fs.mkdirSync(distDir, { recursive: true });
      fs.mkdirSync(sourceDir, { recursive: true });

      const compiledFile = path.join(distDir, 'orphan.test.js');
      fs.writeFileSync(compiledFile, '');

      assert.throws(
        () => {
          checkCompiledTests(
            [compiledFile],
            {
              distDir,
              sourceDir,
              projectDir,
              prune: true
            }
          );
        },
        /--prune requires distDir to be a dedicated directory inside projectDir/
      );

      assert.strictEqual(fs.existsSync(compiledFile), true);
    });

    test('does not prune through a symlink outside the project', (t) => {
      const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
      const projectDir = path.join(workspaceDir, 'project');
      const outsideDir = path.join(workspaceDir, 'outside');
      const distDir = path.join(projectDir, 'dist');
      const sourceDir = path.join(projectDir, 'src');

      t.after(() => {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      });

      fs.mkdirSync(sourceDir, { recursive: true });
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.symlinkSync(
        outsideDir,
        distDir,
        process.platform === 'win32' ? 'junction' : 'dir'
      );

      const compiledFile = path.join(distDir, 'orphan.test.js');
      fs.writeFileSync(compiledFile, '');

      assert.throws(
        () => {
          checkCompiledTests(
            [compiledFile],
            {
              distDir,
              sourceDir,
              projectDir,
              prune: true
            }
          );
        },
        /--prune requires distDir to be a dedicated directory inside projectDir/
      );

      assert.strictEqual(fs.existsSync(compiledFile), true);
    });

    test('does not prune compiled tests from the project root', (t) => {
      const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
      const sourceDir = path.join(projectDir, 'src');

      t.after(() => {
        fs.rmSync(projectDir, { recursive: true, force: true });
      });

      fs.mkdirSync(sourceDir, { recursive: true });

      const compiledFile = path.join(projectDir, 'orphan.test.js');
      fs.writeFileSync(compiledFile, '');

      assert.throws(
        () => {
          checkCompiledTests(
            [compiledFile],
            {
              distDir: projectDir,
              sourceDir,
              projectDir,
              prune: true
            }
          );
        },
        /--prune requires distDir to be a dedicated directory inside projectDir/
      );

      assert.strictEqual(fs.existsSync(compiledFile), true);
    });

    test('does not prune files when another compiled test is outdated', (t) => {
      const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
      const distDir = path.join(projectDir, 'dist');
      const sourceDir = path.join(projectDir, 'src');

      t.after(() => {
        fs.rmSync(projectDir, { recursive: true, force: true });
      });

      fs.mkdirSync(distDir, { recursive: true });
      fs.mkdirSync(sourceDir, { recursive: true });

      const orphanFile = path.join(distDir, 'orphan.test.js');
      const outdatedFile = path.join(distDir, 'outdated.test.js');
      const sourceFile = path.join(sourceDir, 'outdated.test.ts');

      fs.writeFileSync(orphanFile, '');
      fs.writeFileSync(outdatedFile, '');
      fs.writeFileSync(sourceFile, '');

      fs.utimesSync(
        outdatedFile,
        new Date('2000-01-01T00:00:00.000Z'),
        new Date('2000-01-01T00:00:00.000Z')
      );
      fs.utimesSync(
        sourceFile,
        new Date('2000-01-02T00:00:00.000Z'),
        new Date('2000-01-02T00:00:00.000Z')
      );

      assert.throws(
        () => {
          checkCompiledTests(
            [
              orphanFile,
              outdatedFile
            ],
            {
              distDir,
              sourceDir,
              projectDir,
              prune: true
            }
          );
        },
        /Compiled tests are older than source tests/
      );

      assert.strictEqual(fs.existsSync(orphanFile), true);
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
          checkCompiledTests(
            [compiledFile],
            {
              distDir,
              sourceDir,
              projectDir,
              prune: false,
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

    test('keeps nested compiled test when matching nested source test exists', (t) => {
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

      const runnableFiles = checkCompiledTests(
        [compiledFile],
        {
          distDir,
          sourceDir,
          projectDir,
          prune: false,
          log: (message) => {
            ignoredMessages.push(message);
          }
        }
      );

      assert.deepStrictEqual(runnableFiles, [compiledFile]);
      assert.deepStrictEqual(ignoredMessages, []);
    });

    test('keeps compiled spec when matching source spec exists', (t) => {
      const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
      const distDir = path.join(projectDir, 'dist');
      const sourceDir = path.join(projectDir, 'src');

      t.after(() => {
        fs.rmSync(projectDir, { recursive: true, force: true });
      });

      fs.mkdirSync(distDir, { recursive: true });
      fs.mkdirSync(sourceDir, { recursive: true });

      const compiledFile = path.join(distDir, 'sample.spec.js');
      const sourceFile = path.join(sourceDir, 'sample.spec.ts');

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

      const runnableFiles = checkCompiledTests(
        [compiledFile],
        {
          distDir,
          sourceDir,
          projectDir,
          prune: false,
          log: (message) => {
            messages.push(message);
          }
        }
      );

      assert.deepStrictEqual(runnableFiles, [compiledFile]);
      assert.strictEqual(fs.existsSync(compiledFile), true);
      assert.deepStrictEqual(messages, []);
    });
  });
});
