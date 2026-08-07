import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { describe, test } from 'node:test';

describe('fwa CLI entrypoint', () => {
  test('prints the package version from the executable process', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')
    ) as { version?: unknown };

    assert.strictEqual(typeof packageJson.version, 'string');

    const result = spawnSync(
      process.execPath,
      [
        path.join(__dirname, 'bin.js'),
        '--version'
      ],
      {
        encoding: 'utf8'
      }
    );

    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(result.stdout, `${packageJson.version}\n`);
    assert.strictEqual(result.stderr, '');
  });

  test('runs a passing project without loading consumer TypeScript', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwa-bin-'));
    const sourceDir = path.join(projectDir, 'src');
    const distDir = path.join(projectDir, 'dist');
    const sourceFile = path.join(sourceDir, 'fixture.test.ts');
    const compiledFile = path.join(distDir, 'fixture.test.js');
    const resolutionGuard = path.join(projectDir, 'reject-consumer-typescript.cjs');

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
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
    fs.writeFileSync(
      sourceFile,
      [
        "import { test } from 'node:test';",
        '',
        "test('entrypoint fixture passes', () => {});",
        ''
      ].join('\n')
    );
    fs.writeFileSync(
      compiledFile,
      [
        "const { test } = require('node:test');",
        '',
        "test('entrypoint fixture passes', () => {});",
        ''
      ].join('\n')
    );
    fs.writeFileSync(
      resolutionGuard,
      [
        "const Module = require('node:module');",
        'const loadModule = Module._load;',
        '',
        'Module._load = function guardedLoad(request, parent, isMain) {',
        "  if (request === 'typescript' || request.startsWith('typescript/')) {",
        "    throw new Error('fwa loaded consumer TypeScript');",
        '  }',
        '',
        '  return loadModule.call(this, request, parent, isMain);',
        '};',
        ''
      ].join('\n')
    );
    fs.utimesSync(
      sourceFile,
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2020-01-01T00:00:00.000Z')
    );
    fs.utimesSync(
      compiledFile,
      new Date('2020-01-02T00:00:00.000Z'),
      new Date('2020-01-02T00:00:00.000Z')
    );

    const childEnvironment = { ...process.env };
    const existingNodeOptions = childEnvironment['NODE_OPTIONS'];

    delete childEnvironment['NODE_TEST_CONTEXT'];
    childEnvironment['NODE_OPTIONS'] = existingNodeOptions === undefined
      ? `--require=${resolutionGuard}`
      : `${existingNodeOptions} --require=${resolutionGuard}`;

    const result = spawnSync(
      process.execPath,
      [
        path.join(__dirname, 'bin.js'),
        projectDir
      ],
      {
        encoding: 'utf8',
        env: childEnvironment
      }
    );

    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /entrypoint fixture passes/);
    assert.strictEqual(result.stderr, '');
  });

  test('returns failure for a failing compiled test in a child process', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwa-bin-'));
    const sourceDir = path.join(projectDir, 'src');
    const distDir = path.join(projectDir, 'dist');
    const sourceFile = path.join(sourceDir, 'fixture.test.ts');
    const compiledFile = path.join(distDir, 'fixture.test.js');

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
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
    fs.writeFileSync(
      sourceFile,
      [
        "import { test } from 'node:test';",
        '',
        "test('entrypoint fixture fails', () => {",
        "  throw new Error('expected fixture failure');",
        '});',
        ''
      ].join('\n')
    );
    fs.writeFileSync(
      compiledFile,
      [
        "const { test } = require('node:test');",
        '',
        "test('entrypoint fixture fails', () => {",
        "  throw new Error('expected fixture failure');",
        '});',
        ''
      ].join('\n')
    );
    fs.utimesSync(
      sourceFile,
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2020-01-01T00:00:00.000Z')
    );
    fs.utimesSync(
      compiledFile,
      new Date('2020-01-02T00:00:00.000Z'),
      new Date('2020-01-02T00:00:00.000Z')
    );

    const childEnvironment = { ...process.env };

    delete childEnvironment['NODE_TEST_CONTEXT'];

    const result = spawnSync(
      process.execPath,
      [
        path.join(__dirname, 'bin.js'),
        projectDir
      ],
      {
        encoding: 'utf8',
        env: childEnvironment
      }
    );

    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /entrypoint fixture fails/);
    assert.match(result.stdout, /expected fixture failure/);
    assert.strictEqual(result.stderr, '');
  });

  test('preserves native success for a failing TODO test', (t) => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwa-bin-'));
    const sourceDir = path.join(projectDir, 'src');
    const distDir = path.join(projectDir, 'dist');
    const sourceFile = path.join(sourceDir, 'fixture.test.ts');
    const compiledFile = path.join(distDir, 'fixture.test.js');

    t.after(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          rootDir: 'src',
          outDir: 'dist'
        }
      })
    );
    fs.writeFileSync(
      sourceFile,
      [
        "import { test } from 'node:test';",
        '',
        "test('entrypoint fixture is TODO', { todo: true }, () => {",
        "  throw new Error('expected TODO failure');",
        '});',
        ''
      ].join('\n')
    );
    fs.writeFileSync(
      compiledFile,
      [
        "const { test } = require('node:test');",
        '',
        "test('entrypoint fixture is TODO', { todo: true }, () => {",
        "  throw new Error('expected TODO failure');",
        '});',
        ''
      ].join('\n')
    );
    fs.utimesSync(
      sourceFile,
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2020-01-01T00:00:00.000Z')
    );
    fs.utimesSync(
      compiledFile,
      new Date('2020-01-02T00:00:00.000Z'),
      new Date('2020-01-02T00:00:00.000Z')
    );

    const childEnvironment = { ...process.env };

    delete childEnvironment['NODE_TEST_CONTEXT'];

    const result = spawnSync(
      process.execPath,
      [
        path.join(__dirname, 'bin.js'),
        projectDir
      ],
      {
        encoding: 'utf8',
        env: childEnvironment
      }
    );

    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /entrypoint fixture is TODO/);
    assert.match(result.stdout, /todo 1/);
    assert.strictEqual(result.stderr, '');
  });
});
