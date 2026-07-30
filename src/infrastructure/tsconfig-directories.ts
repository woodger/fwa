import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as ts from '@typescript/typescript6';

import { defaultRunnerConfig } from '../config';
import { toProjectPath } from './project-path';

/**
 * Resolves TypeScript project config into source and output directories.
 *
 * The private compatibility parser keeps the consumer's TypeScript package and
 * compiler version outside the runner dependency graph.
 */

/**
 * Source and output directories resolved from TypeScript config.
 */
export type TsConfigDirectories = {
  sourceDir: string;
  distDir: string;
};

const noInputFilesDiagnosticCode = 18003;
// TypeScript exposes numeric Diagnostic codes but no public named constants.
// These TS6 codes cover failures while reading or resolving an extends chain.
const extendedConfigResolutionDiagnosticCodes = new Set([
  5012,
  5083,
  6053,
  18000
]);
// Extended configs are parsed as JSON source files, whose syntax errors use
// the 1xxx diagnostic range. Compiler-option diagnostics use other ranges.
const jsonSyntaxDiagnosticCodeStart = 1000;
const jsonSyntaxDiagnosticCodeEnd = 2000;
const runnerConfigOptionPattern = /^Compiler option '(?:extends|outDir|rootDir)'/;

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

function formatTsDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n'
  });
}

function isRunnerConfigError(diagnostic: ts.Diagnostic): boolean {
  if (diagnostic.code === noInputFilesDiagnosticCode) {
    return false;
  }

  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  const isExtendedConfigSyntaxError = (
    diagnostic.file !== undefined
    && diagnostic.code >= jsonSyntaxDiagnosticCodeStart
    && diagnostic.code < jsonSyntaxDiagnosticCodeEnd
  );

  return (
    extendedConfigResolutionDiagnosticCodes.has(diagnostic.code)
    || isExtendedConfigSyntaxError
    || runnerConfigOptionPattern.test(message)
  );
}

/**
 * Uses the project-root config by default and the same file-or-directory shape
 * as `tsc --project` for an explicit path.
 */
function resolveTsConfigFile(projectDir: string, projectPath: string | undefined): string {
  if (projectPath === undefined) {
    const configFile = path.join(projectDir, defaultRunnerConfig.tsConfigFileName);

    if (!isFile(configFile)) {
      throw new Error(`Cannot find ${defaultRunnerConfig.tsConfigFileName} from ${projectDir}`);
    }

    return configFile;
  }

  const resolvedProjectPath = path.resolve(projectDir, projectPath);

  if (isDirectory(resolvedProjectPath)) {
    return path.join(resolvedProjectPath, defaultRunnerConfig.tsConfigFileName);
  }

  return resolvedProjectPath;
}

/**
 * Reads source and output directories through the TypeScript config parser.
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
  const configResult = ts.readConfigFile(configFile, ts.sys.readFile);

  if (configResult.error !== undefined) {
    throw new Error(formatTsDiagnostics([configResult.error]));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configResult.config,
    {
      ...ts.sys,
      // File discovery belongs to the consumer build. Returning no files keeps
      // runner startup independent from the size of the TypeScript project.
      readDirectory: () => []
    },
    configDir,
    {},
    configFile
  );
  const runnerConfigErrors = parsedConfig.errors.filter(isRunnerConfigError);

  if (runnerConfigErrors.length > 0) {
    throw new Error(formatTsDiagnostics(runnerConfigErrors));
  }

  const sourceDir = parsedConfig.options.rootDir ?? configDir;
  const distDir = parsedConfig.options.outDir;

  if (distDir === undefined) {
    throw new Error(
      `compilerOptions.outDir is required in ${toProjectPath(configFile, projectDir)}`
    );
  }

  return {
    sourceDir,
    distDir
  };
}
