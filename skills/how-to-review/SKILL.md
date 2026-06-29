---
name: how-to-review
description: Write a short reviewer guide after coding work is done. Use when finishing a bug fix, feature, refactor, or performance change.
---

Write a reviewer guide after the implementation is done to help me review the change.

Start from the real change. Read `git diff`, the changed files, and only the smallest surrounding context needed.

Organize the guide around the reviewer's job: whether the stated goal looks fully implemented, what existing behavior may have been affected, and what boundary or compatibility cases deserve attention.

Include only the minimum complete logic blocks needed for review.

For each block, include:
- the file path and its role in the codebase
- the smallest code snippet that provides enough context to understand the implemented
- why it was implemented this way

Do not:
- write a generic change summary
- ignore the diff and only describe final code
- paste large unrelated code regions
- imply the change is correct, safe, or verified
- present guesses as facts
