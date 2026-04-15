# Prompt Template

Use this prompt as the default extraction frame when generating `project-architecture-poster.json`.

Adapt the repository-specific facts, but keep the structure generic.

```text
You are reverse-engineering a software repository into a runtime-first architecture poster.

Your job is to output ONLY valid JSON matching the poster schema provided below.

Goals:
- Explain how the system actually runs, not how the folders are arranged.
- Surface one obvious runtime spine rooted in a real scenario.
- Identify the few supporting mechanisms that materially reshape the runtime.
- Keep labels compact and behavior-first.

Do not:
- dump folders, routes, or component trees
- list every dependency
- overfit to any one example repository or prior sample
- invent mechanisms the code does not support
- emit prose outside JSON

First principles:
1. Classify the repo family:
   - agent-runtime / orchestrator
   - frontend application
   - backend request-response service
   - event-driven / queue system
   - data pipeline / batch system
   - library / SDK
2. Classify density:
   - light
   - medium
   - strong
3. Pick the most representative rooted runtime scenario for the poster spine.
4. Summarize the smallest true runtime story in one line.
5. Extract:
    - entrypoints or feeds
    - runtime spine
    - standout mechanisms that should be surfaced early because they differentiate this repo from a generic repo in the same family
   - effect execution boundary
   - gates or policy boundaries
   - state or persistence substrate
   - extension surfaces
   - workers or async side paths if they materially matter
6. Merge cross-file logic into mechanisms instead of naming folders.
7. Omit edges that do not change understanding, but keep the main spine, state, gates, and async paths visible.
8. Explicitly check for shared runtime owners outside route entrypoints, especially in frontend repos:
   - task or workflow models
   - polling or retry engines
   - cross-page re-edit or re-entry flows
   - provider or store layers that redirect users between workbenches
   If one of these reshapes multiple surfaces, promote it into the architecture instead of burying it under a page box or generic service layer.

Output constraints:
- Use the provided schema exactly.
- Keep node titles short.
- Keep node detail lines under roughly 80 characters.
- Each node must include 1-2 anchor files.
- Use note panels for architectural judgments, not implementation trivia.
- Edges should only represent flows that materially improve understanding.
- If a repo is strong-density, prefer mixed-scale mechanisms rather than a few oversized summary cards.
- Every non-source, non-boundary node should participate in at least one meaningful edge. If a candidate node is only a thin wrapper, one-flag state holder, or generic service bucket, merge it into its parent mechanism or substrate instead of leaving it isolated.
- The poster is the stable mechanism view. Do not encode every scenario branch if it makes the runtime harder to read.

Placement guidance:
- left_column: entrypoints, feeds, producers
- top_clusters: main spine and the primary execution runtime
- right_column: external systems, services, sinks, adapters, or execution boundary
- mechanism_clusters: supporting mechanisms such as permissions, caching, orchestration, async jobs, extension stack, model routing, data quality, etc.
- substrate: state, persistence, caches, histories, checkpoints, durable logs
- note_panels: key judgments and concise tech/runtime notes

Mechanism selection and ordering:
- Only promote a subsystem into `mechanism_clusters` when it materially reshapes runtime behavior outside one page, route, handler, or narrow feature surface.
- If something is mostly page-owned or route-owned, keep it inside the owning top cluster unless it also acts as shared runtime, shared state rail, cross-cutting gate, or reusable workflow substrate.
- Shared hooks, config parsers, event buses, or service facades should be lifted only when they clearly feed multiple surfaces or mediate a real control/state boundary. If lifted, connect them to the mechanisms they actually feed.
- Order `mechanism_clusters` left-to-right by dominant runtime flow and affinity to connected surfaces.
- Put shared or cross-cutting mechanisms near the center; put page-owned verticals under the surfaces that primarily drive them.
- If several edges would exist only because the model was split too finely, merge the boxes instead of relying on the renderer to untangle them.

Quality bar:
- The main spine should be obvious in one glance.
- State must be visible.
- The result must still make sense if folder names are removed.
- The poster should feel like a mechanism field, not a dashboard.

Now analyze the repository and emit JSON only.
```

## How to use it well

- Replace generic nouns with repo-specific mechanisms after you inspect the code.
- Pull the 2 or 3 standout mechanisms forward early instead of leaving them implicit inside generic support clusters.
- Keep the prompt strict about JSON-only output.
- Provide the schema text from `poster-schema.md` in the same context when running the prompt.
- If the repo is very large, give the model a curated evidence set first: entrypoints, central loop, gate files, persistence files, extension files.
