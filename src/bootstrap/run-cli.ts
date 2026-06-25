import type { SuiteRunnerOptions } from '../application/run-suite';

type RunCliOptions = {
  args: readonly string[];
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
    'Usage: fwa <project-root>',
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
    dependencies.writeStderr('Missing project root.\n');
    dependencies.setExitCode(1);
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

  const unknownOption = options.args.find((arg) => arg.startsWith('-'));

  if (unknownOption !== undefined) {
    dependencies.writeStderr(`Unknown option: ${unknownOption}\n`);
    dependencies.setExitCode(1);
    return;
  }

  if (options.args.length > 1) {
    dependencies.writeStderr(`Unexpected arguments: ${options.args.slice(1).join(' ')}\n`);
    dependencies.setExitCode(1);
    return;
  }

  const [projectDir] = options.args;

  if (projectDir === undefined) {
    dependencies.writeStderr('Missing project root.\n');
    dependencies.setExitCode(1);
    return;
  }

  dependencies.runSuite({
    projectDir,
    runnerFile: options.runnerFile
  });
}
