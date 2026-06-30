import process from 'node:process';

import type { TestIsolation } from '../config.types';

/**
 * Parsed Node.js semantic version.
 */
type NodeVersion = {
  major: number;
  minor: number;
  patch: number;
};

/**
 * Explicit node:test options selected by a CLI user or API caller.
 */
export type ExplicitNodeTestOptions = {
  isolation?: TestIsolation;
  nodeArgs?: readonly string[];
};

const nodeTestIsolationVersion: NodeVersion = {
  major: 22,
  minor: 8,
  patch: 0
};

const nodeTestExecArgvVersion: NodeVersion = {
  major: 22,
  minor: 10,
  patch: 0
};

function parseNodeVersion(version: string): NodeVersion {
  const [, major, minor, patch] = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version) ?? [];

  if (
    major === undefined
    || minor === undefined
    || patch === undefined
  ) {
    throw new Error(`Cannot parse Node.js version "${version}".`);
  }

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch)
  };
}

function isNodeVersionAtLeast(version: string, minimum: NodeVersion): boolean {
  const current = parseNodeVersion(version);

  if (current.major !== minimum.major) {
    return current.major > minimum.major;
  }

  if (current.minor !== minimum.minor) {
    return current.minor > minimum.minor;
  }

  return current.patch >= minimum.patch;
}

function formatNodeVersion(version: NodeVersion): string {
  return [
    version.major,
    version.minor,
    version.patch
  ].join('.');
}

export function supportsNodeTestIsolation(nodeVersion: string = process.versions.node): boolean {
  return isNodeVersionAtLeast(nodeVersion, nodeTestIsolationVersion);
}

export function supportsNodeTestExecArgv(nodeVersion: string = process.versions.node): boolean {
  return isNodeVersionAtLeast(nodeVersion, nodeTestExecArgvVersion);
}

export function assertNodeTestIsolationSupported(
  nodeVersion: string = process.versions.node
): void {
  if (supportsNodeTestIsolation(nodeVersion)) {
    return;
  }

  throw new Error(
    `Test isolation requires Node.js >= ${formatNodeVersion(nodeTestIsolationVersion)} `
    + `because node:test run() does not support isolation before that version. `
    + `Current Node.js: ${nodeVersion}.`
  );
}

export function assertNodeTestExecArgvSupported(
  nodeVersion: string = process.versions.node
): void {
  if (supportsNodeTestExecArgv(nodeVersion)) {
    return;
  }

  throw new Error(
    `Node args require Node.js >= ${formatNodeVersion(nodeTestExecArgvVersion)} `
    + `because node:test run() does not support execArgv before that version. `
    + `Current Node.js: ${nodeVersion}.`
  );
}

export function assertExplicitNodeTestOptionsSupported(
  options: ExplicitNodeTestOptions,
  nodeVersion: string = process.versions.node
): void {
  if (options.isolation !== undefined) {
    assertNodeTestIsolationSupported(nodeVersion);
  }

  if (options.nodeArgs !== undefined && options.nodeArgs.length > 0) {
    assertNodeTestExecArgvSupported(nodeVersion);
  }
}
