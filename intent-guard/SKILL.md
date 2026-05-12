---
name: intent-guard
description: Use for non-trivial coding changes when the agent should infer the real engineering intent before editing. Trigger on features, refactors, deletions, migrations, cross-file changes, compatibility-sensitive fixes, or requests like "can we delete this?" and "why is this here?".
---

Infer hidden engineering intent before broad editing.

Keep it short. Prefer bullets. Do not create long notes.

If the codebase can resolve an uncertainty, inspect it before asking the user.

## Read order

Before broad grep or edits, read only the smallest relevant context in this order:

1. `AGENTS.md`
2. `.intent/areas/<area>.md` for the touched area, if it exists
3. matching files in `.intent/open/`
4. at most a few matching files in `.intent/archive/`
5. nearby code, tests, comments, docs

Do not scan all of `.intent/`.

## Matching rules

Treat an intent as relevant if one of these matches:

- same area
- same file
- same public behavior
- same compatibility boundary

Prefer `open` over `archive`.
Prefer `superseded` and `abandoned` notes when they touch the same path.

## Core job

Before editing, answer:

1. What does the user appear to want?
2. What does the repo appear to want?
3. What must still hold?
4. What path is tempting but wrong?
5. What proves the change is safe?

Reduce the result to:

```md
Intent review:
- Goal: ...
- Preserve: ...
- Avoid: ...
- Validate with: ...
```

## Note statuses

Use these states in `.intent` notes:

- `open`
- `done`
- `abandoned`
- `superseded`

Operational meaning:

- `open`: still shapes current work
- `done`: historical context, may still explain current design
- `abandoned`: do not resume blindly
- `superseded`: do not extend the old path when a newer one exists

## When intent is missing

Many existing repos will have incomplete intent notes.

When `.intent` is missing or insufficient:

1. infer as much as possible from code, tests, comments, docs, and nearby history
2. continue if the remaining uncertainty does not change the design
3. ask the user when the missing intent is load-bearing

Load-bearing gaps include:

- hidden consumers
- compatibility promises
- abandoned approaches not visible in code
- whether an old path is still intentionally alive
- which behavior wins when tradeoffs conflict

Resolve missing intent through small, sequential questions.
For each question, provide your recommended answer first.

Use this shape:

```md
Intent gap:
- Question: ...
- Recommended answer: ...
- Why this matters: ...
```

If several gaps exist, resolve them one-by-one. Do not dump a questionnaire.

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

Do not write a new intent for trivial edits.
Do not treat every feature or bug fix as worth persistent notes.

Persist intent only when at least one of these is true:

- the feature introduces non-obvious design choices
- the implementation is unusually tricky or hard to read later
- the behavior is customized for a specific tenant, client, workflow, or environment
- the change crosses modules or boundaries where future edits may miss the reason
- the task required confirming background context before coding
- the implementation deliberately avoids an abandoned or superseded path

If the change is straightforward and the reason is already obvious from the
code, tests, and surrounding context, skip persistent intent notes.

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
- the code suggests a compatibility boundary the user did not mention
- missing intent changes the design decision

## Working style

- infer first
- read narrowly
- ask only when needed
- ask one intent-gap question at a time
- keep intent notes compact
- validate the risky edge, not just the happy path
