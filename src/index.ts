import { createRequire } from 'node:module';

import type { SuiteRunnerOptions } from './application/run-suite';

export type { SuiteRunnerOptions };

const loadModule = createRequire(__filename);

export function runSuite(options: SuiteRunnerOptions): void {
  const suiteModule = loadModule('./bootstrap/suite') as typeof import('./bootstrap/suite');

  suiteModule.runSuite(options);
}
