#!/usr/bin/env node

/**
 * The CLI entrypoint module adapts the Node.js process environment to the runner bootstrap.
 *
 * Allowed here:
 * - reading process arguments and current working directory;
 * - reading package metadata for version output;
 * - wiring stdout, stderr, and exit code side effects.
 *
 * This file must not contain CLI option parsing, test discovery, or suite execution rules.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { runCli } from './bootstrap/cli';
import { runSuite } from './bootstrap/suite';

function readPackageVersion(packageFile: string): string {
  const packageJson: unknown = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  const version = (packageJson as { version?: unknown }).version;

  if (typeof version !== 'string') {
    throw new Error(`Cannot read package version from ${packageFile}`);
  }

  return version;
}

runCli({
  args: process.argv.slice(2),
  defaultProjectDir: process.cwd(),
  runnerFile: __filename
}, {
  readVersion: () => readPackageVersion(path.resolve(__dirname, '..', 'package.json')),
  runSuite,
  setExitCode: (code) => {
    process.exitCode = code;
  },
  writeStderr: (message) => {
    process.stderr.write(message);
  },
  writeStdout: (message) => {
    process.stdout.write(message);
  }
});
