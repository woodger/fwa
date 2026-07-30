import { createRequire } from 'node:module';

import type {
  AsyncSuiteRunnerOptions,
  SuiteExecutionOptions,
  SuitePlan,
  SuiteRunResult,
  SuiteRunnerOptions
} from './application/run-suite';

export type {
  AsyncSuiteRunnerOptions,
  SuiteEvent,
  SuiteEventType,
  SuiteExecutionOptions,
  SuitePlan,
  SuiteRunResult,
  SuiteRunnerOptions,
  SuiteTestCounts
} from './application/run-suite';

const loadModule = createRequire(__filename);

type SuiteModule = typeof import('./bootstrap/suite');

function loadSuiteModule(): SuiteModule {
  return loadModule('./bootstrap/suite') as SuiteModule;
}

export function runSuite(options: SuiteRunnerOptions): void {
  loadSuiteModule().runSuite(options);
}

export function prepareSuite(options: SuiteRunnerOptions): SuitePlan {
  return loadSuiteModule().prepareSuite(options);
}

export function runPreparedSuite(
  plan: SuitePlan,
  options?: SuiteExecutionOptions
): Promise<SuiteRunResult> {
  return loadSuiteModule().runPreparedSuite(plan, options);
}

export function runSuiteAsync(
  options: AsyncSuiteRunnerOptions
): Promise<SuiteRunResult> {
  return loadSuiteModule().runSuiteAsync(options);
}
