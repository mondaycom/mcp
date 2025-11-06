# Automated Version Bumping

This repository uses automated version bumping based on Pull Request labels. When you merge a PR, the version will be automatically bumped and a new release will be created.

## How it Works

### Version Control with Labels

Add one of these labels to your Pull Request to control the version bump:

- **`bump:major`** - For breaking changes (1.0.0 → 2.0.0)
- **`bump:minor`** - For new features (1.0.0 → 1.1.0)  
- **`bump:patch`** - For bug fixes (1.0.0 → 1.0.1)

### Default Behavior

If no bump label is added, the version will be bumped as a **patch** release by default.

### What Happens When You Work

#### 1. During PR Review (Preview)

- **Workflow**: "Version Check"
- **Trigger**: When you add a bump label
- **Action**: Shows a preview comment of what version will be bumped
- **Note**: This is just a preview - nothing is actually changed!

#### 2. After PR Merge (Actual Release)

- **Workflow**: "Release"
- **Trigger**: When PR is merged to master
- **Actions**:
  - Updates all package.json files with new version
  - Creates git tag (e.g., `v1.2.3`)
  - Creates GitHub release
  - Triggers NPM publish

## Workflow Examples

### Adding a New Feature

```
1. Create PR with your feature
2. Add label: `bump:minor`
3. See preview comment: "1.0.0 → 1.1.0"
4. Merge PR
5. "Release" workflow runs automatically
```

### Fixing a Bug

```
1. Create PR with your fix
2. Add label: `bump:patch` (or no label)
3. See preview comment: "1.1.0 → 1.1.1"  
4. Merge PR
5. "Release" workflow runs automatically
```

### Breaking Change

```
1. Create PR with breaking change
2. Add label: `bump:major`
3. See preview comment: "1.1.1 → 2.0.0"
4. Merge PR
5. "Release" workflow runs automatically
```

## Manual Override

You can also manually trigger publishing by:

1. Going to Actions → "Publish Package to NPM"
2. Clicking "Run workflow"
3. This will publish the current versions without bumping

## Skipping Releases

To merge changes without creating a release, don't add any bump labels and include `[skip ci]` in your commit message.

## Monorepo Behavior

This setup treats all packages as a unified version. When any package changes, all packages get the same new version number. This ensures consistency across the monorepo.

### Current Packages

- `@mondaydotcomorg/agent-toolkit`
- `@mondaydotcomorg/monday-api-mcp`
- Root package: `monday-ai`

## Workflow Summary

| Workflow Name | When It Runs | What It Does |
|---------------|--------------|--------------|
| **Version Check** | PR labeled with `bump:*` | Shows preview comment |
| **Release** | PR merged to master | Actually bumps version & releases |
| **Publish Package to NPM** | Tag created or manual trigger | Publishes to NPM |
