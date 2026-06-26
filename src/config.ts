import type { RunnerConfig } from './config.types';

export const defaultRunnerConfig = {
  testFileExtensions: [
    {
      compiled: '.test.js',
      source: '.test.ts'
    },
    {
      compiled: '.spec.js',
      source: '.spec.ts'
    }
  ],
  tsConfigFileName: 'tsconfig.json',
  pruneStaleCompiledTests: false,
  nodeTest: {
    concurrency: true,
    defaultIsolation: 'process'
  }
} as const satisfies RunnerConfig;
