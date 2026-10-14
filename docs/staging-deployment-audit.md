# Staging deployment audit — 2026-10-14

## Verified result

At inspection, staging already served the latest frontend assets. No deployment or configuration fix was necessary.

- Local branch: `main`.
- Local HEAD, local `origin/main`, and live `git ls-remote origin refs/heads/main`: `f357ae05a319836a44f0a617268077db13b44890`.
- All 57 JavaScript/CSS files in local `dist/assets` matched staging byte-for-byte (SHA-256).
- A fresh successful `npm run build` from this source produced the same entry asset again.
- Entry: `index-BGAe7kZk.js`, SHA-256 `c30a2befab1a3046b34b5f6931c14958ed7b8601f13d59d57483f96c9b35152b`.
- Staging HTML: `Cache-Control: no-cache`, `CF-Cache-Status: DYNAMIC`, Last-Modified `Wed, 14 Oct 2026 20:02:23 GMT`.
- Fresh Chromium at 768px: preference popup x=8, width=324, horizontal correction=37.5px. `/contact` displayed “Get in Touch With Us” and two store badges. No JavaScript page errors, zero registered service workers in this fresh browser context.

The observation that staging was outdated could not be reproduced. Deployment timing or an already-open browser tab are possible explanations, not proven causes. Assets establish frontend equivalence; there is no public deployed-commit endpoint, and the remote container revision was not inspected.

## Existing pipeline

1. `.github/workflows/frontend-ci.yml`: main pushes / PRs run install, lint, TypeScript, Vite build and browser checks. CI alone does not deploy.
2. `.github/workflows/frontend-docker.yml`: successful main push CI triggers Docker Build. It checks out the upstream tested SHA and publishes `ghcr.io/royal1322tech/web-app:sha-<SHA>`.
3. `.github/workflows/frontend-deploy.yml`: successful Docker workflow triggers Auto Deploy. It checks that the release SHA is still latest main, configures SSH using the existing secret and known-host variable, and calls the existing staging frontend deployment script with that SHA.

The source contains the staging SSH target and `/opt/royal-travel/staging-frontend/scripts/deploy.sh` invocation. The remote script, Compose configuration, reverse proxy configuration and running container state are not in this repository. They were not changed or accessed. Docker builds to `/app/dist` and copies it into `/usr/share/nginx/html`; nginx serves that directory with SPA fallback, revalidated HTML and immutable-by-filename hashed assets.

GitHub Actions API inspection was unavailable with the configured CLI authentication; no Royal1322tech OAuth token was available. SSH Git access did confirm live main. No credentials or account settings were changed. Individual run conclusions beyond the user's supplied CI result were not independently verified through the API.

## Safe procedure if deployment later stalls

No publication action is needed for the verified current assets. For a future mismatch, using the authorized Royal1322tech account:

1. Open https://github.com/Royal1322tech/web-app/actions and locate the main push CI run for the intended SHA.
2. Check the corresponding **Frontend Docker Build**, then **Frontend Auto Deploy**. Wait for both to finish; CI green alone is insufficient.
3. Inspect the failed step's logs before changing configuration. A release rejected as no longer latest main should not be redeployed; inspect the newest main chain instead.
4. After owner approval, rerun the failed workflow from its Actions page. Rerunning CI can trigger image publication and automatic deployment, so it is also a deployment action. These workflows have no workflow_dispatch trigger; do not invent a manual dispatch command.
5. If only the server-side script fails, obtain read access to that exact script and its frontend service configuration before proposing any Docker/Compose or restart command. Do not guess container names, directories or backend commands.

For future local changes, review and commit only intended files and obtain approval before `git push origin main`; that push automatically starts the deployment chain. Never force push. Preserve the existing untracked `src/components/ui/popover.tsx.bak` rather than adding it to a release.

## Verify after an approved release

- Compare `git rev-parse HEAD` with `git ls-remote origin refs/heads/main`.
- Confirm all three Actions runs reference the intended SHA and completed successfully.
- Build the intended source using the lockfile, request staging HTML with `curl -fsS -D - https://staging.royalis.tech/`, then compare referenced hashed assets and SHA-256 bytes with the local build.
- Open staging in a fresh/private browser and check the changed feature. For this release, the 768px popup must remain in bounds and the new contact page/store badges must appear.
- Exact remote container revision verification requires the existing deployment script/container inspection or a future explicit build-version marker; asset equality should not be described as remote container inspection.

Only this audit document was added by this task. No push, deployment, restart, cache purge, backend change or production access was performed.
