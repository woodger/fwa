import assert from 'node:assert';
import { describe, test } from 'node:test';

import {
  assertExplicitNodeTestOptionsSupported,
  supportsNodeTestExecArgv,
  supportsNodeTestIsolation
} from './node-runtime';

describe('node test runtime support', () => {
  test('detects isolation support from Node.js version', () => {
    assert.strictEqual(supportsNodeTestIsolation('22.7.0'), false);
    assert.strictEqual(supportsNodeTestIsolation('22.8.0'), true);
    assert.strictEqual(supportsNodeTestIsolation('23.0.0'), true);
  });

  test('detects execArgv support from Node.js version', () => {
    assert.strictEqual(supportsNodeTestExecArgv('22.9.0'), false);
    assert.strictEqual(supportsNodeTestExecArgv('22.10.0'), true);
    assert.strictEqual(supportsNodeTestExecArgv('23.0.0'), true);
  });

  test('accepts default options on older Node.js versions', () => {
    assert.doesNotThrow(() => {
      assertExplicitNodeTestOptionsSupported({}, '20.19.0');
    });
  });

  test('rejects explicit isolation on unsupported Node.js versions', () => {
    assert.throws(
      () => {
        assertExplicitNodeTestOptionsSupported({
          isolation: 'process'
        }, '22.7.0');
      },
      /Test isolation requires Node\.js >= 22\.8\.0/
    );
  });

  test('rejects node args on unsupported Node.js versions', () => {
    assert.throws(
      () => {
        assertExplicitNodeTestOptionsSupported({
          nodeArgs: [
            '--no-warnings'
          ]
        }, '22.9.0');
      },
      /Node args require Node\.js >= 22\.10\.0/
    );
  });
});
