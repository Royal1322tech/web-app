#!/usr/bin/env bash
# Royal Vacation — safe staging release.
#
# Releases the changes you have already reviewed and staged (git add <file>...) to `main`, then
# follows the existing "Frontend CI/CD" workflow (CI → Docker Build → Deploy to Staging) and
# verifies https://staging.royalis.tech. It never stages files itself, never force-pushes and
# never deploys by hand: the push to `main` is what starts the deployment.
#
# Usage:
#   scripts/release-staging.sh [options] ["commit message"]
#
# Options:
#   --check-only   Run the environment and staged-change checks, then stop (no validation, no commit).
#   --dry-run      Run every check and the full validation, then stop before committing.
#   --clean-install  Run `npm ci` before validation (replaces node_modules; stop dev servers first).
#   -h, --help     Show this help.
#
# Exit codes:
#   0 success · 1 usage/unexpected error · 2 environment check failed · 3 staged changes rejected
#   4 validation failed · 5 cancelled by the user · 6 commit or push failed
#   7 GitHub Actions failed or could not be monitored · 8 staging verification failed
#   9 another release is already running
#
# See docs/release-staging.md.

set -Eeuo pipefail

readonly EXPECTED_REPO="Royal1322tech/web-app"
readonly TARGET_BRANCH="main"
readonly REMOTE="origin"
readonly WORKFLOW_NAME="Frontend CI/CD"
readonly REQUIRED_JOBS=("CI" "Docker Build" "Deploy to Staging")
readonly STAGING_URL="https://staging.royalis.tech"
readonly PLAYWRIGHT_PORT=4173
readonly CONFIRM_WORD="release"

# Files that must never be released from this script. Matched against each staged path.
readonly FORBIDDEN_PATTERNS=(
  '(^|/)\.mcp\.json$'
  '(^|/)\.env$'
  '(^|/)\.env\.(?!example$)[^/]+$'
  '(^|/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$'
  '\.(pem|key|p12|pfx|keystore|jks)$'
  '(^|/)(credentials|secrets?)(\.[a-z]+)?$'
  '(^|/)\.npmrc$'
  '(^|/)\.netrc$'
)
# Content that looks like a secret in the staged diff (added lines only).
readonly SECRET_CONTENT_PATTERN='-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{32,}'

MODE="release"
CLEAN_INSTALL=0
COMMIT_MESSAGE=""

LOG_DIR=""
RELEASE_SHA=""
RUN_URL=""
declare -A RESULT=()
WARNINGS=()

# ---------------------------------------------------------------------------- output helpers
if [[ -t 1 ]]; then BOLD=$'\e[1m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; RESET=$'\e[0m'
else BOLD=""; RED=""; GREEN=""; YELLOW=""; RESET=""; fi
step() { printf '\n%s==> %s%s\n' "$BOLD" "$*" "$RESET"; }
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$*"; WARNINGS+=("$*"); }
fail() { local code=$1; shift; printf '\n%sERROR:%s %s\n' "$RED" "$RESET" "$*" >&2; exit "$code"; }

usage() { sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; }

on_error() {
  local code=$? line=$1
  printf '\n%sERROR:%s unexpected failure at line %s (exit %s). Nothing further was done.\n' "$RED" "$RESET" "$line" "$code" >&2
  exit 1
}
trap 'on_error $LINENO' ERR

# Reads one answer from the terminal (or stdin when no terminal exists). Empty or EOF means "no".
ask() {
  local prompt=$1 reply=""
  printf '%s' "$prompt" >&2
  if ! IFS= read -r reply; then reply=""; fi
  printf '%s' "$reply"
}

confirm_release() {
  local question=$1 reply
  reply=$(ask "$question Type '${CONFIRM_WORD}' to continue, anything else cancels: ")
  [[ "$reply" == "$CONFIRM_WORD" ]] || fail 5 "Cancelled. Nothing was committed or pushed."
}

# ---------------------------------------------------------------------------- arguments
while (($#)); do
  case "$1" in
    --check-only) MODE="check" ;;
    --dry-run) MODE="dry-run" ;;
    --clean-install) CLEAN_INSTALL=1 ;;
    -h|--help) usage; exit 0 ;;
    --) shift; COMMIT_MESSAGE="${*:-}"; break ;;
    -*) usage >&2; fail 1 "Unknown option: $1" ;;
    *) [[ -z "$COMMIT_MESSAGE" ]] || fail 1 "Pass the commit message as one quoted argument."; COMMIT_MESSAGE=$1 ;;
  esac
  shift
