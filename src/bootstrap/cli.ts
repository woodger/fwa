import type { SuiteRunnerOptions } from '../application/run-suite';

type RunCliOptions = {
  args: readonly string[];
  defaultProjectDir: string;
  runnerFile: string;
};

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
    '  -p, --project <path>  TypeScript config file or directory.',
    '  -h, --help            Show help.',
    '  -v, --version         Show version.',
    ''
  ].join('\n');
}

export function runCli(
  options: RunCliOptions,
  dependencies: RunCliDependencies
): void {
  if (options.args.length === 0) {
    dependencies.runSuite({
      projectDir: options.defaultProjectDir,
      runnerFile: options.runnerFile
    });
    return;
  }

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

      if (value === undefined || value.startsWith('-')) {
        dependencies.writeStderr('Option --project expects a value.\n');
        dependencies.setExitCode(1);
        return;
      }

      tsConfigPath = value;
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

  dependencies.runSuite(suiteOptions);
}
