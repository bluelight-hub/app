---
allowed-tools: Bash(git worktree:*), Bash(git branch:*), Bash(git switch:*), Bash(git fetch:*), Bash(source scripts/*), Bash(bash scripts/*), Bash(docker compose:*), Bash(docker ps:*), Bash(cd *), Bash(lsof:*), Bash(gh issue view:*)
description: Manages Git worktrees with isolated dev environments (create, teardown, list, ports)
---

# Worktree Management

Manages Git worktrees with fully isolated development environments (own ports, own DB, own .env).

## Commands

The user may say one of:
- **"erstellen" / "create" / "setup" / "neu"** → Create & setup a new worktree
- **"aufräumen" / "teardown" / "remove" / "löschen"** → Tear down a worktree
- **"list" / "zeigen" / "status"** → Show active worktrees and their ports
- **"ports"** → Show ports for the current worktree
- Just a branch name or issue number → Create worktree for that branch

## Create Worktree

1. **Determine the branch.** If the user gives an issue number, create a branch name from it (same logic as `branch-from-issue` skill — lowercase, transliterate umlauts, sanitize). If they give a branch name, use it directly. If the branch doesn't exist yet, create it from the default branch.

2. **Create the worktree:**
   ```bash
   git worktree add /tmp/bluelight-worktree-<branch> <branch>
   ```
   Use `/tmp/bluelight-worktree-<sanitized-branch>` as the default path.

3. **Run setup:**
   ```bash
   cd /tmp/bluelight-worktree-<branch>
   bash scripts/worktree-setup.sh
   ```

4. **Report back** with:
   - Worktree path
   - Assigned ports (Frontend, Backend, DB)
   - How to start: `cd <path> && pnpm dev:web`
   - How to tear down: `cd <path> && bash scripts/worktree-teardown.sh --volumes`

## Teardown Worktree

1. **Determine which worktree.** If the user specifies a path or branch, use it. Otherwise, if the current directory is a worktree, use that. If ambiguous, list worktrees and ask.

2. **Run teardown:**
   ```bash
   cd <worktree-path>
   bash scripts/worktree-teardown.sh --volumes
   ```

3. **Remove the worktree:**
   ```bash
   cd <main-repo>
   git worktree remove <worktree-path>
   ```

4. **Report** that the worktree and its Docker resources have been cleaned up.

## List Worktrees

1. **Show all worktrees with their ports:**
   ```bash
   git worktree list
   ```

2. For each worktree (except the main one), source `scripts/worktree-ports.sh` and show the assigned ports:
   ```bash
   source scripts/worktree-ports.sh
   OFFSET=$(calculate_port_offset "<worktree-path>")
   get_ports "$OFFSET"
   ```

3. Show running Docker containers:
   ```bash
   docker ps --filter "name=bluelight-hub" --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
   ```

## Show Ports

For the current directory:
```bash
source scripts/worktree-ports.sh
WORKTREE_ID="$(get_worktree_id)"
OFFSET="$(calculate_port_offset "$WORKTREE_ID")"
get_ports "$OFFSET"
echo "Compose Project: $(get_compose_project_name "$WORKTREE_ID")"
```

## Edge Cases

- If `scripts/worktree-setup.sh` doesn't exist (old branch), tell the user to cherry-pick or checkout from a branch that has the worktree scripts.
- If ports are already in use, the setup script will detect and abort — relay the error clearly.
- If the user tries to teardown the main worktree, warn them and don't proceed.
- Always use `--volumes` on teardown to clean up DB data (worktree DBs are ephemeral).
