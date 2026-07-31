# Documentation Policy

> Type: Policy. This document defines how user guides, contributor policies, and
> executable contracts stay consistent.

## Source Of Truth

Runtime behavior, exported declarations, configuration, and tests are the
authoritative contracts. Markdown explains how users and contributors apply
those contracts.

User-facing documentation may restate concise CLI output, option shapes,
diagnostics, and examples when that makes the package usable. Such material must
match the implementation and be updated in the same change when behavior
changes. Generated declarations and exhaustive internal details should not be
copied into permanent guides.

## README And Docs

README is the concise package entry point:

- installation;
- quick start;
- main documentation links;
- important workflows and constraints.

Detailed CLI, TypeScript config, stale-artifact, API, and contributor guidance
lives in `docs/`. Navigation pages should organize those documents instead of
repeating their contents.

Each behavior guide should identify the relevant implementation or exported
declaration. Exact diagnostics or help text copied into a guide should be
covered by tests or checked against generated output.

## Localization

English user-facing documentation is authoritative. Localized documentation
uses lowercase two-letter ISO 639-1 directory names. Russian and Chinese
translations live under `docs/ru/` and `docs/zh/`; `zh` currently contains the
only supported Chinese translation, written in Simplified Chinese. Each
translation must be updated in the same change whenever its English source
changes.

Language navigation must be present in every version. API identifiers, CLI
options, file paths, and exact runtime diagnostics remain unchanged in
translations so they continue to match executable contracts.

Contributor policies and `CHANGELOG.md` are not duplicated across languages
unless a separate ownership decision defines how both copies will stay aligned.

## Release Documentation

README links target documentation on the stable `main` branch. Because `docs/`
is excluded from the npm package, `main` must contain the matching documentation
before a package version is published.

## Minimum Rule

Documentation must answer what the supported workflow is, where its executable
contract lives, and which limitations are observable to users.
