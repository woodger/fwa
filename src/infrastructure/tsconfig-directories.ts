import fs from 'node:fs';
import path from 'node:path';
import {
  API,
  DiagnosticCategory,
  type Diagnostic
} from 'typescript/unstable/sync';

import { defaultRunnerConfig } from '../config';
import { toProjectPath } from './project-path';

/**
 * Resolves TypeScript project config into source and output directories.
 *
 * TypeScript 7.0 exposes config parsing through a version-bounded unstable API.
 * Its native process lifecycle remains local to this infrastructure boundary.
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
 * Formats TypeScript 7 config diagnostics for deterministic CLI errors.
 */
function formatDiagnosticCategory(category: DiagnosticCategory): string {
  switch (category) {
    case DiagnosticCategory.Warning:
      return 'warning';
    case DiagnosticCategory.Error:
      return 'error';
    case DiagnosticCategory.Suggestion:
      return 'suggestion';
    case DiagnosticCategory.Message:
      return 'message';
    default:
      return 'error';
  }
}

function formatDiagnosticMessage(diagnostic: Diagnostic): string {
  const nestedMessages = diagnostic.messageChain?.map(formatDiagnosticMessage) ?? [];

  return [diagnostic.text, ...nestedMessages].join('\n');
}

function formatDiagnosticLocation(diagnostic: Diagnostic): string {
  if (diagnostic.fileName === undefined || diagnostic.pos < 0) {
    return '';
  }

  try {
    const text = fs.readFileSync(diagnostic.fileName, 'utf8');
    const beforeDiagnostic = text.slice(0, diagnostic.pos);
    const line = beforeDiagnostic.split('\n').length;
    const lastNewLine = beforeDiagnostic.lastIndexOf('\n');
    const character = diagnostic.pos - lastNewLine;

    return `${diagnostic.fileName}(${line},${character}): `;
  } catch {
    return `${diagnostic.fileName}: `;
  }
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  const formatted = [
    `${formatDiagnosticLocation(diagnostic)}${formatDiagnosticCategory(diagnostic.category)} TS${diagnostic.code}: ${formatDiagnosticMessage(diagnostic)}`
  ];

  for (const relatedDiagnostic of diagnostic.relatedInformation ?? []) {
    formatted.push(formatDiagnostic(relatedDiagnostic));
  }

  return formatted.join('\n');
}

function formatTsDiagnostics(diagnostics: readonly Diagnostic[]): string {
  return diagnostics.map(formatDiagnostic).join('\n');
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

function readPathOption(
  options: Readonly<Record<string, unknown>>,
  optionName: 'rootDir' | 'outDir'
): string | undefined {
  const value = options[optionName];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`compilerOptions.${optionName} must resolve to a string`);
  }

  return value;
}

/**
 * Reads source and output directories through the TypeScript config parser.
 *
 * Using the compiler API keeps `rootDir`, `outDir`, `extends`, and path
 * normalization behavior aligned with TypeScript instead of duplicating
 * tsconfig rules manually.
 */
export function readTsConfigDirectories(
  projectDir: string,
  projectPath?: string
): TsConfigDirectories {
  const configFile = resolveTsConfigFile(projectDir, projectPath);
  const configDir = path.dirname(configFile);
  const api = new API({ cwd: projectDir });

  try {
    const parsedConfig = api.parseConfigFile(configFile);
    const snapshot = api.updateSnapshot({
      openProjects: [configFile]
    });
    const project = snapshot.getProject(configFile);

    if (project === undefined) {
      throw new Error(`Cannot load ${toProjectPath(configFile, projectDir)}`);
    }

    const diagnostics = project.program.getConfigFileParsingDiagnostics();

    if (diagnostics.length > 0) {
      throw new Error(formatTsDiagnostics(diagnostics));
    }

    const sourceDir = readPathOption(parsedConfig.options, 'rootDir') ?? configDir;
    const distDir = readPathOption(parsedConfig.options, 'outDir');

    if (distDir === undefined) {
      throw new Error(
        `compilerOptions.outDir is required in ${toProjectPath(configFile, projectDir)}`
      );
    }

    return {
      sourceDir,
      distDir
    };
  } finally {
    api.close();
  }
}
