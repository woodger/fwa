import { createRequire } from 'node:module';

import type {
  AsyncSuiteRunnerOptions,
  SuiteExecutionOptions,
  SuitePlan,
  SuitePreparationOptions,
  SuiteRunResult,
  SuiteRunnerOptions
} from './application/run-suite';

export type {
  AsyncSuiteRunnerOptions,
  SuiteEvent,
  SuiteEventType,
  SuiteExecutionOptions,
  SuiteOutput,
  SuitePlan,
  SuitePreparationOptions,
  SuiteRunResult,
  SuiteRunnerOptions,
  SuiteTestCounts
} from './application/run-suite';

const loadModule = createRequire(__filename);

type SuiteModule = typeof import('./bootstrap/suite');

/**
 * Keeps package import independent from suite infrastructure initialization.
 *
 * Config parsing and filesystem adapters are needed only when a consumer
 * invokes an operation, while importing the API should remain lightweight.
 */
function loadSuiteModule(): SuiteModule {
  return loadModule('./bootstrap/suite') as SuiteModule;
}

export function runSuite(options: SuiteRunnerOptions): void {
  loadSuiteModule().runSuite(options);
}

export function prepareSuite(options: SuitePreparationOptions): SuitePlan {
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
