import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';

import { resolveSuiteOptions } from './run-suite';

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
});
