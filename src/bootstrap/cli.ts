#!/usr/bin/env node

import process from 'node:process';

import { runSuite } from './run-suite.bootstrap';

runSuite({
  projectDir: process.cwd(),
  runnerFile: __filename
});
