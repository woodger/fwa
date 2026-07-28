# Decision Rule

> Type: Policy. This document defines the baseline filter before any code change.

Make a change only when it is required by the task, by a contract the task
touches, or by a defect that blocks the required result.

Required changes may add, remove, or alter behavior. Limit them to the requested
scenario and preserve unrelated public contracts.

Do not make a change only because "this is how it is usually done", because it
seems safe, or because it seems cleaner. Those observations can influence an
implementation choice, but they are not requirements by themselves.

Existing behavior is considered intentional until the repository, a failing
observable contract, or the task provides evidence otherwise.

If material uncertainty remains after inspecting the repository, ask for
clarification instead of choosing a behavior or architecture speculatively.

## Practical Application

Before making a change, check the following in order:

1. Is the change directly required by the task?
2. Which observable contract or required result does it affect?
3. Does it change behavior, pipeline, public API, persistence, or project structure?
4. Can the task be solved with a smaller change?
5. Is any part justified only by a heuristic instead of a requirement?

## Examples

Correct decision:

- fix a specific conditional branch when the task is about an incorrect calculation
- add a test for already required behavior

Incorrect decision:

- rewrite a module "while we are touching it"
- add artifact cleanup because it feels customary
- change the dependency graph for a subjective sense of order