done

# ---------------------------------------------------------------------------- A. environment
step "Checking the environment"

for cmd in git node npm npx curl grep sed awk flock mktemp; do
  command -v "$cmd" >/dev/null 2>&1 || fail 2 "Required command not found: $cmd"
done
if [[ "$MODE" == "release" ]]; then
  command -v gh >/dev/null 2>&1 || fail 2 "GitHub CLI (gh) is required to monitor the deployment."
fi
ok "Required commands are available"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || fail 2 "Run this script inside the Royal Vacation repository."
cd "$REPO_ROOT"
[[ -f package.json && -f .github/workflows/frontend-cicd.yml ]] || fail 2 "This does not look like the Royal Vacation frontend repository."

# Only one release at a time. The lock is released automatically when the script exits.
exec 9>"$(git rev-parse --git-path release-staging.lock)"
flock -n 9 || fail 9 "Another release-staging.sh run is in progress."
ok "Release lock acquired"

remote_url=$(git remote get-url "$REMOTE" 2>/dev/null) || fail 2 "Remote '$REMOTE' is not configured."
remote_repo=$(sed -E 's#^(git@github\.com:|ssh://git@github\.com/|https://github\.com/)##; s#\.git$##' <<<"$remote_url")
[[ "$remote_repo" == "$EXPECTED_REPO" ]] || fail 2 "Remote '$REMOTE' is $remote_url; expected github.com/$EXPECTED_REPO."
ok "Remote $REMOTE → $EXPECTED_REPO"

git symbolic-ref -q HEAD >/dev/null || fail 2 "HEAD is detached. Check out '$TARGET_BRANCH' first."
branch=$(git symbolic-ref --short HEAD)
[[ "$branch" == "$TARGET_BRANCH" ]] || fail 2 "Current branch is '$branch'; releases go from '$TARGET_BRANCH'."
ok "On branch $TARGET_BRANCH"

git_dir=$(git rev-parse --git-dir)
for state in MERGE_HEAD REBASE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
  [[ ! -e "$git_dir/$state" ]] || fail 2 "A merge, rebase, cherry-pick or revert is in progress. Finish or abort it first."
done
[[ -z "$(git diff --name-only --diff-filter=U)" ]] || fail 2 "There are unresolved merge conflicts."
ok "No merge, rebase or conflicts in progress"

git fetch --quiet "$REMOTE" "$TARGET_BRANCH" || fail 2 "Could not fetch $REMOTE/$TARGET_BRANCH (check network and Git authentication)."
local_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse "$REMOTE/$TARGET_BRANCH")
if [[ "$local_sha" != "$remote_sha" ]]; then
  if git merge-base --is-ancestor HEAD "$REMOTE/$TARGET_BRANCH"; then
    fail 2 "Local $TARGET_BRANCH is behind $REMOTE/$TARGET_BRANCH. Update it (git pull --ff-only) and review again."
  elif git merge-base --is-ancestor "$REMOTE/$TARGET_BRANCH" HEAD; then
    fail 2 "Local $TARGET_BRANCH has commits that are not on $REMOTE/$TARGET_BRANCH. Release only from a synchronized branch."
  else
    fail 2 "Local $TARGET_BRANCH and $REMOTE/$TARGET_BRANCH have diverged."
  fi
fi
ok "Local $TARGET_BRANCH matches $REMOTE/$TARGET_BRANCH (${local_sha:0:7})"

if [[ "$MODE" == "release" ]]; then
  gh auth status --hostname github.com >/dev/null 2>&1 || fail 2 "GitHub CLI is not authenticated (run: gh auth login)."
  active=$(gh run list --repo "$EXPECTED_REPO" --workflow "$WORKFLOW_NAME" --branch "$TARGET_BRANCH" \
    --json status --jq '[.[] | select(.status != "completed")] | length' 2>/dev/null) || fail 2 "Could not query GitHub Actions."
  [[ "$active" == "0" ]] || fail 2 "A '$WORKFLOW_NAME' run is already in progress on $TARGET_BRANCH. Wait for it to finish."
  ok "GitHub CLI authenticated; no '$WORKFLOW_NAME' run in progress"
fi

# ---------------------------------------------------------------------------- B. changes
step "Reviewing changes"

mapfile -t staged < <(git diff --cached --name-only)
mapfile -t unstaged < <(git diff --name-only)
mapfile -t untracked < <(git ls-files --others --exclude-standard)

