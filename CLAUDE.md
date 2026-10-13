@AGENTS.md

# Claude Code specifics

Everything in AGENTS.md applies. These notes only add Claude-specific habits.

- Start every task by checking `git status` and the current branch. If you are on `main`, create the task branch before editing anything.
- For anything bigger than a small fix, use plan mode or post a short plan before editing, and wait for approval if the user is present.
- Keep the `Co-Authored-By` trailer Claude Code adds to commits.
- Open pull requests with `gh pr create --fill-first` (or `gh pr create` with the template body). If `gh` is not available, push the branch and give the user the compare link.
- If a hook or CI fails, read the output and fix the root cause. Do not retry the same command hoping it passes, and never bypass the hook.
- Ask before installing or upgrading a dependency.
- Never print, log or echo the contents of `.env.local` or any key, even while debugging.
