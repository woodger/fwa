/**
 * Compiled JavaScript test file extensions supported by the runner.
 */
export type CompiledTestExtension = '.test.js' | '.spec.js';

/**
 * Source TypeScript test file extensions supported by the runner.
 */
export type SourceTestExtension = '.test.ts' | '.spec.ts';

/**
 * Any test file extension known by the runner.
 */
export type TestExtension = CompiledTestExtension | SourceTestExtension;

/**
 * Native Node.js test runner isolation mode.
 */
export type TestIsolation = 'process' | 'none';

/**
 * Mapping between compiled JavaScript tests and their source TypeScript tests.
 */
export type TestFileExtensionPair = {
  compiled: CompiledTestExtension;
  source: SourceTestExtension;
};

/**
 * Default options passed to the native Node.js test runner.
 */
export type NodeTestConfig = {
  concurrency: boolean;
  defaultIsolation: TestIsolation;
};

/**
 * Central runner configuration.
 */
export type RunnerConfig = {
  testFileExtensions: readonly TestFileExtensionPair[];
  tsConfigFileName: string;
  pruneStaleCompiledTests: boolean;
  nodeTest: NodeTestConfig;
};
