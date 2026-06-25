#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

import { runSuite } from './suite';

const projectDir = process.cwd();

runSuite({
  projectDir,
  distDir: path.join(projectDir, 'dist'),
  sourceDir: path.join(projectDir, 'src'),
  runnerFile: __filename
});
