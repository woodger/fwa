import fs from 'node:fs';
import path from 'node:path';

import type {
  CompiledTestCleanupOptions
} from '../application/run-suite';
import { defaultRunnerConfig } from '../config';
import type { TestExtension } from '../config.types';
import { toProjectPath } from './project-path';

/**
 * Description of a compiled test that is older than its source TS file.
 *
 * Both paths are stored in project-relative format so the error message
 * is identical in local environments, containers, and CI.
 */
type OutdatedCompiledTest = {
  /**
   * Path to the outdated compiled JS test relative to the project root.
   */
  compiled: string;

  /**
   * Path to the source TS test relative to the project root.
   */
  source: string;
};

/**
 * Recursively collects test files with the specified extension or extensions.
 *
 * Traversal order is stabilized by sorting so test execution does not depend
 * on the order in which the filesystem returns directory contents.
 */
export function collectTestFiles(
  dir: string,
  extensions: TestExtension | readonly TestExtension[]
): string[] {
  const acceptedExtensions: readonly TestExtension[] = Array.isArray(extensions)
    ? extensions
    : [extensions];

  return collectTestFilesByExtension(dir, acceptedExtensions);
}

/**
 * Internal recursive collector.
 *
 * The public wrapper normalizes one extension into an array once, so recursive
 * calls can reuse the same immutable list instead of repeating that branching
 * for every visited directory.
 */
function collectTestFilesByExtension(
  dir: string,
  extensions: readonly TestExtension[]
): string[] {
  const files: string[] = [];

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFilesByExtension(fullPath, extensions));
      continue;
    }

    if (
      entry.isFile()
      && extensions.some((extension) => entry.name.endsWith(extension))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Restores the expected source test file path from a compiled JS file.
 *
 * The runner executes tests from dist, but the source of truth is in src.
 * This allows detection of deleted or changed TS tests after which
 * old JS files remain in dist.
 */
function toSourceTestPath(
  compiledFile: string,
  distDir: string,
  sourceDir: string
): string {
  const relativeCompiledPath = path.relative(distDir, compiledFile);
  const extensionPair = defaultRunnerConfig.testFileExtensions.find(({ compiled }) => (
    relativeCompiledPath.endsWith(compiled)
  ));
  const relativeSourcePath = extensionPair === undefined
    ? relativeCompiledPath.replace(/\.js$/, '.ts')
    : `${relativeCompiledPath.slice(0, -extensionPair.compiled.length)}${extensionPair.source}`;

  return path.join(sourceDir, relativeSourcePath);
}

/**
 * Reads stat only for a regular file.
 *
 * A missing file is considered a normal result because cleanup
 * specifically checks the case where a source test has already been deleted
 * while the compiled test still remains in dist.
 */
function readOptionalFileStat(file: string): fs.Stats | undefined {
  try {
    const stat = fs.statSync(file);

    if (!stat.isFile()) {
      return undefined;
    }

    return stat;
  }
  catch (error) {
    if (isFileNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error
    && 'code' in error
    && error.code === 'ENOENT'
  );
}

/**
 * Verifies a resolved project directory before the runner starts filesystem work.
 *
 * Error messages use project-relative paths so diagnostics stay stable across
 * local machines, containers, and CI.
 */
export function assertDirectory(dir: string, name: string, projectDir: string): void {
  let stat: fs.Stats;

  try {
    stat = fs.statSync(dir);
  }
  catch (error) {
    if (isFileNotFoundError(error)) {
      throw new Error(
        `${name} does not exist: ${toProjectPath(dir, projectDir) || '.'}`,
        { cause: error }
      );
    }

    throw error;
  }

  if (!stat.isDirectory()) {
    throw new Error(`${name} is not a directory: ${toProjectPath(dir, projectDir) || '.'}`);
  }
}

/**
 * Removes compiled tests for which source TS files no longer exist.
 *
 * Additionally checks that an existing compiled test is not older than its source test.
 * This protects against a false-positive run of old compiled JS tests after
 * the corresponding source TS tests were changed or deleted.
 */
export function removeCompiledTestsWithoutSource(
  testFiles: string[],
  options: CompiledTestCleanupOptions
): string[] {
  const runnableFiles: string[] = [];
  const removedFiles: string[] = [];
  const outdatedFiles: OutdatedCompiledTest[] = [];
  const log = options.log ?? ((message: string) => console.warn(message));

  for (const file of testFiles) {
    const compiledStat = fs.statSync(file);
    const sourceFile = toSourceTestPath(
      file,
      options.distDir,
      options.sourceDir
    );

    const sourceStat = readOptionalFileStat(sourceFile);

    if (sourceStat === undefined) {
      fs.unlinkSync(file);
      removedFiles.push(toProjectPath(file, options.projectDir));
      continue;
    }

    runnableFiles.push(file);

    if (sourceStat.mtimeMs > compiledStat.mtimeMs) {
      outdatedFiles.push({
        compiled: toProjectPath(file, options.projectDir),
        source: toProjectPath(sourceFile, options.projectDir)
      });
    }
  }

  if (removedFiles.length) {
    log(
      [
        'Removed stale compiled tests without source:',
        ...removedFiles
          .sort((left, right) => left.localeCompare(right))
          .map((file) => `- ${file}`)
      ].join('\n')
    );
  }

  if (outdatedFiles.length) {
    throw new Error(
      [
        'Compiled tests are older than source tests.',
        '',
        'Rebuild before npm test:',
        ...outdatedFiles
          .sort((left, right) => left.compiled.localeCompare(right.compiled))
          .map(({ compiled, source }) => `- ${compiled} (source: ${source})`)
      ].join('\n')
    );
  }

  return runnableFiles;
}
