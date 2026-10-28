# Releasing to staging

`scripts/release-staging.sh` releases reviewed frontend changes to staging. It doesn't deploy anything itself: it commits what you staged, pushes it to `main`, and the existing **Frontend CI/CD** workflow (CI, then Docker Build, then Deploy to Staging) does the deployment. The script then follows that workflow and checks https://staging.royalis.tech.

## Requirements

- Linux with Bash 4.4 or later, plus `git`, `curl`, `flock` (util-linux), `grep` with `-P`, `sed`, `awk` and `mktemp`.
- Node.js and npm, with dependencies installed (`npm ci`). Playwright browsers must be installed (`npx playwright install chromium`).
- GitHub CLI `gh`, signed in as an account that can read `Royal1322tech/web-app` Actions (`gh auth login`).
- SSH or HTTPS push access to `git@github.com:Royal1322tech/web-app.git`, using this repository's own Royal1322tech identity.
- Port 4173 free. The Playwright suite starts its own preview server there.

To make the script executable after a fresh clone:

```bash
chmod +x scripts/release-staging.sh
```

## 1. Review and stage your changes

The script never stages files for you. Look at what changed, then stage exactly the files that belong in the release:

```bash
git status
git diff                      # review each change
git add src/features/... tests/...   # list files explicitly; never `git add .` or `git add -A`
git diff --cached --stat      # confirm the staging area
```

Anything left unstaged or untracked, such as `.mcp.json`, stays exactly as it is and is listed as "Not included".

## 2. Run the release

```bash
./scripts/release-staging.sh "style: refine Royal Vacation UI"
```

If you leave out the message, the script asks for one before committing.

The script asks you to type `release` twice:

1. after it shows the staged files, before validation starts;
2. after validation passes, showing the commit message and target, before it commits and pushes.

Any other answer cancels the release, and nothing is committed or pushed.

Useful options:

| Option | What it does |
|---|---|
| `--check-only` | Checks the environment and the staged files, then stops. Fast; good to run first. |
| `--dry-run` | Runs every check and the full validation, then stops before committing. |
| `--clean-install` | Runs `npm ci` before validation. This replaces `node_modules`, so stop dev servers first. |

## What the script checks

**Environment.** It refuses to continue (exit 2) unless all of these hold:

- it runs inside this repository, with `origin` pointing to `Royal1322tech/web-app`;
- the current branch is `main`, and HEAD is not detached;
- no merge, rebase, cherry-pick or revert is in progress, and there are no unresolved conflicts;
- local `main` is identical to `origin/main` (not behind, ahead or diverged);
- `gh` is signed in, and no Frontend CI/CD run is already in progress.

A lock also prevents two releases from running at once (exit 9).

**Staged changes.** It refuses (exit 3) when:

- nothing is staged;
- a file has unstaged edits on top of staged ones;
- a staged file is sensitive: `.mcp.json`, `.env*` other than `.env.example`, SSH keys, `*.pem`/`*.key` and similar, `credentials`/`secrets` files, `.npmrc` or `.netrc`;
- the staged diff adds text that looks like a private key or access token.

**Validation.** It uses the scripts defined in `package.json` and stops at the first failure (exit 4):

1. dependency check (`npm ls`), or `npm ci` with `--clean-install`;
2. `npm run lint`;
3. `npm run typecheck`;
4. `npm run build`;
5. `npm run test:e2e`, the full Playwright suite with its own configuration.

It never stops a process it didn't start. If port 4173 is already in use, it fails instead.

**Before committing**, it checks again that `origin/main`, HEAD and the staged files did not change while validation ran.

**Commit and push.** It commits only the staged files and runs a normal `git push origin HEAD:main`, never a force-push. If the push is rejected (exit 6), the commit stays local and nothing is deployed.

**Deployment.** It finds the Frontend CI/CD run for the exact pushed commit and waits for it. It requires all three jobs (CI, Docker Build and Deploy to Staging) to succeed (exit 7 otherwise). It also confirms that the Deploy to Staging log shows the image `sha-<commit>` being deployed.

## How staging is verified

Staging has no version endpoint, so the script checks the deployed version in two independent ways:

- **Deploy log.** The Deploy to Staging job must log the image tagged with the pushed commit, and pass its own check that the commit is still the latest `main`.
- **Bundle match.** The production build is deterministic, and the main bundle name (`/assets/index-<hash>.js`) is derived from its content. The script builds the release commit locally and requires staging to serve the same bundle name.

It then checks that key routes return 200 and runs `scripts/staging-smoke.mjs`. That smoke test signs in with the public frontend demo account, opens search, hotel details, My Bookings, booking details, voucher and wallet, checks mobile overflow, and fails on any browser error. It never submits bookings, payments or requests.

You can run the smoke test on its own at any time:

```bash
node scripts/staging-smoke.mjs https://staging.royalis.tech
```

If verification fails after a successful workflow, the script exits 8. Investigate before announcing the release; don't redeploy by hand.

## Exit codes

| Code | Meaning | What to do |
|---|---|---|
| 0 | Released and verified | Nothing |
| 1 | Usage error or unexpected failure | Read the message and the line number |
| 2 | Environment check failed | Fix the reported condition (branch, sync, remote, auth, in-progress run) |
| 3 | Staged changes rejected | Unstage sensitive files or remove secret-like text |
| 4 | Validation failed | Read the log printed at the end; fix the code. Don't skip tests |
| 5 | Cancelled | Nothing was committed or pushed |
| 6 | Commit or push failed | The commit exists only locally. Resolve the cause; never force-push |
| 7 | Workflow failed or could not be monitored | Open the run URL; fix the failing job and release again |
| 8 | Staging verification failed | Check the bundle and smoke-test output |
| 9 | Another release is running | Wait for it to finish |

Logs for each run are written to a temporary directory, printed as `Logs:` at the start of validation.
