import fs from 'node:fs';
import path from 'node:path';

import type {
  CompiledTestCheckOptions
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

function compareDeterministically(left: string, right: string): number {
  // Relational comparison has a fixed code-unit order, while localeCompare
  // can produce different test order on machines with different locales.
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

/**
 * Collects test files with the specified extension or extensions.
 *
 * Directories are traversed depth-first in deterministic name order so test
 * execution does not depend on filesystem enumeration order.
 */
export function collectTestFiles(
  dir: string,
  extensions: TestExtension | readonly TestExtension[]
): string[] {
  const acceptedExtensions: readonly TestExtension[] = Array.isArray(extensions)
    ? extensions
    : [extensions];
  const files: string[] = [];

  collectTestFilesByExtension(dir, acceptedExtensions, files);

  return files;
}

/**
 * Parent frames retain the next sorted entry so iterative traversal preserves
 * depth-first order when files and directories are interleaved.
 *
 * A caller-owned accumulator also avoids per-directory result arrays and the
 * argument limit imposed by spreading a large child result into its parent.
 */
function collectTestFilesByExtension(
  dir: string,
  extensions: readonly TestExtension[],
  files: string[]
): void {
  const directoryStack: Array<{
    directory: string;
    entries: fs.Dirent[];
    nextEntryIndex: number;
  }> = [
    {
      directory: dir,
      entries: fs
        .readdirSync(dir, { withFileTypes: true })
        .sort((left, right) => compareDeterministically(left.name, right.name)),
      nextEntryIndex: 0
    }
  ];

  while (directoryStack.length > 0) {
    const currentDirectory = directoryStack[directoryStack.length - 1];

    if (currentDirectory === undefined) {
      break;
    }

    const entry = currentDirectory.entries[currentDirectory.nextEntryIndex];

    if (entry === undefined) {
      directoryStack.pop();
      continue;
    }

    currentDirectory.nextEntryIndex += 1;

    const fullPath = path.join(currentDirectory.directory, entry.name);

    if (entry.isDirectory()) {
      directoryStack.push({
        directory: fullPath,
        entries: fs
          .readdirSync(fullPath, { withFileTypes: true })
          .sort((left, right) => compareDeterministically(left.name, right.name)),
        nextEntryIndex: 0
      });
      continue;
    }

    if (
      entry.isFile()
      && extensions.some((extension) => entry.name.endsWith(extension))
    ) {
      files.push(fullPath);
    }
  }
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
 * A missing file is considered a normal result because checking
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

function assertPruneDirectoryInsideProject(
  distDir: string,
  projectDir: string
): void {
  const realDistDir = fs.realpathSync(distDir);
  const realProjectDir = fs.realpathSync(projectDir);
  const relativeDistDir = path.relative(realProjectDir, realDistDir);
  const isInsideProject = (
    relativeDistDir !== ''
    && relativeDistDir !== '..'
    && !relativeDistDir.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativeDistDir)
  );

  if (!isInsideProject) {
    throw new Error(
      '--prune requires distDir to be a dedicated directory inside projectDir: '
      + `${toProjectPath(distDir, projectDir) || '.'}`
    );
  }
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
 * Checks compiled tests before execution.
 *
 * Compiled tests without source are pruned only when prune is enabled.
 * Otherwise the run fails before stale JavaScript can be executed.
 * Pruning is limited to a dedicated output directory inside the project and
 * starts only after every remaining compiled test passes validation.
 *
 * Additionally checks that an existing compiled test is not older than its source test.
 * This protects against a false-positive run of old compiled JS tests after
 * the corresponding source TS tests were changed or deleted.
 */
export function checkCompiledTests(
  testFiles: string[],
  options: CompiledTestCheckOptions
): string[] {
  if (options.prune) {
    assertPruneDirectoryInsideProject(options.distDir, options.projectDir);
  }

  const runnableFiles: string[] = [];
  const filesToPrune: { file: string; projectPath: string }[] = [];
  const orphanFiles: string[] = [];
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
      const projectPath = toProjectPath(file, options.projectDir);

      if (options.prune) {
        filesToPrune.push({
          file,
          projectPath
        });
        continue;
      }

      orphanFiles.push(projectPath);
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

  if (orphanFiles.length) {
    throw new Error(
      [
        'Stale compiled tests without source found.',
        '',
        'Run with --prune to remove them:',
        ...orphanFiles
          .sort(compareDeterministically)
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
          .sort((left, right) => compareDeterministically(left.compiled, right.compiled))
          .map(({ compiled, source }) => `- ${compiled} (source: ${source})`)
      ].join('\n')
    );
  }

  if (filesToPrune.length) {
    for (const { file } of filesToPrune) {
      fs.unlinkSync(file);
    }

    log(
      [
        'Pruned stale compiled tests without source:',
        ...filesToPrune
          .map(({ projectPath }) => projectPath)
          .sort(compareDeterministically)
          .map((file) => `- ${file}`)
      ].join('\n')
    );
  }

  return runnableFiles;
}
