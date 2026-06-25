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
  nodeTest: {
    concurrency: true,
    isolation: 'process'
  }
} as const satisfies RunnerConfig;
