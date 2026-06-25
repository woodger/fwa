import type { SuiteRunnerOptions } from '../application/run-suite';

type RunCliOptions = {
  args: readonly string[];
  projectDir: string;
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
    'Usage: fwa [options]',
    '',
    'Options:',
    '  -h, --help     Show help.',
    '  -v, --version  Show version.',
    ''
  ].join('\n');
}

export function runCli(
  options: RunCliOptions,
  dependencies: RunCliDependencies
): void {
  if (options.args.length === 0) {
    dependencies.runSuite({
      projectDir: options.projectDir,
      runnerFile: options.runnerFile
    });
    return;
  }

  if (options.args.length > 1) {
    dependencies.writeStderr(`Unexpected arguments: ${options.args.join(' ')}\n`);
    dependencies.setExitCode(1);
    return;
  }

  const arg = options.args[0];

  if (arg === undefined) {
    dependencies.runSuite({
      projectDir: options.projectDir,
      runnerFile: options.runnerFile
    });
    return;
  }

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

  dependencies.writeStderr(`Unknown option: ${arg}\n`);
  dependencies.setExitCode(1);
}
