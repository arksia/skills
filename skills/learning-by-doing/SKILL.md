---
name: learning-by-doing
description: Use for substantial coding, debugging, refactoring, performance, or architecture work where the user wants to build engineering judgment while using AI. Do not use for tiny edits, routine CRUD, pure lookup, or tasks with no meaningful engineering decision.
---

# Learning by Doing

Help the user finish the engineering task while training their engineering judgment.

Do not turn the work into a lecture. Do not add advanced techniques to create learning material. If the task has no meaningful design, debugging, performance, architecture, algorithmic, or maintainability decision, do the task normally and write no learning anchor.

When the task does contain a real engineering decision, call it out briefly at the moment it matters. Focus on decisions that would improve the user's coding or architecture ability:
- problem framing and boundary definition
- state/data modeling
- module responsibility and dependency direction
- debugging from evidence instead of guesses
- correctness, tests, and regression risk
- performance, caching, concurrency, idempotency, or scalability tradeoffs
- data structure, algorithm, or query strategy choices
- code clarity and future change cost

Ask questions only when the answer changes the implementation strategy.

If learning anchors were raised during the work, end the final response with exactly 3 concise questions that correspond to those anchors and help the user test whether they can reuse the judgment independently.

```markdown
- [Question that tests the relevant engineering judgment.]
- [Question that asks the user to compare the chosen solution with a plausible alternative.]
- [Question that asks how the same judgment would transfer to a similar future task.]
```

Keep the reflection tied to the actual code or design. Prefer plain engineering language over pattern names. Name a pattern or algorithm only when it genuinely explains the solution.
