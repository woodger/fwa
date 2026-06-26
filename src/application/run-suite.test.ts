import assert from 'node:assert';
import { describe, test } from 'node:test';

import {
  runSuiteUseCase,
  type CompiledTestCleanupOptions,
  type RunSuiteUseCaseDependencies
} from './run-suite';

describe('runSuiteUseCase', () => {
  test('sets exit code when no runnable tests are found', () => {
    const warnings: string[] = [];
    let exitCode: number | undefined;
    let ranFiles: string[] | undefined;

    const dependencies: RunSuiteUseCaseDependencies = {
      assertDirectory: (dir, name, projectDir) => {
        assert.ok(dir.startsWith(projectDir));
        assert.match(name, /Dir$/);
      },
      collectTestFiles: () => {
        return [];
      },
      removeCompiledTestsWithoutSource: (testFiles) => {
        assert.deepStrictEqual(testFiles, []);

        return [];
      },
      runTestFiles: (testFiles) => {
        ranFiles = testFiles;
      },
      resolvePath: (file) => file,
      setExitCode: (code) => {
        exitCode = code;
      },
      toProjectPath: (file, projectDir) => file.slice(projectDir.length + 1),
      warn: (message) => {
        warnings.push(message);
      }
    };

    runSuiteUseCase(
      {
        distDir: '/project/dist',
        sourceDir: '/project/src',
        projectDir: '/project',
        runnerFile: '/project/dist/bin.js',
        clear: false,
        isolation: 'process'
      },
      dependencies
    );

    assert.deepStrictEqual(warnings, ['No test files found in dist']);
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(ranFiles, undefined);
  });

  test('passes cleanup options to stale file check', () => {
    let cleanupOptions: CompiledTestCleanupOptions | undefined;

    const dependencies: RunSuiteUseCaseDependencies = {
      assertDirectory: (dir, name, projectDir) => {
        assert.ok(dir.startsWith(projectDir));
        assert.match(name, /Dir$/);
      },
      collectTestFiles: (dir, extensions) => {
        assert.strictEqual(dir, '/project/dist');
        assert.deepStrictEqual(extensions, ['.test.js', '.spec.js']);

        return [
          '/project/dist/a.test.js'
        ];
      },
      removeCompiledTestsWithoutSource: (testFiles, options) => {
        assert.deepStrictEqual(testFiles, [
          '/project/dist/a.test.js'
        ]);

        cleanupOptions = options;

        return [
          '/project/dist/a.test.js'
        ];
      },
      runTestFiles: (testFiles) => {
        assert.deepStrictEqual(testFiles, [
          '/project/dist/a.test.js'
        ]);
      },
      resolvePath: (file) => file,
      setExitCode: (code) => {
        assert.fail(`Unexpected exit code: ${String(code)}`);
      },
      toProjectPath: (file, projectDir) => file.slice(projectDir.length + 1),
      warn: (message) => {
        assert.fail(message);
      }
    };

    runSuiteUseCase(
      {
        distDir: '/project/dist',
        sourceDir: '/project/src',
        projectDir: '/project',
        runnerFile: '/project/dist/bin.js',
        clear: true,
        isolation: 'process'
      },
      dependencies
    );

    assert.deepStrictEqual(cleanupOptions, {
      distDir: '/project/dist',
      sourceDir: '/project/src',
      projectDir: '/project',
      clear: true
    });
  });

  test('excludes runner file before stale file check', () => {
    let checkedFiles: string[] | undefined;

    const dependencies: RunSuiteUseCaseDependencies = {
      assertDirectory: (dir, name, projectDir) => {
        assert.ok(dir.startsWith(projectDir));
        assert.match(name, /Dir$/);
      },
      collectTestFiles: () => {
        return [
          '/project/dist/a.test.js',
          '/project/dist/bin.js',
          '/project/dist/b.spec.js'
        ];
      },
      removeCompiledTestsWithoutSource: (testFiles) => {
        checkedFiles = testFiles;

        return [
          '/project/dist/a.test.js',
          '/project/dist/b.spec.js'
        ];
      },
      runTestFiles: (testFiles) => {
        assert.deepStrictEqual(testFiles, [
          '/project/dist/a.test.js',
          '/project/dist/b.spec.js'
        ]);
      },
      resolvePath: (file) => file,
      setExitCode: (code) => {
        assert.fail(`Unexpected exit code: ${String(code)}`);
      },
      toProjectPath: (file, projectDir) => file.slice(projectDir.length + 1),
      warn: (message) => {
        assert.fail(message);
      }
    };

    runSuiteUseCase(
      {
        distDir: '/project/dist',
        sourceDir: '/project/src',
        projectDir: '/project',
        runnerFile: '/project/dist/bin.js',
        clear: false,
        isolation: 'process'
      },
      dependencies
    );

    assert.deepStrictEqual(checkedFiles, [
      '/project/dist/a.test.js',
      '/project/dist/b.spec.js'
    ]);
  });

  test('runs cleaned test files', () => {
    let ranFiles: string[] | undefined;

    const dependencies: RunSuiteUseCaseDependencies = {
      assertDirectory: (dir, name, projectDir) => {
        assert.ok(dir.startsWith(projectDir));
        assert.match(name, /Dir$/);
      },
      collectTestFiles: () => {
        return [
          '/project/dist/a.test.js',
          '/project/dist/b.spec.js'
        ];
      },
      removeCompiledTestsWithoutSource: () => {
        return [
          '/project/dist/b.spec.js'
        ];
      },
      runTestFiles: (testFiles) => {
        ranFiles = testFiles;
      },
      resolvePath: (file) => file,
      setExitCode: (code) => {
        assert.fail(`Unexpected exit code: ${String(code)}`);
      },
      toProjectPath: (file, projectDir) => file.slice(projectDir.length + 1),
      warn: (message) => {
        assert.fail(message);
      }
    };

    runSuiteUseCase(
      {
        distDir: '/project/dist',
        sourceDir: '/project/src',
        projectDir: '/project',
        runnerFile: '/project/dist/bin.js',
        clear: false,
        isolation: 'process'
      },
      dependencies
    );

    assert.deepStrictEqual(ranFiles, [
      '/project/dist/b.spec.js'
    ]);
  });

  test('passes isolation to test runner', () => {
    let runnerIsolation: string | undefined;

    const dependencies: RunSuiteUseCaseDependencies = {
      assertDirectory: (dir, name, projectDir) => {
        assert.ok(dir.startsWith(projectDir));
        assert.match(name, /Dir$/);
      },
      collectTestFiles: () => {
        return [
          '/project/dist/a.test.js'
        ];
      },
      removeCompiledTestsWithoutSource: (testFiles) => {
        return testFiles;
      },
      runTestFiles: (_testFiles, isolation) => {
        runnerIsolation = isolation;
      },
      resolvePath: (file) => file,
      setExitCode: (code) => {
        assert.fail(`Unexpected exit code: ${String(code)}`);
      },
      toProjectPath: (file, projectDir) => file.slice(projectDir.length + 1),
      warn: (message) => {
        assert.fail(message);
      }
    };

    runSuiteUseCase(
      {
        distDir: '/project/dist',
        sourceDir: '/project/src',
        projectDir: '/project',
        runnerFile: '/project/dist/bin.js',
        clear: false,
        isolation: 'none'
      },
      dependencies
    );

    assert.strictEqual(runnerIsolation, 'none');
  });
});
