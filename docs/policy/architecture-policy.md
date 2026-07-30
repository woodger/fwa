# Architecture Policy

> Type: Policy. This document defines the current module boundaries, dependency
> direction, and file placement rules for `fwa`.

## Current Structure

`fwa` is a small layered Node.js CLI and library. It currently has these
responsibility groups:

```text
config and shared value types
            ^
        application
            ^
      infrastructure
            ^
         bootstrap
            ^
    bin and public index
```

The diagram is a responsibility overview, not a requirement that every module
import the layer immediately below it. Actual allowed imports are:

- `config.ts` and `config.types.ts` do not depend on application,
  infrastructure, or bootstrap;
- `application` may depend on config and shared value types;
- `infrastructure` may depend on config, shared value types, and type contracts
  declared by application;
- `bootstrap` may depend on application, infrastructure, config, and shared
  value types;
- `bin.ts` and `index.ts` may depend on bootstrap and the public application
  types they expose.

Inner modules must not import bootstrap. Application must not import
infrastructure. A new dependency direction requires an explicit architectural
reason.

The repository does not currently define separate `domain`, `internal`, or
`contracts` layers. Do not create them merely to match a generic architecture
template.

## Config And Shared Value Types

Files:

- `src/config.ts`;
- `src/config.types.ts`.

Responsibilities:

- supported file extensions;
- default runner behavior;
- small value types shared across layers.

These files must remain free of filesystem access, process state, TypeScript
compiler calls, CLI parsing, and suite orchestration.

## Application

Directory:

- `src/application/`.

Responsibilities:

- public and resolved suite option contracts;
- use-case execution order;
- scenario decisions such as handling an empty runnable set;
- scenario-level diagnostic content;
- injected contracts for filesystem and process effects.

Application code may call injected functions such as `log`, `setExitCode`, or
`runTestFiles`. It must not directly access the filesystem, `process`,
`console`, the TypeScript compiler API, or `node:test`.

## Infrastructure

Directory:

- `src/infrastructure/`.

Responsibilities:

- filesystem discovery and validation;
- source-to-output path mapping;
- private TypeScript config parsing;
- Node.js capability checks;
- native `node:test` integration;
- deterministic technical diagnostics associated with those operations.

Infrastructure may construct errors and diagnostic text for technical
validation. It must not parse CLI arguments, choose commands, or terminate the
process. Process output and exit-code ownership stay in bootstrap when the
public runner is used.

Infrastructure modules should expose results, errors, streams, or explicit
dependencies instead of hiding new global side effects.

## Bootstrap

Directory:

- `src/bootstrap/`.

Responsibilities:

- CLI option parsing and help rendering;
- resolving external options into application input;
- checking combinations of runtime options;
- assembling application and infrastructure functions;
- binding stdout, stderr, logging, and exit-code effects.

Small inline closures that connect process APIs to application dependencies are
part of composition and are allowed here. Reusable discovery, validation, or
test-execution logic belongs in application or infrastructure.

## Entrypoints

Files:

- `src/bin.ts` is the executable process adapter;
- `src/index.ts` defines the package-root public API.

`bin.ts` may read argv, the working directory, package metadata, and process
streams. CLI parsing remains in bootstrap. Expensive suite infrastructure
should stay lazily loaded so `--help` and `--version` remain lightweight.

Only exports reachable from `src/index.ts` are supported programmatic API.
Files emitted under `dist/` are not independently public.

## Diagnostics And Side Effects

Ownership is split by responsibility:

- application decides scenario outcomes and invokes injected effects;
- infrastructure reports technical validation and native runner events;
- bootstrap binds those effects to `console`, process streams, and
  `process.exitCode`;
- `bin.ts` adapts the real CLI process to bootstrap.

Do not move a process-level side effect inward merely to reduce the number of
parameters. Do not move technical filesystem or Node.js behavior outward merely
to keep all messages in one file.

## File Placement

Place new code beside the responsibility it extends:

- use-case contracts and orchestration in `application`;
- filesystem, TypeScript, path, and Node.js adapters in `infrastructure`;
- CLI parsing and runtime composition in `bootstrap`;
- package-wide static defaults or shared value types at the existing config
  boundary;
- process and package exports only in the existing entrypoints.

If code spans responsibilities, first look for an existing injected contract.
Create a new boundary only when the task requires it and the ownership cannot be
expressed clearly with the current structure.

## File And Directory Naming

Production filenames use descriptive `kebab-case` names that match nearby
modules, for example:

- `run-suite.ts`;
- `node-test.ts`;
- `test-files.ts`;
- `tsconfig-directories.ts`.

Tests use the corresponding `*.test.ts` name. Suffixes such as `adapter`,
`service`, or `use-case` are not mandatory when the existing project vocabulary
already describes the role clearly.

A new directory is justified only by a cohesive responsibility required by the
current task. Generic dumping grounds such as `utils`, `helpers`, `common`,
`shared`, or `misc` are not acceptable without a specific, documented role.

When a change introduces a real new architectural boundary, update this
document in the same change.

## Change Rule

Architectural changes must be minimal and tied to a task requirement. Preserve
public API, runtime semantics, startup order, output ownership, and dependency
direction unless the task explicitly requires changing them.

Do not combine unrelated file moves, renames, behavior changes, public API
changes, or pipeline changes. When several are all necessary, keep them as
separate reviewable steps within the task.
