import assert from 'node:assert';
import path from 'node:path';
import { describe, test } from 'node:test';

import { toProjectPath } from './project-path';

describe('toProjectPath', () => {
  test('returns portable project-relative path', () => {
    const projectDir = path.join('/project');
    const file = path.join(projectDir, 'dist', 'feature', 'sample.test.js');

    assert.strictEqual(
      toProjectPath(file, projectDir),
      'dist/feature/sample.test.js'
    );
  });
});
