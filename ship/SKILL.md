---
name: ship
description: Use when the user says "ship", "shipear", "pushear", "subir cambios", "commit y push", "commitear", "hacer commit", "deploy changes", "/ship", or any variation of committing and pushing code. Also handles PR creation to staging and/or master/main when requested.
version: 0.2.0
---

# Ship Skill

Stage, commit, and push all changes in one step. Optionally create pull requests to staging and/or main/master. Optionally verify GitHub Actions status.

## Execution Flow

### Step 1: Analyze Current State

Run these commands in parallel:

1. `git status` — list modified and untracked files
2. `git diff` — show unstaged changes
3. `git diff --staged` — show staged changes
4. `git log --oneline -5` — check recent commit style
5. `git branch --show-current` — get current branch

### Step 2: Verify There Are Changes

If there are no changes (no untracked files, no modifications, no staged changes), inform the user and stop.

### Step 3: Stage All Changes

```bash
git add .
```

### Step 4: Generate Commit Message

Analyze ALL changes and generate a commit message that:

- Is concise (1-2 lines max)
- Describes the **purpose** of the changes (the "why"), not just what files changed
- Follows the style of recent commits in the repo
- Is in the same language as recent commits (default to English if mixed)
- **NEVER** includes `Co-Authored-By` lines
- **NEVER** mentions Claude, Anthropic, AI, or any AI tool
- **NEVER** includes any AI attribution of any kind

### Step 5: Commit

Use HEREDOC format to avoid escaping issues:

```bash
git commit -m "$(cat <<'EOF'
Your commit message here
EOF
)"
```

### Step 6: Push

```bash
git push origin HEAD
```

If push fails because there's no upstream branch:

```bash
git push -u origin HEAD
```

### Step 7: GitHub Actions (verify if requested)

After pushing, check if the user explicitly asked to verify GitHub Actions (e.g., "check the action", "verify CI", "check the pipeline", "ship and verify"). If they did NOT mention it, ask:

> Do you want me to verify the GitHub Action status for this branch?

If the user confirms (or already requested it in their original message):

1. Wait ~15 seconds for the workflow to start
2. Check the workflow run status:
   ```bash
   gh run list --branch <current-branch> --limit 1
   ```
3. If a run is in progress, watch it:
   ```bash
   gh run watch <run-id>
   ```
4. If the run fails, show the logs:
   ```bash
   gh run view <run-id> --log-failed
   ```
5. Report the result to the user:
   - **Success**: inform and continue
   - **Failure**: show failed step logs and ask if the user wants to fix the issue

If the user declines or says no, skip this step entirely.

### Step 8: Pull Requests (only if the user asks)

Only create PRs if the user explicitly mentions "PR", "pull request", "staging", "master", or "main".

**Parse what the user wants:**
- "PR to staging" → create PR to `staging` branch
- "PR to master" / "PR to main" → create PR to `main` branch
- "PR to staging and master" → create BOTH PRs
- "PR" (without specifying base) → ask the user which branch(es)

**For each PR requested:**

```bash
gh pr create --base <target-branch> --title "<short title>" --body "$(cat <<'EOF'
## Summary
- <bullet points describing changes>

## Test plan
- [ ] <testing checklist>
EOF
)"
```

PR rules:
- Title: short (<70 chars), descriptive
- Body: brief summary in bullet points + test plan checklist
- **NEVER** include AI attribution in title or body
- **NEVER** include "Generated with Claude" or similar
- If a PR already exists for the current branch to the target, inform the user and provide the URL

### Step 9: Confirm Result

Show the user:
- Commit hash and message
- Branch pushed to
- GitHub Actions status (if checked)
- PR URLs (if created)

## Important Rules

1. **NEVER** add `Co-Authored-By` or AI attribution anywhere
2. **ALWAYS** run `git add .` (stage everything)
3. **ALWAYS** push after committing
4. If the user provides a specific commit message, use it as-is
5. If push fails for another reason (auth, permissions, etc.), inform the user
6. Never force push
7. Never amend unless the user explicitly asks
8. GitHub Actions verification is **optional** and must be requested or confirmed explicitly
