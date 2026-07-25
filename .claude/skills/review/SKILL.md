---
name: review
description: Use after any code change, before presenting results to the user.
---

# review

After any code change, and before presenting results to the user, produce the following output.

## Plain English block (always first)

Short bullets — no code, no jargon. One bullet per file changed, describing each change the way a non-developer would.

## Five-part report

1. **What it does** — one or two plain sentences.
2. **Safety read** — 3 to 4 sentences covering exactly what files it touches, reads, writes, or deletes; any network calls or new dependencies; and whether anything is destructive or irreversible.
3. **What it is reporting** — plain terms.
4. **Verdict** — proceed or don't. Make the call.
5. **Next action** — the exact next click or command.

## Constraints

- Never add an npm dependency without flagging it in section 2 (Safety read).
- Never delete a file without naming it.
