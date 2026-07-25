---
name: spec
description: Use before writing or editing any code in this repo. Interviews the user to produce a written spec before implementation.
---

# spec

When this skill is invoked, do NOT write any code.

## Behavior

1. Interview the user with up to 5 questions, covering:
   - Which file(s) will change
   - What the user-visible result is
   - What must NOT change
   - Any brand or design constraints
   - How we will verify it worked
2. Write the answers to `specs/<short-name>.md` as a numbered task list, where `<short-name>` is a short kebab-case name for the task.
3. Stop and wait for the user's approval before implementing anything.

## Rules

- No code is written or edited while this skill is running.
- Implementation only begins after the user explicitly approves the written spec.
