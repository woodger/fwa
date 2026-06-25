#!/usr/bin/env node

import process from 'node:process';

import { runSuite } from './suite';

runSuite({
  projectDir: process.cwd(),
  runnerFile: __filename
});
