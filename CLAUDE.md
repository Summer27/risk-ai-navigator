# RISK AI NAVIGATOR - context for Claude

Chat UI (Databricks App) for Techcombank's Risk Management Division. Front end
for the Agent Bricks supervisor endpoint `mas-025958-ba-endpoint`. See README.md.

Key facts:
- npm workspaces monorepo: `client/` (React/Vite), `server/` (Express),
  `packages/*` (shared code). Biome for lint/format (2 spaces, single quotes).
- Ephemeral only: `packages/db` is an in-memory no-op stub with the original
  API. There's no database, no Drizzle, no migrations.
- OBO: the server forwards the `x-forwarded-access-token` header as the bearer
  token to the serving endpoint (`packages/ai-sdk-providers/src/providers-server.ts`).
  Scopes are declared in `databricks.yml` -> `user_api_scopes`.
- Offline deploy: `server/tsdown.config.ts` bundles every dependency.
  `scripts/build-offline.mjs` copies builds into `app-dist/`, which is the
  bundle's `source_code_path` and is committed. It has no package.json on purpose.
  After any code change, rerun the script and commit `app-dist/`.
- The bundle uses `engine: direct` (Databricks CLI >= 0.279.0, no Terraform).
- Branding: `client/src/components/brand.tsx`, `client/public/techcombank-logo.png`,
  and red tokens (`--color-tcb-red-*`, `--brand`) in `client/src/index.css`.
- The deployer works on Windows: keep npm scripts cross-platform (use
  `scripts/with-env.mjs`, not `VAR=x cmd`) and keep `deploy.cmd` (CRLF) and `deploy.sh` in sync. The deployer can't use
  PowerShell, so build tooling is plain Node (`scripts/build-offline.mjs`).
- `UI_PREVIEW=true` swaps in a fake user so the UI renders locally without
  Databricks login. Never set it in `app-dist/app.yaml`.
