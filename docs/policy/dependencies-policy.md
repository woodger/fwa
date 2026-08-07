# Dependencies Policy

> Type: Policy. This document defines criteria for choosing new libraries and signs of undesirable dependencies.

Dependencies may be added or changed only when the task requires them and the
standard library or existing project dependencies do not cover the need safely.

A library must:

- have a clear and stable API;
- be actively maintained for the supported runtime;
- have acceptable security and licensing characteristics;
- have a justified runtime, install-size, and maintenance cost;
- fit the existing dependency and TypeScript version policy.

Undesirable dependencies:

- a package that duplicates the standard library or an existing dependency;
- a package for trivial functionality that is clearer to keep local;
- an unmaintained or security-sensitive package without a documented reason;
- a broad library when only a small unrelated part would be used.

A focused package is not automatically worse than a broad one. Choose the
smallest maintained dependency that reduces current risk and complexity.

## Consumer Toolchain Isolation

Development tools used to build or lint `fwa` must not become requirements for
consuming projects.

A runtime integration with a compiler or toolchain must:

- stay inside one infrastructure boundary;
- use a private dependency owned by `fwa`;
- avoid loading or constraining the consumer's tool package;
- depend on the smallest surface required by runner behavior;
- preserve observable behavior with focused tests.

The TypeScript config parser is the current application of this rule. It reads
only the path options required by the runner. TypeScript 7, Oxlint, and the
`oxlint-tsgolint` semantic-analysis backend remain development tools for this
repository and do not define consumer requirements.

## Package Manager

npm is the only supported package manager for this repository. Yarn, pnpm, Bun,
and other alternative package managers must not be used to install or update
dependencies, and their lockfiles must not be committed.

Use `npm install` when changing dependencies and `npm ci` for reproducible local
or CI validation.

## Lockfile

`package-lock.json` is committed to source control so local development and CI
resolve the same dependency tree. Dependency changes must update `package.json`
and the lockfile together.

The lockfile remains excluded from the npm package because consumers resolve
dependencies from their own top-level project.

## Selection Examples

Allowed:

- add a library that covers a stable infrastructure task and is already needed in several places
- choose a dependency with a clear support model and understandable documentation
- prefer the standard library if it covers the task without architectural losses
- choose a focused library when implementing the same behavior locally would be
  materially riskier

Not allowed:

- add a package only for one call that would take a few lines of project code
- pull in a dependency for "prettier" syntax
- add a library if it duplicates a tool already used in the project

## Good Practices

- before adding a dependency, state which long-term task it solves
- check whether the task can be covered by existing project libraries
- evaluate maintenance, security, licensing, runtime, and package-size impact
