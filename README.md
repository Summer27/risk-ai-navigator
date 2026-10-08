# RISK AI NAVIGATOR

AI chat assistant for Techcombank's Risk Management Division, deployed as a
Databricks App. It's a chat front end for the Agent Bricks Multi-Agent
Supervisor endpoint **`mas-025958-ba-endpoint`**, which calls two Genie
spaces as MCP tools.

- **On-behalf-of-user (OBO) authorization.** Every question runs with the
  signed-in user's own Databricks permissions, so users only see the data
  they're allowed to see.
- **Ephemeral chats.** Conversations are kept only in the browser tab. They
  aren't stored anywhere and are gone after a refresh.
- **Offline deployment.** `app-dist/` holds a prebuilt app with every npm
  dependency bundled in. The Databricks workspace never runs `npm install`.
- **No Terraform.** The bundle uses the Databricks CLI's direct deployment engine.

## Repository layout

```
app-dist/          <- what gets deployed (prebuilt, committed)
  app.yaml         <- runtime command: node server/dist/index.mjs
  server/dist/     <- Express server, all dependencies bundled in
  client/dist/     <- React UI (static files)
client/            React + Vite source (UI, Techcombank branding)
server/            Express source (chat streaming, auth headers)
packages/          Shared code (Databricks AI SDK provider, auth, ...)
scripts/
  deploy.cmd        <- Windows (cmd / VS Code terminal): validate + deploy + start
  deploy.sh         <- same for macOS / Linux
  build-offline.mjs <- rebuilds app-dist/ on any OS (needs npm / Nexus access)
  with-env.mjs      <- cross-platform env vars for npm scripts
databricks.yml     Bundle: app name, OBO scopes, endpoint resource
```

## 1. Preview the interface locally

You need Node.js 20 or newer and npm access (public registry or Nexus).

```bash
npm ci

# UI only, no Databricks login needed (chat replies won't work):
npm run preview:ui
# -> open http://localhost:3000

# Full local run against the real agent with your own permissions:
cp .env.example .env               # set DATABRICKS_CONFIG_PROFILE
databricks auth login --profile DEFAULT
npm run dev
# -> open http://localhost:3000
```

To preview exactly what gets deployed. This needs only Node.js, with no
`npm ci`, and works in cmd, the VS Code terminal and bash:

```bat
npm run preview:dist
rem -> open http://localhost:8000   (Ctrl+C to stop)
```

Never set `UI_PREVIEW` on the deployed app. It replaces the real user identity
with a placeholder.

## 2. Rebuild `app-dist/` (only after code changes)

Run this on a machine with npm/Nexus access. It works in cmd, the VS Code
terminal and bash:

```bat
node scripts\build-offline.mjs
git add app-dist
git commit -m "Rebuild app-dist"
```

The script builds the client and server, copies them into `app-dist/`, and
checks that the server starts with **no** `node_modules`.

## 3. Deploy

Prerequisites:

- Databricks CLI **0.279.0 or newer** (`databricks --version`). Terraform isn't needed.
- Logged in: `databricks auth login --host https://<workspace>.cloud.databricks.com --profile DEFAULT`

From the project folder, in cmd or the VS Code terminal (Command Prompt):

```bat
scripts\deploy.cmd DEFAULT
```

On macOS/Linux, run `./scripts/deploy.sh DEFAULT` instead.

This is the same as:

```bash
databricks bundle validate
databricks bundle deploy          # uses engine: direct from databricks.yml
databricks bundle run risk_ai_navigator
```

Because `app-dist/` has no `package.json`, Databricks Apps skips
`npm install` and `npm run build` and starts the app right away with `node`.

## 4. Permissions checklist (OBO)

Because the app acts as each user, **each user** (or a group they belong to)
needs:

| What | Permission |
| --- | --- |
| Serving endpoint `mas-025958-ba-endpoint` | `CAN_QUERY` |
| Both Genie spaces used by the supervisor | `CAN_RUN` (or higher) |
| SQL warehouse used by the Genie spaces | `CAN_USE` |
| Unity Catalog tables behind the Genie spaces | `USE CATALOG`, `USE SCHEMA`, `SELECT` |
| The app `risk-ai-navigator` | `CAN_USE` (grant it in **Compute > Apps > risk-ai-navigator > Permissions**) |

The app requests these user authorization scopes (`databricks.yml` →
`user_api_scopes`): `model-serving`, `genie`, `sql`. If a workspace admin has
turned on **Restrict OAuth scopes for apps**, these three scopes must be on
the allowed list.

If a red banner says scopes are missing, the deployed app doesn't have the
scopes yet. Redeploy, or add them under **App > Edit > User authorization**.
Users may need to sign out and back in to consent to new scopes.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `unknown field: engine` / Terraform download errors | Upgrade the Databricks CLI to 0.279.0 or newer |
| App logs show `npm install` | Make sure `source_code_path` is `./app-dist` and that folder has no `package.json` |
| `403` / permission denied in chat | The user is missing one of the permissions above |
| App name taken | Change `app_name` in `databricks.yml` (max 30 chars, fixed after first deploy) |
| VS Code terminal shows a PowerShell error, or doesn't recognize `scripts\deploy.cmd` | Switch the terminal to Command Prompt (the `+` dropdown, then **Command Prompt**), or run `cmd /c scripts\deploy.cmd DEFAULT` |
| Windows: `databricks` is not recognized | Add the folder that holds `databricks.exe` to your PATH, then open a new terminal |
| UI changes don't show after deploy | You edited `client/`, but didn't run `node scripts\build-offline.mjs` and commit `app-dist/` |
