import path from 'node:path';

/**
 * Converts an absolute path to a path relative to the project root.
 *
 * This format is used in diagnostics so messages stay stable
 * between a local machine, container, and CI.
 */
export function toProjectPath(file: string, projectDir: string): string {
  return path
    .relative(projectDir, file)
    .split(path.sep)
    .join('/');
}
