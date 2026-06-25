export type CompiledTestExtension = '.test.js' | '.spec.js';
export type SourceTestExtension = '.test.ts' | '.spec.ts';
export type TestExtension = CompiledTestExtension | SourceTestExtension;

export type TestFileExtensionPair = {
  compiled: CompiledTestExtension;
  source: SourceTestExtension;
};

export type NodeTestConfig = {
  concurrency: boolean;
  isolation: 'process';
};

export type RunnerConfig = {
  testFileExtensions: readonly TestFileExtensionPair[];
  tsConfigFileName: string;
  nodeTest: NodeTestConfig;
};
