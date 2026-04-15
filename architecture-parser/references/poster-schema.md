# Poster Schema

This skill uses a semantic JSON format. The renderer converts it into absolute-positioned HTML and SVG.

The goal is to keep the LLM responsible for architecture modeling, not pixel placement.

## Top-level shape

```json
{
  "version": "1.0",
  "meta": {
    "title": "Project Name",
    "subtitle": "Architecture poster subtitle",
    "language": "zh-CN"
  },
  "classification": {
    "family": "backend request-response service",
    "density": "strong",
    "runtime_story": "entry -> context -> loop -> execution"
  },
  "phase_band": {
    "title": "Top lifecycle label",
    "segments": [
      { "label": "Segment", "detail": "Short detail", "weight": 1.0 }
    ]
  },
  "left_column": {
    "title": "Entry / Feeds",
    "nodes": []
  },
  "top_clusters": [],
  "right_column": {
    "title": "Execution / External",
    "nodes": []
  },
  "mechanism_clusters": [],
  "substrate": {
    "title": "State / Persistence Layer",
    "detail": "Short subtitle",
    "nodes": []
  },
  "note_panels": [],
  "annotations": [],
  "security_bar": {
    "title": "Security Boundaries",
    "segments": []
  },
  "legend": [],
  "edges": []
}
```

## Recommended family values

- `agent-runtime / orchestrator`
- `frontend application`
- `backend request-response service`
- `event-driven / queue system`
- `data pipeline / batch system`
- `library / SDK`

## Node shape

Nodes are the basic boxes on the poster.

```json
{
  "id": "query-engine",
  "title": "QueryEngine.ts",
  "detail": "Conversation state | message store | cache tracking",
  "tech": "TypeScript | AsyncGenerator",
  "metric": "optional small emphasis line",
  "style": "primary",
  "anchors": [
    "src/QueryEngine.ts",
    "src/query.ts"
  ]
}
```

### Supported node styles

- `source`
- `primary`
- `accent`
- `dashed`
- `flagged`
- `state`

Use them semantically:

- `source`: feeds, external systems, ingress points
- `primary`: important mechanism box
- `accent`: the most important box inside a cluster
- `dashed`: supporting step or protocol box
- `flagged`: gated or experimental box
- `state`: persistence or live-state substrate box

## Cluster shape

Clusters create grouped regions with an optional enclosure label.

```json
{
  "id": "core-runtime",
  "slot": "top-left",
  "title": "Query Loop | Conversation Core",
  "accent": "red",
  "variant": "group",
  "enclosure": "Shared runtime for interactive and headless turns",
  "nodes": []
}
```

### Cluster slots

Top row:

- `top-left`
- `top-right`

Second row:

- `mechanism-1`
- `mechanism-2`
- `mechanism-3`
- `mechanism-4`
- `mechanism-5`

The renderer uses the slot to choose placement. Omit a slot only if you also provide a manual layout override.

### Accent colors

Supported values:

- `teal`
- `red`
- `green`
- `orange`
- `blue`
- `yellow`
- `violet`
- `slate`
- `rose`
- `pink`

### Cluster variants

- `group`
- `flagged-group`

## Note panel shape

```json
{
  "title": "Key Architectural Judgments",
  "slot": "right-top",
  "items": [
    {
      "lead": "Message-driven",
      "text": "User input, model output, tool progress, and system events all become transcript messages."
    }
  ]
}
```

Supported note panel slots:

- `right-top`
- `right-middle`

## Annotation shape

Use annotations for tiny side labels, not paragraphs.

```json
{
  "slot": "loop-note",
  "text": "Loop until terminal text response or stop"
}
```

Supported annotation slots:

- `loop-note`
- `tool-note`

## Security bar shape

```json
{
  "title": "Security Boundaries",
  "segments": [
    {
      "label": "User Input",
      "detail": "",
      "accent": "neutral",
      "weight": 0.8
    },
    {
      "label": "Permission Arbitration",
      "detail": "User | Hook | Classifier | Bridge",
      "accent": "warning",
      "weight": 1.0
    }
  ]
}
```

Supported accents:

- `neutral`
- `warning`

## Legend items

```json
[
  { "kind": "solid", "label": "Request flow" },
  { "kind": "loop", "label": "Loop iteration" },
  { "kind": "signal", "label": "Context signal" },
  { "kind": "state", "label": "Persistence" },
  { "kind": "flag", "label": "Gated path" }
]
```

Supported kinds:

- `solid`
- `loop`
- `signal`
- `state`
- `flag`
- `box-flagged`

## Edge shape

```json
{
  "from": "interactive-repl",
  "to": "query-engine",
  "kind": "solid",
  "route": "auto"
}
```

Supported edge kinds:

- `solid`
- `signal`
- `state`
- `loop`
- `flag`

`route` is currently `auto`.

## Modeling guidance

### Good box count targets

- `light`: 10 to 18 boxes
- `medium`: 18 to 30 boxes
- `strong`: 28 to 50 boxes

### Evidence rules

- Every node should have 1 or 2 anchor files.
- Every cluster should correspond to a real mechanism.
- Use short detail strings. If a node needs a paragraph, split it.

### Naming rules

Prefer behavior names:

- `Permission Arbitration`
- `Route Shell And Cache`
- `Task Lifecycle Engine`

Avoid generic ownership labels:

- `utils`
- `helpers`
- `misc services`

## Manual layout overrides

The renderer supports optional per-node or per-cluster `layout` blocks for debugging, but the default skill flow should not use them. Keep the data semantic unless there is a concrete reason to override.
