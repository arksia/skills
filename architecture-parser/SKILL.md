---
name: architecture-parser
description: Reverse-engineer a repository into an evidence-backed architecture blueprint, structured poster JSON, and a runtime-style HTML architecture map. Use this whenever the user wants to understand how a codebase actually runs, asks for architecture diagrams or HTML maps, wants to trace entrypoints/loops/state/extensions/workers, or asks to turn source code into a poster-class architecture artifact rather than a folder summary.
---

# Architecture Parser

Treat architecture parsing as reverse engineering, not as prettier repo listing.

The deliverable for this skill is a compact bundle:

- `project-architecture_blueprint.md`
- `project-architecture-poster.json`
- `project-architecture-map.html`

Use the files in `references/` and the renderer in `scripts/` instead of inventing a new output format.

## What this skill optimizes for

- Runtime-first explanations
- One obvious control spine
- A small number of high-value mechanisms
- Evidence-backed labels
- HTML that reads like a poster, not a dependency graph

Target a poster-class reading experience:

- light background
- sparse, intentional edges
- mixed-scale mechanism boxes
- one main runtime lane plus support lanes

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

### 2. Trace one real runtime unit

Follow one end-to-end path:

- what starts the system
- what assembles context
- what owns control flow
- what executes side effects
- what gates execution
- what persists or restores state

If you cannot summarize the runtime in one sentence, keep tracing.

### 3. Extract mechanisms, not folders

Merge files into behavior-level mechanisms when they act as one decision.

Pull standout mechanisms forward early. Ask which 2 or 3 subsystems make this repo recognizably different from a generic repo in the same family, then give those mechanisms first-class space in the model.

Prefer:

- `Permission Arbitration`
- `Route Shell And Cache`
- `Task Lifecycle Engine`
- `Persistence Substrate`

Avoid:

- `utils`
- `services`
- `components`
- raw folder dumps

### 4. Produce the structured poster JSON

Read [poster-schema.md](D:\skills\architecture-parser\references\poster-schema.md).

The JSON is the authoritative architecture model. Keep it evidence-backed:

- each box should have 1 or 2 anchor files
- each group should explain a mechanism
- edges should explain runtime, state, gating, loopback, or extension
- notes should contain judgments, not essays

Use [prompt-template.md](D:\skills\architecture-parser\references\prompt-template.md) as the default prompting frame. Adapt it to the repo, but keep the abstractions derived from the repo rather than from any prior sample.

### 5. Render the HTML

Run:

```powershell
node D:\skills\architecture-parser\scripts\render-architecture-map.mjs <poster-json> <output-html>
```

The renderer expects the schema from `poster-schema.md`. It handles layout and visual grammar; the JSON should stay semantic.

### 6. Critique and iterate

Before stopping, inspect the output against this checklist:

- the main spine is obvious in one glance
- state and persistence are visible
- extension surfaces and workers are visible when they matter
- the page does not read like a sitemap or folder tree
- strong repos are not flattened into 5 bland cards
- non-source mechanisms are not left as isolated boxes; thin wrappers and generic service buckets are merged instead
- notes are compact and judgment-heavy

If it feels wrong, fix the model first, then the labels, then the placement.

## Output rules

### Blueprint

Keep `project-architecture_blueprint.md` compact and mechanism-first:

- what the system is
- primary runtime flow
- major mechanisms
- state and persistence
- gates and policy surfaces
- extensions and async paths
- risky couplings

### Poster JSON

Use the exact structure in `poster-schema.md`.

Do not emit pixel coordinates unless you are deliberately overriding the default layout for a special case. The renderer should normally infer placement from lanes and sections.

### HTML map

Use the bundled renderer. Only hand-edit the generated HTML when debugging the renderer itself.

## Family guidance

### `agent-runtime / orchestrator`

Usually emphasize:

- entry modes
- query or task loop
- tool or effect runtime
- permissions
- persistence
- extension surfaces
- workers or agents

### `frontend application`

Usually emphasize:

- auth, bootstrap, and visibility gates
- route, layout, and navigation shell
- client-side control boundaries and long-lived UI state
- query, detail, update, workflow, or operator loops
- backend API, storage, compute, realtime, notification, or audit boundaries

Do not turn the result into a page inventory, component catalog, or route list.
Collapse sibling pages into mechanism families unless a page owns a distinct runtime.
Do not promote every page-owned workflow into the mechanism row. Only lift a frontend subsystem into `mechanism_clusters` if it behaves like shared runtime, shared state rail, reusable workflow substrate, or a cross-cutting boundary across multiple surfaces.
When several frontend verticals are mostly parallel page workbenches, keep them inside the top workbench/router block or merge them into fewer downstream mechanisms, then order any remaining mechanism clusters by runtime flow so the poster does not create artificial cross-canvas backtracking.

### `backend request-response service`

Usually emphasize:

- ingress, transport, and bootstrap
- middleware, auth, and policy gates
- handler, domain, service, and data boundaries
- cache, queue, notification, or async side paths
- persistence and external system boundaries

Do not turn the result into an endpoint dump or framework layer checklist.

### `event-driven / queue system`

Usually emphasize:

- producer
- broker or router
- consumers
- handler stages
- retries, dead-letter, or state checkpoints

### `data pipeline / batch system`

Usually emphasize:

- source
- staged transforms
- orchestration
- checkpoints
- sink
- data quality or replay paths

### `library / SDK`

Usually emphasize:

- public entrypoints
- core contract
- orchestration or runtime kernel
- adapters or integrations
- extension hooks
- state or cache surfaces when they affect semantics

## Recovery questions

When stuck, ask:

- What is the smallest true runtime story here?
- Which mechanisms materially reshape that story?
- Where does state live?
- Where do extensions enter?
- What could break if someone adds a feature carelessly?

If you can answer those well, the JSON and HTML usually become straightforward.
