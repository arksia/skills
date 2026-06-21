---
name: how-to-review
description: Write a short reviewer guide after coding work is done. Use when finishing a bug fix, feature, refactor, or performance change and you want the final summary to help a human review the change quickly and accurately.
---

Write a reviewer guide after the implementation is done to help a human review the change, not to do the review itself.

Start from the real change. Read `git diff`, the changed files, and only the smallest surrounding context needed.

Lead with a review order so the reviewer knows where to look first.

Organize the guide around the reviewer's job: whether the stated goal looks fully implemented, what existing behavior may have been affected, and what boundary or compatibility cases deserve attention.

Include only the minimum complete logic blocks needed for review.

For each block, show the file, the smallest complete code snippet, what requirement it covers, what changed, and what the reviewer should inspect closely.

Keep every claim tied to concrete code evidence. If something is an inference, say so.

Do not:
- write a generic change summary
- ignore the diff and only describe final code
- paste large unrelated code regions
- imply the change is correct, safe, or verified
- present guesses as facts
