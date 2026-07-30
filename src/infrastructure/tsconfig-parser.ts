import fs from 'node:fs';
import path from 'node:path';
import { parseTsconfig } from 'get-tsconfig';
import {
  parse as parseJsonConfig,
  type ParseError,
  printParseErrorCode
} from 'jsonc-parser';

import { toProjectPath } from './project-path';

type RunnerTsConfig = {
  compilerOptions?: {
    rootDir?: string;
    outDir?: string;
  };
};

const readFileCacheKeyPrefix = 'readFileSync:';
const readFileCacheKeySuffix = ':utf8';
const directoryOptionNames = [
  'rootDir',
  'outDir'
] as const;

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidConfigError(
  configFile: string,
  projectDir: string,
  detail: string
): Error {
  return new Error(
    `Invalid TypeScript config ${toProjectPath(configFile, projectDir)}: ${detail}`
  );
}

function parseJsonConfigObject(
  contents: string,
  configFile: string,
  projectDir: string
): Record<string, unknown> {
  const parseErrors: ParseError[] = [];
  const byteOrderMarkLength = contents.charCodeAt(0) === 0xFEFF ? 1 : 0;
  const config: unknown = parseJsonConfig(
    contents.slice(byteOrderMarkLength),
    parseErrors,
    {
      allowTrailingComma: true
    }
  );
  const parseError = parseErrors[0];

  if (parseError !== undefined) {
    throw invalidConfigError(
      configFile,
      projectDir,
      `${printParseErrorCode(parseError.error)} at offset ${
        parseError.offset + byteOrderMarkLength
      }`
    );
  }

  if (!isJsonObject(config)) {
    throw invalidConfigError(configFile, projectDir, 'expected a JSON object');
  }

  return config;
}

function sanitizeTsConfig(
  config: Record<string, unknown>,
  configFile: string,
  projectDir: string
): string {
  const extendedConfig = config['extends'];
  const isExtendsList = Array.isArray(extendedConfig)
    && extendedConfig.every((entry) => typeof entry === 'string');

  if (
    extendedConfig !== undefined
    && typeof extendedConfig !== 'string'
    && !isExtendsList
  ) {
    throw invalidConfigError(
      configFile,
      projectDir,
      'extends must be a string or an array of strings'
    );
  }

  const compilerOptions = config['compilerOptions'];

  if (compilerOptions !== undefined && !isJsonObject(compilerOptions)) {
    throw invalidConfigError(
      configFile,
      projectDir,
      'compilerOptions must be an object'
    );
  }

  const sanitizedCompilerOptions: Record<string, unknown> = {};

  for (const optionName of directoryOptionNames) {
    const optionValue = compilerOptions?.[optionName];

    if (optionValue !== undefined && typeof optionValue !== 'string') {
      throw invalidConfigError(
        configFile,
        projectDir,
        `compilerOptions.${optionName} must be a string`
      );
    }

    if (optionValue !== undefined) {
      sanitizedCompilerOptions[optionName] = optionValue;
    }
  }

  const sanitizedConfig: Record<string, unknown> = {
    compilerOptions: sanitizedCompilerOptions
  };

  if (extendedConfig !== undefined) {
    sanitizedConfig['extends'] = extendedConfig;
  }

  return JSON.stringify(sanitizedConfig);
}

function configFileFromCacheKey(key: string): string | undefined {
  if (
    !key.startsWith(readFileCacheKeyPrefix)
    || !key.endsWith(readFileCacheKeySuffix)
  ) {
    return undefined;
  }

  return key.slice(
    readFileCacheKeyPrefix.length,
    -readFileCacheKeySuffix.length
  );
}

/**
 * `get-tsconfig` resolves inheritance and relative paths. Its filesystem cache
 * lets this adapter validate each JSONC file and expose only the fields owned by
 * the runner before the resolver consumes it.
 *
 * The exact dependency version is pinned because its cache key format is not
 * public API.
 */
class RunnerTsConfigCache extends Map<string, string> {
  private retryRequired = false;
  private validationError: Error | undefined = undefined;
  private readonly resolvedSelectedConfigFile: string;

  public constructor(
    selectedConfigFile: string,
    private readonly projectDir: string
  ) {
    super();

    this.resolvedSelectedConfigFile = path.resolve(selectedConfigFile);

    const contents = fs.readFileSync(this.resolvedSelectedConfigFile, 'utf8');
    const config = parseJsonConfigObject(
      contents,
      this.resolvedSelectedConfigFile,
      projectDir
    );

    super.set(
      `${readFileCacheKeyPrefix}${
        this.resolvedSelectedConfigFile
      }${readFileCacheKeySuffix}`,
      sanitizeTsConfig(config, this.resolvedSelectedConfigFile, projectDir)
    );
  }

  public override set(key: string, value: string): this {
    const configFile = configFileFromCacheKey(key);

    if (configFile === undefined) {
      return super.set(key, value);
    }

    try {
      const config = parseJsonConfigObject(value, configFile, this.projectDir);
      const isRunnerConfig = (
        path.resolve(configFile) === this.resolvedSelectedConfigFile
        || path.basename(configFile) !== 'package.json'
      );
      const cachedContents = isRunnerConfig
        ? sanitizeTsConfig(config, configFile, this.projectDir)
        : JSON.stringify(config);

      super.set(key, cachedContents);
      this.retryRequired = true;
    } catch (error) {
      if (error instanceof Error) {
        this.validationError = error;
      }

      throw error;
    }

    // Abort this attempt so the resolver reads the sanitized cache entry.
    throw new Error('Retry TypeScript config resolution');
  }

  public takeRetryRequired(): boolean {
    const retryRequired = this.retryRequired;

    this.retryRequired = false;

    return retryRequired;
  }

  public getValidationError(): Error | undefined {
    return this.validationError;
  }
}

export function parseRunnerTsConfig(
  configFile: string,
  projectDir: string
): RunnerTsConfig {
  const cache = new RunnerTsConfigCache(configFile, projectDir);

  for (;;) {
    try {
      return parseTsconfig(configFile, cache);
    } catch (error) {
      const validationError = cache.getValidationError();

      if (validationError !== undefined) {
        throw validationError;
      }

      if (cache.takeRetryRequired()) {
        continue;
      }

      throw error;
    }
  }
}
