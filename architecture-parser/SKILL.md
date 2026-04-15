---
name: architecture-parser
description: Reverse-engineer a repository into evidence-backed architecture assets with a runtime-first method. Use this whenever the user wants to understand how a codebase actually runs, trace request or task flow, extract execution paths, explain state and persistence, find gates and workers, or generate architecture blueprints, poster JSON, and HTML maps instead of a folder summary.
---

# Architecture Parser

Treat architecture parsing as staged reverse engineering, not prettier repo listing.

Default deliverables:

- `project-architecture_blueprint.md`
- `project-runtime-flows.md`
- `project-architecture-poster.json`
- `project-architecture-map.html`

Use the files in `references/` and the renderer in `scripts/` instead of inventing a new format.

## Core workflow

### 1. Classify the repo

Pick the dominant family:

- `agent-runtime / orchestrator`
- `frontend application`
- `backend request-response service`
- `event-driven / queue system`
- `data pipeline / batch system`
- `library / SDK`

Pick density:

- `light`
- `medium`
- `strong`

Use runtime shape, not marketing labels.

### 2. Select rooted runtime scenarios

Pick 1 to 3 representative runtime units. Good roots are concrete:

- one HTTP request
- one CLI command
- one agent turn
- one scheduled job
- one worker task

For each scenario, record:

- trigger
- entry evidence
- completion condition
- why it is representative

If no clear entrypoint exists, say so and switch to exported-surface analysis instead of inventing a runtime.

### 3. Trace the smallest true runtime story

For each rooted scenario, trace:

- trigger
- context assembly
- main control flow
- policy or permission gates
- side-effect execution
- state reads
- state writes
- async handoffs
- completion or re-entry

If you cannot summarize the runtime in one sentence, keep tracing.

### 4. Extract mechanisms, not folders

Merge files into behavior-level mechanisms when they act as one decision.

Promote a mechanism only when it materially reshapes runtime by owning at least one of:

- orchestration
- fanout
- policy enforcement
- durable state
- boundary crossing
- background routing
- extension hosting

Default noise candidates:

- leaf utilities
- schema helpers
- thin wrappers with no routing power
- repetitive adapters that do not change control flow

Reduce noise in this order:

1. hide leaf helpers
2. merge thin wrapper chains
3. collapse repeated side branches into one mechanism
4. omit redundant edges and list them explicitly

Prefer behavior names such as:

- `Permission Arbitration`
- `Route Shell And Cache`
- `Task Lifecycle Engine`
- `Persistence Substrate`

Avoid generic ownership labels such as:

- `utils`
- `services`
- `components`
- raw folder dumps

### 5. Produce the outputs

#### Runtime flows

Use `project-runtime-flows.md` to make the runtime extraction explicit before you generate the poster.

For each scenario, include:

- one-line summary
- ordered spine steps
- gates
- state reads and writes
- async handoffs
- omitted edges
- open questions
- confidence

Keep this compact. It is a validation artifact, not a long report.

#### Blueprint

Keep `project-architecture_blueprint.md` mechanism-first:

- what the system is
- dominant family and density
- primary runtime flow
- major mechanisms
- state and persistence
- gates and policy surfaces
- extensions and async paths
- risky couplings

#### Poster JSON

Read [poster-schema.md](./references/poster-schema.md).

The JSON is the stable mechanism view, not a dump of every scenario branch. Keep it evidence-backed:

- each box should have 1 or 2 anchor files
- each group should explain a mechanism
- edges should explain runtime, state, gating, loopback, or extension
- notes should contain judgments, not essays

Use [prompt-template.md](./references/prompt-template.md) as the default extraction frame.

#### HTML map

Run:

```powershell
node ./scripts/render-architecture-map.mjs <poster-json> <output-html>
```

The renderer expects the schema from `poster-schema.md`. Keep the JSON semantic; do not hand-place boxes unless the layout genuinely needs an override.

### 6. Critique and iterate

Before stopping, inspect the output against this checklist:

- the main spine is obvious in one glance
- the rooted scenario is concrete rather than generic
- state and persistence are visible
- extension surfaces and workers are visible when they matter
- the page does not read like a sitemap or folder tree
- strong repos are not flattened into a few bland cards
- evidence, inference, and open questions are distinguishable

If it feels wrong, fix the model first, then the labels, then the placement.

## Family guidance

### `agent-runtime / orchestrator`

Usually emphasize entry modes, the query or task loop, tool or effect runtime, permissions, persistence, extension surfaces, and workers or agents.

### `frontend application`

Usually emphasize auth, bootstrap, and visibility gates, the route or layout shell, long-lived client state, shared workflow loops, and backend, storage, realtime, or notification boundaries. Do not turn the result into a route list or component catalog.

### `backend request-response service`

Usually emphasize ingress and bootstrap, middleware, auth and policy gates, handler, domain and data boundaries, async side paths, persistence, and external systems. Do not turn the result into an endpoint dump.

### `event-driven / queue system`

Usually emphasize producers, brokers or routers, consumers, handler stages, retries, dead-letter paths, or checkpoints.

### `data pipeline / batch system`

Usually emphasize sources, staged transforms, orchestration, checkpoints, sinks, and replay or quality paths.

### `library / SDK`

Usually emphasize public entrypoints, the core contract, a runtime kernel or coordination layer, adapters or integrations, extension hooks, and state or cache surfaces when they affect semantics.

## Recovery questions

When stuck, ask:

- What is the smallest true runtime story here?
- What is the root event?
- Which mechanisms materially reshape that story?
- Where does state live?
- Where do extensions enter?
- What is still inference rather than proof?

If you can answer those well, the runtime flows, poster JSON, and HTML usually become straightforward.
