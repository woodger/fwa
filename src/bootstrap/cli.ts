import { defaultRunnerConfig } from '../config';
import type { TestIsolation } from '../config.types';
import type { SuiteRunnerOptions } from '../application/run-suite';

/**
 * CLI input normalized by bin.ts before command parsing.
 */
type RunCliOptions = {
  args: readonly string[];
  defaultProjectDir: string;
  runnerFile: string;
};

/**
 * Side effects injected into the parser to keep CLI decisions testable.
 */
type RunCliDependencies = {
  readVersion(): string;
  runSuite(options: SuiteRunnerOptions): void;
  setExitCode(code: number): void;
  writeStderr(message: string): void;
  writeStdout(message: string): void;
};

function renderHelp(): string {
  return [
    'Usage: fwa [project-root] [options]',
    '',
    'Options:',
    '  -p, --project <path>     TypeScript config file or directory.',
    '  --prune                  Prune stale compiled tests without source.',
    `  -i, --isolation <mode>   Test isolation: process or none. Default: ${defaultRunnerConfig.nodeTest.defaultIsolation}.`,
    '  -h, --help               Show help.',
    '  -v, --version            Show version.',
    ''
  ].join('\n');
}

function isTestIsolation(value: string): value is TestIsolation {
  return value === 'process' || value === 'none';
}

export function runCli(
  options: RunCliOptions,
  dependencies: RunCliDependencies
): void {
  // No arguments means the runner uses the current process directory,
  // which is passed from bin.ts as an explicit dependency.
  if (options.args.length === 0) {
    dependencies.runSuite({
      projectDir: options.defaultProjectDir,
      runnerFile: options.runnerFile
    });
    return;
  }

  // Help and version are informational commands. They are only accepted
  // as standalone arguments so they cannot mask invalid runner input.
  if (options.args.length === 1) {
    const arg = options.args[0];

    if (arg === '--help' || arg === '-h') {
      dependencies.writeStdout(renderHelp());
      dependencies.setExitCode(0);
      return;
    }

    if (arg === '--version' || arg === '-v') {
      dependencies.writeStdout(`${dependencies.readVersion()}\n`);
      dependencies.setExitCode(0);
      return;
    }
  }

  if (options.args.includes('--help') || options.args.includes('-h')) {
    dependencies.writeStderr('Help option cannot be combined with other arguments.\n');
    dependencies.setExitCode(1);
    return;
  }

  if (options.args.includes('--version') || options.args.includes('-v')) {
    dependencies.writeStderr('Version option cannot be combined with other arguments.\n');
    dependencies.setExitCode(1);
    return;
  }

  const projectArgs: string[] = [];
  let tsConfigPath: string | undefined;
  let prune: boolean | undefined;
  let isolation: TestIsolation | undefined;

  // Keep parsing small and strict: one positional project root plus
  // TypeScript-style options with separate values.
  for (let index = 0; index < options.args.length; index += 1) {
    const arg = options.args[index];

    if (arg === undefined) {
      continue;
    }

    if (arg === '--project' || arg === '-p') {
      if (tsConfigPath !== undefined) {
        dependencies.writeStderr('Option --project cannot be specified more than once.\n');
        dependencies.setExitCode(1);
        return;
      }

      const value = options.args[index + 1];

      // Match tsc's separate-argument form: --project <path> or -p <path>.
      if (value === undefined || value.startsWith('-')) {
        dependencies.writeStderr('Option --project expects a value.\n');
        dependencies.setExitCode(1);
        return;
      }

      tsConfigPath = value;
      index += 1;
      continue;
    }

    if (arg === '--prune') {
      if (prune !== undefined) {
        dependencies.writeStderr('Option --prune cannot be specified more than once.\n');
        dependencies.setExitCode(1);
        return;
      }

      prune = true;
      continue;
    }

    if (arg === '--isolation' || arg === '-i') {
      if (isolation !== undefined) {
        dependencies.writeStderr('Option --isolation cannot be specified more than once.\n');
        dependencies.setExitCode(1);
        return;
      }

      const value = options.args[index + 1];

      if (value === undefined || value.startsWith('-')) {
        dependencies.writeStderr('Option --isolation expects a value.\n');
        dependencies.setExitCode(1);
        return;
      }

      if (!isTestIsolation(value)) {
        dependencies.writeStderr('Option --isolation expects "process" or "none".\n');
        dependencies.setExitCode(1);
        return;
      }

      isolation = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('-')) {
      dependencies.writeStderr(`Unknown option: ${arg}\n`);
      dependencies.setExitCode(1);
      return;
    }

    projectArgs.push(arg);
  }

  // After options are removed, at most one positional argument can remain.
  if (projectArgs.length > 1) {
    dependencies.writeStderr(`Unexpected arguments: ${projectArgs.slice(1).join(' ')}\n`);
    dependencies.setExitCode(1);
    return;
  }

  const projectDir = projectArgs[0] ?? options.defaultProjectDir;
  const suiteOptions: SuiteRunnerOptions = {
    projectDir,
    runnerFile: options.runnerFile
  };

  if (tsConfigPath !== undefined) {
    suiteOptions.tsConfigPath = tsConfigPath;
  }

  if (prune !== undefined) {
    suiteOptions.prune = prune;
  }

  if (isolation !== undefined) {
    suiteOptions.isolation = isolation;
  }

  dependencies.runSuite(suiteOptions);
}
