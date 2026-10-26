# Royal Vacation frontend

This is the only active frontend: React, Vite, strict TypeScript, Tailwind CSS 4, React Router, React Hook Form and Zod. Do not reintroduce Next.js or a parallel application.

Preserve supplied designs, fixtures and original assets. Do not invent backend contracts. Public Vite environment variables must not contain secrets.

Use `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build` and `npm run test:e2e`. Build before browser tests. Read `README.md` for workflow and frontend-only limitations.

The only GitHub target is `git@github.com:Royal1322tech/web-app.git`, branch `main`, using Royal1322tech authentication and repository-local identity. Do not use or modify other projects' credentials. Never force push or delete the old source directory without explicit owner confirmation.

Deployment uses one workflow, `.github/workflows/frontend-cicd.yml` (Frontend CI/CD). Each push to `main` starts one run with three sequential jobs: CI, Docker Build and Deploy to Staging. Each job runs only if the previous job succeeds. Pull requests run CI only and never build images or deploy. Never push or deploy without the owner's explicit approval. Preserve the existing security and deployment safeguards: secrets, SSH host-key checking, the latest-`main` check, the deployment concurrency group, the image naming and the staging health check.
