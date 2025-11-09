# How to Revert to an Older Version in GitHub Desktop

## Method 1: Revert a Commit (Safest - Recommended)

This creates a new commit that undoes the changes:

1. **Open GitHub Desktop**
2. **Go to History tab** (left sidebar)
3. **Find the commit** you want to undo
4. **Right-click on the commit** → Select **"Revert this commit"**
5. **Review the changes** in the diff view
6. **Click "Commit revert"** button
7. **Push to origin** to update the remote repository

**Pros**: Safe, doesn't rewrite history, creates a new commit
**Cons**: Creates an additional commit in history

---

## Method 2: Reset to a Specific Commit (More Direct)

This moves your branch pointer back to an older commit:

1. **Open GitHub Desktop**
2. **Go to History tab**
3. **Find the commit** you want to go back to
4. **Right-click on the commit** → Select **"Reset {branch} to this commit"**
5. **Choose reset type**:
   - **Soft Reset**: Keeps all changes staged (ready to commit)
   - **Mixed Reset**: Keeps changes but unstages them (default)
   - **Hard Reset**: Discards all changes (⚠️ **DESTRUCTIVE**)
6. **Click "Reset {branch}"**
7. **Force push** to update remote (GitHub Desktop will warn you)

**Pros**: Clean history, goes back to exact state
**Cons**: Rewrites history (requires force push), can lose uncommitted changes

**⚠️ Warning**: Hard reset will **permanently delete** any uncommitted changes!

---

## Method 3: Create a Branch from Old Commit (Safest for Experimentation)

This creates a new branch from an older commit without affecting your main branch:

1. **Open GitHub Desktop**
2. **Go to History tab**
3. **Find the commit** you want to use as starting point
4. **Right-click on the commit** → Select **"Create branch from commit"**
5. **Enter branch name** (e.g., `restore-old-version`)
6. **Click "Create branch"**
7. **Switch to the new branch** to work with the old code

**Pros**: Doesn't affect main branch, safe to experiment
**Cons**: Creates a new branch (might need to merge later)

---

## Method 4: Revert Multiple Commits

If you need to undo several commits:

1. **Open GitHub Desktop**
2. **Go to History tab**
3. **Find the oldest commit** you want to undo
4. **Revert commits in reverse order** (newest first, then older ones)
   - Right-click each commit → "Revert this commit"
   - Commit each revert
5. **Push all revert commits** to remote

**Note**: Revert commits in reverse chronological order (newest to oldest)

---

## Which Method Should You Use?

### Use **Revert** if:
- ✅ You've already pushed commits to remote
- ✅ Other people are working on the same branch
- ✅ You want to keep history intact
- ✅ You want the safest option

### Use **Reset** if:
- ✅ You haven't pushed yet (or you're okay with force push)
- ✅ You're the only one working on the branch
- ✅ You want a clean history
- ✅ You're okay with rewriting history

### Use **Create Branch** if:
- ✅ You want to experiment with old code
- ✅ You want to keep current work intact
- ✅ You might want to merge changes later
- ✅ You're not sure which method to use

---

## Force Push Warning

If you use **Reset**, you'll need to **force push**:

1. GitHub Desktop will show a warning
2. Click **"Force push origin"** button
3. **⚠️ Warning**: This will overwrite remote history
4. Make sure no one else is working on the branch!

---

## Recovering Lost Changes

If you accidentally reset and lost changes:

1. **Go to History tab**
2. **Look for "Undo" option** in GitHub Desktop (if available)
3. **Or use reflog** (advanced):
   - Open terminal in repository
   - Run: `git reflog`
   - Find the commit you lost
   - Create a branch from it: `git checkout -b recovery-branch <commit-hash>`

---

## Example: Reverting Recent Changes

Let's say you want to undo the last 3 commits:

**Option A - Revert (Safe)**:
1. History → Right-click newest commit → "Revert this commit" → Commit
2. History → Right-click second commit → "Revert this commit" → Commit  
3. History → Right-click third commit → "Revert this commit" → Commit
4. Push all 3 revert commits

**Option B - Reset (Direct)**:
1. History → Right-click the commit before the 3 you want to undo
2. "Reset {branch} to this commit" → Choose "Hard Reset"
3. Force push to remote

---

## Tips

- **Always commit or stash** your current work before resetting
- **Create a backup branch** before making major changes
- **Use revert for shared branches** (safer for teams)
- **Use reset for local experiments** (cleaner history)
- **Check with team** before force pushing to shared branches

---

## Need Help?

If you're unsure which method to use:
1. **Create a backup branch** first: `git branch backup-before-reset`
2. **Try the revert method** (safest)
3. **Test the changes** to make sure they work
4. **Push when ready**

