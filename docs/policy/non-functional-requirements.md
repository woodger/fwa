# Non-Functional Requirements

> Type: Policy. This document defines the non-functional properties of the project that a working change must not violate.

Changes must not unintentionally break:

- build reproducibility
- determinism
- portability
- CI
- runtime behavior outside the requested scenario
- compatibility-sensitive file structure
- startup order
- documented architectural boundaries
- dependency contracts

An explicit task may require changing one of these properties. In that case, the
change must be limited to the required scope and its compatibility impact must
be documented and validated.

## Risk Examples

- the build passes locally but depends on file ordering in a specific OS
- the code works but changes the location of output artifacts
- the change does not break logic but adds a dependency on shell-specific behavior
- tests pass but the component startup order becomes different

## Good Practices

- verify not only result correctness but also preservation of previous side effects
- avoid changes that bind the project to a specific execution environment
- separately evaluate the impact of a change on CI, file structure, and reproducibility
