import path from 'node:path';
import process from 'node:process';
import * as ts from 'typescript';

import { toProjectPath } from '../internal/project-path';

export type TsConfigDirectories = {
  sourceDir: string;
  distDir: string;
};

function formatTsDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n'
  });
}

/**
 * Reads source and output directories through the TypeScript config parser.
 *
 * Using the compiler API keeps `rootDir`, `outDir`, `extends`, and path
 * normalization behavior aligned with TypeScript instead of duplicating
 * tsconfig rules manually.
 */
export function readTsConfigDirectories(projectDir: string): TsConfigDirectories {
  const configFile = ts.findConfigFile(
    projectDir,
    (file) => ts.sys.fileExists(file),
    'tsconfig.json'
  );

  if (configFile === undefined) {
    throw new Error(`Cannot find tsconfig.json from ${projectDir}`);
  }

  const configResult = ts.readConfigFile(
    configFile,
    (file) => ts.sys.readFile(file)
  );

  if (configResult.error !== undefined) {
    throw new Error(formatTsDiagnostics([configResult.error]));
  }

  const configDir = path.dirname(configFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configResult.config,
    ts.sys,
    configDir,
    {},
    configFile
  );

  if (parsedConfig.errors.length) {
    throw new Error(formatTsDiagnostics(parsedConfig.errors));
  }

  if (parsedConfig.options.outDir === undefined) {
    throw new Error(
      `compilerOptions.outDir is required in ${toProjectPath(configFile, projectDir)}`
    );
  }

  return {
    sourceDir: parsedConfig.options.rootDir ?? configDir,
    distDir: parsedConfig.options.outDir
  };
}
