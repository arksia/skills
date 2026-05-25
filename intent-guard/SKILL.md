---
name: intent-guard
description: Understand existing code and design intent before making non-trivial edits. Use for features, refactors, deletions, migrations, cross-file or cross-module changes, compatibility-sensitive fixes, or when the current implementation's reason is not obvious.
---

Understand code and design intent before editing.

If the codebase can resolve an uncertainty, inspect it before asking me.

Keep `.intent` notes short. Prefer bullets. Record decisions and constraints, not long prose.

Do not start implementation until both of these are clear:

1. how the code currently works
2. why it is supposed to work that way

## The workflow

### 1. Confirm code understanding

Before editing, make sure you understand:

- the active control flow
- where the behavior is enforced
- which tests or callers depend on it
- whether the implementation contains awkward, indirect, or legacy-looking logic

If the current code path is still fuzzy, read more code before doing anything else.

### 2. Confirm intent understanding

Before editing, make sure you understand:

- what the requested change is
- what must still remain true
- why the current implementation may have been written this way
- whether any business rule, compatibility promise, rollout condition, or historical decision explains the current shape

### 3. Check `.intent` when the reason is not obvious

Check `.intent` when:

- the code is more complex than the visible requirement
- the implementation is awkward or non-obvious
- the behavior looks intentionally inconvenient
- the logic seems to protect a special case, tenant, client, migration path, or legacy contract
- the simplest rewrite would likely remove behavior whose purpose you cannot justify

Read only the smallest relevant context in this order:

1. `AGENTS.md`
2. `.intent/areas/<area>.md` for the touched area, if it exists
3. matching files in `.intent/open/`
4. at most a few matching files in `.intent/archive/`
5. nearby code, tests, comments, docs

Do not scan all of `.intent/`.

Treat an intent note as relevant if one of these matches:

- same area
- same file
- same public behavior
- same compatibility boundary

Prefer `open` over `archive`.
Prefer `superseded` and `abandoned` notes when they touch the same path.

### 4. Ask me when `.intent` does not answer the question

If `.intent` is missing or still does not explain the reason well enough, ask me.

Ask only when the missing context changes the implementation decision.

Good reasons to ask:

- hidden consumers
- compatibility promises
- whether an old path is still intentionally alive
- abandoned approaches not visible in code
- which behavior wins when tradeoffs conflict
- why an apparently awkward implementation must stay

Resolve missing intent through small, sequential questions.
Ask one focused question at a time.
For each question, provide your recommended answer first.

If several gaps exist, resolve them one-by-one. Do not dump a questionnaire.

Use this shape:

```md
Intent gap:
- Question: ...
- Recommended answer: ...
- Why this matters: ...
```

### 5. Write the confirmed intent back into `.intent`

## Write rules

If you create or update `.intent` notes:

- keep area notes short
- keep intent notes short
- prefer bullets over prose
- record decisions and boundaries, not work logs

Use note metadata deliberately when the work is complex enough to need routing:

- `areas` matters when multiple modules or subsystems are involved
- `files` matters when later edits need file-level matching
- `superseded_by` matters when an old path is replaced
- `version` matters when intent history is grouped by release or change wave

When an answer from me explains why the code works this way or what must
remain true, write it back into `.intent`.

Do not write a new intent for trivial edits.
Do not treat every feature or bug fix as worth persistent notes.

Persist intent only when at least one of these is true:

- the feature introduces non-obvious design choices
- the implementation is unusually tricky or hard to read later
- the behavior is customized for a specific tenant, client, workflow, or environment
- the change crosses modules or boundaries where future edits may miss the reason
- the task required confirming background context before coding
- the implementation deliberately avoids an abandoned or superseded path
- background intent had to be clarified because it was not visible in code

If the change is straightforward and the reason is already obvious from the
code, tests, and surrounding context, skip persistent intent notes.

## Note statuses

Use these states in `.intent` notes:

- `open`: still shapes current work
- `done`: historical context, may still explain current design
- `abandoned`: do not resume blindly
- `superseded`: do not extend the old path when a newer one exists

## Area notes

`areas/<area>.md` is for stable background:

- purpose
- key invariants
- compatibility boundaries
- terms worth preserving

Keep it brief.

## Intent notes

Each intent file is one engineering intent, not one module and not one conversation.

Record only:

- goal
- why now
- scope
- constraints
- decisions
- avoid
- validate

Do not turn it into a diary.

Do not wait until the end to write it all down.

If the implementation changes the original plan, update the active intent note
during the work so the final note reflects the real decisions that were made.
Update it when a meaningful choice, pivot, or validation result changes the
understanding of the work. Do not append minute-by-minute coding activity.

## Bootstrapping

If the repo has no `.intent/` yet and the task would benefit from intent memory:

1. create only the minimal files needed
2. do not prefill large backlogs

Start with:

- one `areas/<area>.md` if the area is stable and reused
- one `open/v0.0.1/<slug>.md` if the task is meaningful enough to deserve memory

Minimal area note:

```md
---
area: example-area
version: 0.0.1
---

# Purpose
- ...

# Invariants
- ...

# Boundaries
- ...

# Terms
- ...
```

Minimal intent note:

```md
---
id: intent_slug
version: 0.0.1
status: open
areas: [example-area]
files:
  - path/to/file
superseded_by: null
---

# Goal
- ...

# Why Now
- ...

# Scope
- ...

# Constraints
- ...

# Decisions
- ...

# Avoid
- ...

# Validate
- ...
```

## Escalate before editing when

- the obvious change revives an abandoned path
- the obvious change extends a superseded path
- deletion may break hidden consumers
- the code suggests a compatibility boundary that was not mentioned in the request
- missing intent changes the design decision

## Working style

- infer first
- read narrowly
- ask only when needed
- ask one intent-gap question at a time
- keep intent notes compact
- validate the risky edge, not just the happy path
