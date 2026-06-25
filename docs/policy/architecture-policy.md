# Architecture Policy

> Type: Policy. This document defines constraints on dependency direction, layer boundaries, and file placement rules.

The project uses Clean Architecture Lite.

Dependencies point inward.

```text
Domain
^
Application
^
Infrastructure
^
Bootstrap
```

This means:

- `domain` does not know about the outside world;
- `application` coordinates scenarios and depends on abstractions;
- `infrastructure` implements technical details and external integrations;
- `bootstrap` assembles the application, configuration, CLI, and runtime dependencies.

## Dependency Direction

Forbidden:

- violate dependency direction;
- import an outer layer into an inner layer;
- add dependencies to `domain`;
- move code between layers without an architectural reason;
- simplify architecture by merging layers;
- move business rules into technical layers to reduce the number of files.

Allowed:

- `infrastructure` implements an interface declared in `application` or `domain`;
- `bootstrap` assembles dependencies and passes them into `application`;
- `application` coordinates a use case without knowing data storage, HTTP, CLI, Python processes, or external API details;
- `domain` contains pure rules, calculations, and domain models.

Not allowed:

- import `infrastructure` into `domain`;
- import `bootstrap` into `application`, `domain`, or `infrastructure`;
- put environment initialization code into `domain` or `application`;
- move business rules into `bootstrap`;
- put transport-specific, provider-specific, or filesystem-specific code into `domain`.

## Layer Responsibilities

### `domain`

Contains pure domain logic.

Allowed here:

- domain models;
- trading and market concepts;
- feature calculations;
- target calculations;
- mathematical and statistical functions when they are part of the domain model;
- ML profiles as domain descriptions of feature and target sets;
- domain-specific policies and rules.

Must not contain:

- HTTP, CLI, Hono, TypeORM, Tinkoff Invest, Apache Arrow, filesystem, subprocess;
- env/config reads;
- user output formatting;
- use-case orchestration;
- infrastructure serialization;
- generic helpers without domain meaning.

### `application`

Contains application scenarios.

Allowed here:

- use cases;
- application services;
- ports;
- report/output contracts;
- DTOs;
- scenario errors;
- orchestration between domain logic and ports.

Must not contain:

- direct work with HTTP, CLI, TypeORM, Python subprocess, filesystem, or external APIs;
- transport-specific mapping;
- provider-specific rules;
- CLI output formatting;
- stdout/file sinks for reports;
- pure domain mathematics if it can live in `domain`.

### `infrastructure`

Contains implementation of the outside world.

Allowed here:

- adapters;
- persistence;
- transport;
- HTTP server;
- middleware;
- controllers;
- filesystem IO;
- subprocess integration;
- worker runtime;
- external provider integration;
- provider-specific validators;
- serialization/deserialization of external formats.

Must not contain:

- business rules;
- scenario decisions of use cases;
- pure domain logic.

### `bootstrap`

Contains application assembly and startup.

Allowed here:

- CLI parsing;
- command registry;
- help/version rendering;
- runtime options;
- config resolving;
- composition root;
- wiring use cases to adapters;
- CLI reporters that format application report contracts for users.

Must not contain:

- domain calculations;
- business rules;
- direct implementation of ports;
- logic that can be reused outside application startup.

### `internal`

Contains internal generic utilities that are not part of the domain.

Allowed here:

- generic collections;
- generic guards;
- generic formatting helpers;
- byte-size helpers;
- low-level process helpers;
- technical functions without domain language.

Must not contain:

- business rules;
- use-case orchestration;
- transport-specific code;
- provider-specific code.

## File Placement Rule

Before creating, moving, or renaming a file, its layer must be identified:

- `domain`;
- `application`;
- `infrastructure`;
- `bootstrap`;
- `internal`;
- `docs`;
- `contracts`.

A file must not be placed by the principle of "where it is more convenient" or "next to similar code" if that violates the layer responsibility.

If the layer cannot be identified unambiguously, the change is architecturally ambiguous. In this case, stop and ask for clarification instead of creating a file intuitively.

## Directory Creation Rule

Creating a new directory is an architectural change.

A new directory is allowed only if:

- the task explicitly requires a new directory;
- the directory is already described in architecture documentation;
- the change also adds or updates documentation explaining the directory role.

Creating a directory only for convenient file grouping is forbidden.

New generic directories without an explicit architectural role are forbidden:

- `utils`;
- `helpers`;
- `common`;
- `shared`;
- `misc`;
- `wiring`;
- `lib`.

If such a directory already exists, this does not permit adding new code there. First check whether the directory is technical debt.

## File Naming Rule

A file name must reflect its architectural role.

For new files, use existing project suffixes when they fit:

- `*.use-case.ts` - application use case;
- `*.service.ts` - application/domain service;
- `*.port.ts` - application port;
- `*.report.ts` - application report/output contract;
- `*.adapter.ts` - infrastructure adapter;
- `*.policy.ts` - rule or policy;
- `*.validator.ts` - validator;
- `*.mapper.ts` - mapper between layers or formats;
- `*.reporter.ts` - CLI/output reporter implementation;
- `*.middleware.ts` - HTTP middleware;
- `*.routes.ts` - HTTP routes;
- `*.controller.ts` - HTTP/controller entrypoint;
- `*.request.ts` - transport request DTO;
- `*.response.ts` - transport response DTO;
- `*.test.ts` - test.

If no suffix fits, this is a signal that the file role is not defined. In that case, define the role first instead of inventing a new abstract name.

Using non-obvious author-specific names is forbidden if the file purpose cannot be understood without reading the implementation.

## File Move Rule

Moving a file between layers is allowed only when there is a reason.

Allowed reasons:

- the file is in the wrong layer;
- the file contains logic that belongs to another layer;
- the file violates dependency direction;
- the file is a generic utility and is incorrectly located in `domain`;
- the file is an infrastructure detail and is incorrectly located in `domain` or `application`;
- the file is business/domain logic and is incorrectly located in `bootstrap` or `infrastructure`.

Not allowed reasons:

- "this is prettier";
- "this makes imports shorter";
- "this groups files more conveniently";
- "Codex suggested it";
- "there is already a similar file nearby";
- "this can reduce the number of directories".

## Minimal Change Rule

Architectural refactoring must be minimal.

It is forbidden to combine the following in one change:

- move files;
- rename entities;
- change public API;
- change behavior;
- rewrite implementation;
- change test pipeline.

If several types of changes are required, they are performed as separate steps.

## Clarification First

If a change affects a layer, directory, file name, or dependency direction, and the correct decision is not obvious, clarify the architectural intent first.

Guessing placement is forbidden.

It is better to stop and ask a question than to create a file in the wrong place.

## Good Practices

- check new dependencies against layer direction first;
- keep business rules in the layers where they already live architecturally;
- localize integration details in `infrastructure` and `bootstrap`;
- do not put generic utilities into `domain`;
- before creating a file, check existing naming patterns;
- before creating a directory, check whether it is described in architecture documentation;
- handle disputed changes as a separate small refactoring step.
