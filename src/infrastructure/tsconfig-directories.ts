import fs from 'node:fs';
import path from 'node:path';

import { defaultRunnerConfig } from '../config';
import { toProjectPath } from './project-path';
import { parseRunnerTsConfig } from './tsconfig-parser';

/**
 * Resolves TypeScript project config into source and output directories.
 *
 * The dedicated config parser keeps the consumer's TypeScript package and
 * compiler version outside the runner dependency graph.
 */

/**
 * Source and output directories resolved from TypeScript config.
 */
export type TsConfigDirectories = {
  sourceDir: string;
  distDir: string;
};

/**
 * Returns whether a path exists with the expected filesystem shape.
 */
function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function isDirectory(directory: string): boolean {
  try {
    return fs.statSync(directory).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Uses the project-root config by default and the same file-or-directory shape
 * as `tsc --project` for an explicit path.
 */
function resolveTsConfigFile(projectDir: string, projectPath: string | undefined): string {
  const configFile = projectPath === undefined
    ? path.join(projectDir, defaultRunnerConfig.tsConfigFileName)
    : path.resolve(projectDir, projectPath);
  const resolvedConfigFile = isDirectory(configFile)
    ? path.join(configFile, defaultRunnerConfig.tsConfigFileName)
    : configFile;

  if (!isFile(resolvedConfigFile)) {
    throw new Error(
      `Cannot find ${toProjectPath(resolvedConfigFile, projectDir)} from ${projectDir}`
    );
  }

  return resolvedConfigFile;
}

/**
 * Reads source and output directories through a dedicated config parser.
 *
 * Only path resolution belongs to the runner. The consumer's build remains
 * responsible for validating all other compiler options and source files.
 */
export function readTsConfigDirectories(
  projectDir: string,
  projectPath?: string
): TsConfigDirectories {
  const configFile = resolveTsConfigFile(projectDir, projectPath);
  const configDir = path.dirname(configFile);
  const parsedConfig = parseRunnerTsConfig(configFile, projectDir);
  const sourceDir = parsedConfig.compilerOptions?.rootDir;
  const distDir = parsedConfig.compilerOptions?.outDir;

  if (distDir === undefined) {
    throw new Error(
      `compilerOptions.outDir is required in ${toProjectPath(configFile, projectDir)}`
    );
  }

  return {
    sourceDir: sourceDir === undefined
      ? configDir
      : path.resolve(configDir, sourceDir),
    distDir: path.resolve(configDir, distDir)
  };
}
