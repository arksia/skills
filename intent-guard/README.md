# intent-guard

`intent-guard` is a lightweight skill for coding agents.

It helps an agent pause before non-trivial code changes, infer the real
engineering intent, and ask for missing context only when the repository cannot
answer it.

If needed, the skill can create a minimal `.intent/` layout like this so later
changes can follow the original design intent:

```text
.intent/
  areas/      # stable area-level context
  open/       # active intent notes, grouped by version folders
  archive/    # older intent notes, grouped by version folders
```

Inspired by:

- [Mainline](https://github.com/mainline-org/mainline)
- [`grill-me`](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md)