echo "  Staged for this release (${#staged[@]}):"
git diff --cached --name-status | sed 's/^/    /'
if ((${#unstaged[@]} || ${#untracked[@]})); then
  echo "  Not included — left exactly as they are:"
  for f in "${unstaged[@]}"; do printf '    modified   %s\n' "$f"; done
  for f in "${untracked[@]}"; do printf '    untracked  %s\n' "$f"; done
fi

((${#staged[@]})) || fail 3 "Nothing is staged. Review your changes and stage them explicitly: git add <file>..."

# Files with both staged and unstaged edits would be released only partially.
partial=()
for f in "${staged[@]}"; do
  if printf '%s\n' "${unstaged[@]}" | grep -qxF -- "$f"; then partial+=("$f"); fi
done
((${#partial[@]} == 0)) || fail 3 "These files have unstaged edits on top of staged ones: ${partial[*]}. Stage or discard them first."

forbidden=()
for f in "${staged[@]}"; do
  for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if grep -qP -- "$pattern" <<<"$f"; then forbidden+=("$f"); break; fi
  done
done
((${#forbidden[@]} == 0)) || fail 3 "Refusing to release sensitive files: ${forbidden[*]}. Unstage them: git restore --staged <file>"

if git diff --cached -U0 --no-color | grep -E '^\+[^+]' | grep -qP -- "$SECRET_CONTENT_PATTERN"; then
  fail 3 "The staged changes contain text that looks like a private key or access token. Remove it before releasing."
fi
ok "No sensitive files or secret-like content staged"

echo
git diff --cached --stat | tail -n 1 | sed 's/^/  /'

if [[ "$MODE" == "check" ]]; then
  step "Check-only mode: environment and staged changes look releasable. Nothing was validated, committed or pushed."
  exit 0
fi

confirm_release "Release exactly the ${#staged[@]} staged file(s) listed above?"

# ---------------------------------------------------------------------------- C. validation
step "Running validation"

LOG_DIR=$(mktemp -d "${TMPDIR:-/tmp}/release-staging.XXXXXX")
echo "  Logs: $LOG_DIR"

has_script() { node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$1"; }

run_check() {
  local name=$1; shift
  local log="$LOG_DIR/${name// /-}.log"
  printf '  … %s\n' "$name"
  if "$@" >"$log" 2>&1; then
    RESULT[$name]="passed"; ok "$name passed"
  else
    RESULT[$name]="FAILED"
    echo "  Last lines of $log:" >&2
    tail -n 40 "$log" | sed 's/^/    /' >&2
    fail 4 "$name failed. Nothing was committed or pushed."
  fi
}

if ((CLEAN_INSTALL)); then
  run_check "npm ci" npm ci
else
  run_check "Dependency check" npm ls --depth=0
fi

has_script lint || fail 4 "package.json has no 'lint' script."
run_check "ESLint" npm run lint
if has_script typecheck; then run_check "TypeScript" npm run typecheck
else run_check "TypeScript" npx tsc --noEmit; fi
has_script build || fail 4 "package.json has no 'build' script."
run_check "Production build" npm run build

# The bundle name is content-hashed, so the same commit always produces the same name. It is
# compared with what staging serves after the deployment.
EXPECTED_BUNDLE=$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' dist/index.html | head -n 1 || true)
[[ -n "$EXPECTED_BUNDLE" ]] || warn "Could not read the main bundle name from dist/index.html."

has_script test:e2e || fail 4 "package.json has no 'test:e2e' script."
# Playwright's own web server needs this port; never stop a process this script did not start.
if (exec 3<>"/dev/tcp/127.0.0.1/$PLAYWRIGHT_PORT") 2>/dev/null; then
  fail 4 "Port $PLAYWRIGHT_PORT is in use. Playwright starts its own preview there; stop that process yourself and retry."
fi
run_check "Playwright" npm run test:e2e
e2e_summary=$(grep -E '^\s+[0-9]+ (passed|failed|skipped|flaky|did not run)' "$LOG_DIR/Playwright.log" | sed 's/^ *//' | paste -sd ',' - || true)
RESULT[Playwright]="passed (${e2e_summary:-see log})"

# Playwright's web server rebuilds dist/ with developer state previews; leave a normal build behind.
npm run build >"$LOG_DIR/final-build.log" 2>&1 || warn "Rebuilding dist/ after the tests failed; see $LOG_DIR/final-build.log"

# ---------------------------------------------------------------------------- D. confirmation
step "Release summary"
cat <<EOF
  Branch:          $branch
  Target:          $REMOTE/$TARGET_BRANCH ($EXPECTED_REPO)
  Base commit:     ${local_sha:0:7}
  Files:           ${#staged[@]}
$(git diff --cached --name-status | sed 's/^/                   /')
  Diff:           $(git diff --cached --stat | tail -n 1)
  ESLint:          ${RESULT[ESLint]}
  TypeScript:      ${RESULT[TypeScript]}
  Build:           ${RESULT[Production build]}
  Playwright:      ${RESULT[Playwright]}
EOF

if [[ "$MODE" == "dry-run" ]]; then
  step "Dry run complete: all checks passed. Nothing was committed or pushed."
  exit 0
fi

if [[ -z "$COMMIT_MESSAGE" ]]; then
  COMMIT_MESSAGE=$(ask "Commit message: ")
fi
[[ -n "${COMMIT_MESSAGE//[[:space:]]/}" ]] || fail 5 "A commit message is required. Nothing was committed."
printf '\n  Commit message:\n%s\n\n' "$(sed 's/^/    /' <<<"$COMMIT_MESSAGE")"

confirm_release "Commit these files and push to $REMOTE/$TARGET_BRANCH? This starts the staging deployment."

# Re-check that nothing changed while validation ran.
git fetch --quiet "$REMOTE" "$TARGET_BRANCH" || fail 6 "Could not re-fetch $REMOTE/$TARGET_BRANCH."
[[ "$(git rev-parse "$REMOTE/$TARGET_BRANCH")" == "$local_sha" ]] || fail 6 "$REMOTE/$TARGET_BRANCH moved during validation. Update and run the release again."
[[ "$(git rev-parse HEAD)" == "$local_sha" ]] || fail 6 "HEAD moved during validation. Run the release again."
mapfile -t staged_now < <(git diff --cached --name-only)
[[ "${staged_now[*]}" == "${staged[*]}" ]] || fail 6 "The staged files changed during validation. Run the release again."

# ---------------------------------------------------------------------------- E. commit and push
step "Committing and pushing"
git commit --quiet -F - <<<"$COMMIT_MESSAGE" || fail 6 "git commit failed."
RELEASE_SHA=$(git rev-parse HEAD)
ok "Committed ${RELEASE_SHA:0:7}"

if ! git push "$REMOTE" "HEAD:refs/heads/$TARGET_BRANCH"; then
  fail 6 "Push was rejected. The commit ${RELEASE_SHA:0:7} exists only locally; nothing was deployed. Resolve the reason above (no force-push)."
fi
ok "Pushed ${RELEASE_SHA:0:7} to $REMOTE/$TARGET_BRANCH"

# ---------------------------------------------------------------------------- F. GitHub Actions
step "Monitoring '$WORKFLOW_NAME'"
run_id=""
for _ in $(seq 1 30); do
  run_id=$(gh run list --repo "$EXPECTED_REPO" --workflow "$WORKFLOW_NAME" --commit "$RELEASE_SHA" \
    --event push --json databaseId --jq '.[0].databaseId // empty' 2>/dev/null || true)
  [[ -n "$run_id" ]] && break
  sleep 10
done
[[ -n "$run_id" ]] || fail 7 "No '$WORKFLOW_NAME' run appeared for ${RELEASE_SHA:0:7} within 5 minutes. Check GitHub Actions; deployment is NOT verified."
RUN_URL=$(gh run view "$run_id" --repo "$EXPECTED_REPO" --json url --jq .url) || fail 7 "Could not read run $run_id."
ok "Run $RUN_URL"

gh run watch "$run_id" --repo "$EXPECTED_REPO" --interval 30 --exit-status >"$LOG_DIR/actions-watch.log" 2>&1 || true
jobs_json=$(gh run view "$run_id" --repo "$EXPECTED_REPO" --json status,conclusion,jobs) || fail 7 "Could not read the job results of $RUN_URL; deployment is NOT verified."
actions_ok=1
for job in "${REQUIRED_JOBS[@]}"; do
  conclusion=$(node -e '
    const run = JSON.parse(process.argv[1]);
    const job = run.jobs.find((j) => j.name === process.argv[2]);
    process.stdout.write(job ? (job.conclusion || job.status) : "missing");' "$jobs_json" "$job")
  RESULT["job:$job"]=$conclusion
  if [[ "$conclusion" == "success" ]]; then ok "$job: success"; else printf '  %s✗%s %s: %s\n' "$RED" "$RESET" "$job" "$conclusion"; actions_ok=0; fi
done
((actions_ok)) || fail 7 "'$WORKFLOW_NAME' did not succeed: $RUN_URL. Staging was not (fully) updated; do not deploy manually."

deploy_job_id=$(gh run view "$run_id" --repo "$EXPECTED_REPO" --json jobs --jq '.jobs[] | select(.name == "Deploy to Staging") | .databaseId' || true)
deploy_log=$(gh run view "$run_id" --repo "$EXPECTED_REPO" --log --job "$deploy_job_id" 2>/dev/null || true)
if grep -q "Deploying ghcr.io/royal1322tech/web-app:sha-$RELEASE_SHA" <<<"$deploy_log" && grep -q "PASS: Latest main commit verified" <<<"$deploy_log"; then
  RESULT[deployed-image]="sha-${RELEASE_SHA:0:7} (deploy job log)"
  ok "Deploy job deployed image sha-${RELEASE_SHA:0:7}"
else
  RESULT[deployed-image]="not confirmed in deploy log"
  warn "Could not confirm the deployed image tag in the Deploy to Staging log."
fi

# ---------------------------------------------------------------------------- G. staging
step "Verifying $STAGING_URL"
staging_ok=1
served_bundle=""
for _ in $(seq 1 12); do
  html=$(curl -fsS --max-time 15 "$STAGING_URL/" 2>/dev/null || true)
  served_bundle=$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' <<<"$html" | head -n 1 || true)
  [[ -n "$EXPECTED_BUNDLE" && "$served_bundle" == "$EXPECTED_BUNDLE" ]] && break
  sleep 5
done
if [[ -z "$served_bundle" ]]; then
  RESULT[revision]="staging did not return the app shell"; staging_ok=0
elif [[ -z "$EXPECTED_BUNDLE" ]]; then
  RESULT[revision]="unverified (no local bundle name; staging serves $served_bundle)"; warn "${RESULT[revision]}"
elif [[ "$served_bundle" == "$EXPECTED_BUNDLE" ]]; then
  RESULT[revision]="matches release build ($served_bundle)"; ok "Staging serves the release bundle $served_bundle"
else
  RESULT[revision]="MISMATCH: staging $served_bundle, release $EXPECTED_BUNDLE"; staging_ok=0
fi

for path in / /welcome /login /bookings /search /wallet; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$STAGING_URL$path" || echo 000)
  if [[ "$code" == "200" ]]; then ok "GET $path → 200"; else printf '  %s✗%s GET %s → %s\n' "$RED" "$RESET" "$path" "$code"; staging_ok=0; fi
done

if node -e 'require.resolve("playwright")' >/dev/null 2>&1; then
  if node scripts/staging-smoke.mjs "$STAGING_URL" >"$LOG_DIR/staging-smoke.log" 2>&1; then
    RESULT[browser-smoke]="passed"; ok "Browser smoke test passed"
  else
    RESULT[browser-smoke]="FAILED"; staging_ok=0
    tail -n 20 "$LOG_DIR/staging-smoke.log" | sed 's/^/    /' >&2
  fi
else
  RESULT[browser-smoke]="not run (Playwright unavailable)"; warn "Browser smoke test skipped: Playwright is not installed."
fi

# ---------------------------------------------------------------------------- H. summary
step "Release summary"
cat <<EOF
  Commit:            $RELEASE_SHA
  Branch:            $TARGET_BRANCH
  Files:             ${#staged[@]}
  ESLint:            ${RESULT[ESLint]}
  TypeScript:        ${RESULT[TypeScript]}
  Build:             ${RESULT[Production build]}
  Playwright:        ${RESULT[Playwright]}
  Actions run:       $RUN_URL
  CI:                ${RESULT[job:CI]}
  Docker Build:      ${RESULT[job:Docker Build]}
  Deploy to Staging: ${RESULT[job:Deploy to Staging]}
  Deployed image:    ${RESULT[deployed-image]}
  Staging revision:  ${RESULT[revision]}
  Browser smoke:     ${RESULT[browser-smoke]}
  Logs:              $LOG_DIR
EOF
echo "  Git status:"
git status --short | sed 's/^/    /'
if ((${#WARNINGS[@]})); then
  echo "  Warnings:"; printf '    - %s\n' "${WARNINGS[@]}"
fi

((staging_ok)) || fail 8 "The workflow succeeded but staging verification failed (see above). Investigate before announcing the release."
step "Release ${RELEASE_SHA:0:7} is live on $STAGING_URL"
