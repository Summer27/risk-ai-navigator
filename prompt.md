# Prompt: build RISK AI NAVIGATOR from the Databricks `e2e-chatbot-app-next` template

> **How to use this file.** Start a coding agent (e.g. Claude Code) in a fresh
> copy of the Databricks template folder `e2e-chatbot-app-next`
> (from `github.com/databricks/app-templates`, commit `28419d0` or close to it),
> put the Techcombank logo at `client/public/Techcombank_logo_transparent.png`,
> then paste everything below the line as the prompt. Every new file is given
> in full; edits to existing files are described exactly. Follow the steps in
> order and run the verification at the end.

---

You are a senior AI engineer on Databricks. Turn this repository (the Databricks
`e2e-chatbot-app-next` chat template: npm workspaces with `client/` React + Vite,
`server/` Express, `packages/*` shared code) into **RISK AI NAVIGATOR**, a chat
app for Techcombank's Risk Management Division. Implement exactly what is
specified here. Don't add features. Where a step says "replace with", use the
given content byte for byte.

## 1. Requirements and decisions (already agreed, don't re-ask)

| Topic | Decision |
| --- | --- |
| Agent | Agent Bricks **Multi-Agent Supervisor** endpoint `mas-025958-ba-endpoint` (calls two Genie spaces as MCP tools; already works in Playground) |
| App name | `risk-ai-navigator` (exact name, no dev prefix) |
| App description | "AI assistant for Techcombank Risk Management: bank-wide asset quality, credit, market and liquidity risk insights in plain language, using each user's own data permissions." |
| Auth | **On-behalf-of-user (OBO)**: every request runs with the signed-in user's own permissions. Scopes: `model-serving`, `genie`, `sql` |
| Chat history | **Ephemeral**: no database at all. Remove Postgres/Drizzle/Lakebase entirely |
| Chat titles | No second LLM. Title = first words of the user's message (the template used `databricks-meta-llama-3-3-70b-instruct`; remove it) |
| Feedback | Remove (MLflow feedback route + badges) |
| Look | Techcombank logo top-left filling the sidebar width (transparent background, dark-mode variant with white "BANK"), Techcombank red `#D93832` (sampled from the logo), diamond/chevron shapes inspired by the logo, title **RISK AI NAVIGATOR**. Light theme and expanded sidebar by default |
| Subtitle | "Bank-wide asset quality insights, from credit to market and liquidity risk." |
| Example questions | (1) "What is the current NPL ratio bank-wide, and how has it changed over the last 6 months by customer segment?" (2) "Summarize our current market risk position, including any limit breaches this month." (3) "How are our liquidity ratios (LCR and NSFR) trending against regulatory limits?" |
| Deploy engine | Databricks Asset Bundle with the **direct** engine (`bundle.engine: direct`, CLI >= 0.279.0). The work machine has **no Terraform** |
| Offline install | The **Databricks workspace has no internet/npm/Nexus access**. Ship a prebuilt `app-dist/` with every npm dependency bundled in and **no `package.json`**, so Databricks Apps never runs `npm install`. Commit `app-dist/` |
| Developer machine | **Windows, cmd / VS Code terminal only (no PowerShell)**. It can reach a Nexus npm mirror. Scripts must work in cmd; npm scripts must not use `VAR=value cmd` syntax |
| Workspace cloud | AWS |
| Template leftovers | Remove everything not needed for this use case |

## 2. Delete template parts that aren't needed

Run (with `git rm -r` where tracked):

```
tests/  playwright.config.ts  drizzle.config.ts  knip.json  manifest.yaml
packages/db/migrations/  packages/db/src/  (recreated in step 3)
scripts/  (all old scripts: quickstart.sh, deploy.sh, migrate.ts, reset-database.ts,
           get-pghost.sh, get-experiment-id.ts, cleanup-database.sh, start-app.sh)
.claude/skills/quickstart/
client/public/demo-thumbnail.png  "client/public/mouth of the seine, monet.jpg"
client/src/components/DatabricksLogo.tsx
server/src/routes/feedback.ts
app.yaml   (root; the runtime config moves to app-dist/app.yaml)
```

## 3. Replace the database package with an ephemeral stub

Keep the package name `@chat-template/db` and the same exported API so no
imports change, but make it a no-op with no Postgres/Drizzle dependency.

Create `packages/db/src/index.ts`:

```ts
/**
 * Ephemeral storage layer.
 *
 * RISK AI NAVIGATOR runs without a database: conversations live only in the
 * user's browser tab and are gone after a refresh or app restart. This module
 * keeps the original `@chat-template/db` API so the routes stay unchanged,
 * but every persistence call is a no-op.
 */
import type { LanguageModelV3Usage } from '@ai-sdk/provider';
import type { VisibilityType } from '@chat-template/utils';

export interface Chat {
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: 'public' | 'private';
  lastContext: LanguageModelV3Usage | null;
}

export interface DBMessage {
  id: string;
  chatId: string;
  role: string;
  parts: unknown;
  attachments: unknown;
  createdAt: Date;
  traceId: string | null;
}

export function isDatabaseAvailable(): boolean {
  return false;
}

export async function saveChat(_args: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}): Promise<void> {}

export async function deleteChatById(_args: { id: string }): Promise<null> {
  return null;
}

export async function getChatsByUserId(_args: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}): Promise<{ chats: Chat[]; hasMore: boolean }> {
  return { chats: [], hasMore: false };
}

export async function getChatById(_args: { id: string }): Promise<Chat | null> {
  return null;
}

export async function saveMessages(_args: {
  messages: Array<DBMessage>;
}): Promise<void> {}

export async function getMessagesByChatId(_args: {
  id: string;
}): Promise<DBMessage[]> {
  return [];
}

export async function getMessageById(_args: {
  id: string;
}): Promise<DBMessage[]> {
  return [];
}

export async function deleteMessagesByChatIdAfterTimestamp(_args: {
  chatId: string;
  timestamp: Date;
}): Promise<void> {}

export async function updateChatVisiblityById(_args: {
  chatId: string;
  visibility: 'private' | 'public';
}): Promise<void> {}

export async function updateChatTitleById(_args: {
  chatId: string;
  title: string;
}): Promise<void> {}

export async function updateChatLastContextById(_args: {
  chatId: string;
  context: LanguageModelV3Usage;
}): Promise<void> {}
```

In `packages/db/package.json`, set `"dependencies"` to exactly
`{"@ai-sdk/provider": "^3.0.5", "@chat-template/utils": "*"}` and `"files"` to
`["dist"]` (removes drizzle-orm, drizzle-kit, postgres, @chat-template/auth).

## 4. Server changes

### 4.1 `server/src/routes/chat.ts`: remove LLM title generation

- Remove `generateText` from the `import { ... } from 'ai'` list.
- In the `if (!chat) { if (isDatabaseAvailable() && message) { await saveChat(...)` block,
  replace the whole `titlePromise = generateTitleFromUserMessage({ message }).then(...).catch(...);`
  statement with:

```ts
        // Title the chat with the first words of the user's message. This
        // avoids calling a second LLM endpoint the user may not have access to.
        const textFromUserMessage = message.parts.find(
          (part) => part.type === 'text',
        )?.text;
        if (textFromUserMessage) {
          const title = truncatePreserveWords(textFromUserMessage, 80);
          await updateChatTitleById({ chatId: id, title });
          titlePromise = Promise.resolve(title);
        }
```

- Delete the `POST /api/chat/title` route (the JSDoc block `/** POST /api/chat/title ... */`
  and its `chatRouter.post('/title', ...)` handler).
- Delete the `generateTitleFromUserMessage` helper function (keep `truncatePreserveWords`).

### 4.2 `packages/ai-sdk-providers/src/providers-server.ts`

Delete this block inside `OAuthAwareProvider.languageModel`:

```ts
      if (id === 'title-model' || id === 'artifact-model') {
        return provider.chatCompletions(
          'databricks-meta-llama-3-3-70b-instruct',
        );
      }
```

Keep the existing OBO logic unchanged: the provider's `fetch` already uses the
`x-forwarded-access-token` header (forwarded from `server/src/routes/chat.ts`)
as the `Authorization: Bearer` token, and the default endpoint task falls back
to `provider.responses(...)`, which is right for a supervisor agent.

### 4.3 `server/src/index.ts`

- Remove `import { storeMessageMeta } from './lib/message-meta-store';`,
  `import { feedbackRouter } from './routes/feedback';` and
  `app.use('/api/feedback', feedbackRouter);`.
- Change the comment `// Health check endpoint (for Playwright tests)` to `// Health check endpoint`.
- Add `process.env.DATABRICKS_APP_PORT ||` to the port chain so it reads:

```ts
const PORT =
  process.env.CHAT_APP_PORT ||
  process.env.DATABRICKS_APP_PORT ||
  process.env.PORT ||
  (isDevelopment ? 3001 : 3000);
```

- Replace the whole `// Start MSW mock server in test mode` section (the async
  `startServer` with the `PLAYWRIGHT === 'True'` MSW/test-endpoint code) with a
  plain function that only calls `app.listen`:

```ts
function startServer() {
  app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${isDevelopment ? 'development' : 'production'}`);
  });
}

startServer();
```

### 4.4 `server/src/routes/config.ts`

Replace `feedback: !!process.env.MLFLOW_EXPERIMENT_ID,` with `feedback: false,`.

### 4.5 `packages/auth/src/databricks-auth.ts`: local UI preview mode

Replace `const isTestEnvironment = process.env.PLAYWRIGHT === 'True';` with:

```ts
// UI_PREVIEW=true lets you view the interface locally without Databricks login
const isTestEnvironment = process.env.UI_PREVIEW === 'true';
```

(This reuses the template's test short-circuit: a placeholder user, no Databricks
call. It must never be set on the deployed app.)

### 4.6 `server/tsdown.config.ts`: bundle every dependency

Replace with:

```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  unbundle: false,
  // Bundle EVERY dependency (express, ai, zod, ...) into dist/index.mjs.
  // The Databricks App container has no access to npm, so the deployed app
  // must run with plain `node` and no node_modules folder.
  noExternal: [/.*/],
  // Bundled CommonJS packages (e.g. express) call require() for Node
  // built-ins; provide a real require inside the ESM bundle.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
  dts: false,
});
```

The `createRequire` banner is required. Without it, bundled CommonJS packages
(express) fail with "Dynamic require of 'path' is not supported".

### 4.7 `server/package.json`

Change the `start` script to the cross-platform form:

```json
"start": "node ../scripts/with-env.mjs NODE_ENV=production -- node --env-file-if-exists ../.env dist/index.mjs"
```

## 5. Root `package.json`

Replace with exactly (then run `npm install` to regenerate `package-lock.json`):

```json
{
  "name": "risk-ai-navigator",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "client",
    "server",
    "packages/*"
  ],
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm run dev --workspace=@databricks/chatbot-server",
    "dev:client": "npm run dev --workspace=@databricks/chatbot-client",
    "preview:ui": "node scripts/with-env.mjs UI_PREVIEW=true -- npm run dev",
    "build": "npm run build:client && npm run build:server",
    "build:client": "npm run build --workspace=@databricks/chatbot-client",
    "build:server": "npm run build --workspace=@databricks/chatbot-server",
    "start": "npm run start --workspace=@databricks/chatbot-server",
    "lint": "biome lint --write --unsafe",
    "lint:fix": "biome lint --write --unsafe && biome format --write",
    "format": "biome format --write",
    "preview:dist": "node scripts/with-env.mjs NODE_ENV=production PORT=8000 UI_PREVIEW=true -- node app-dist/server/dist/index.mjs"
  },
  "dependencies": {
    "dotenv": "^17.2.3",
    "tsx": "^4.19.1"
  },
  "devDependencies": {
    "@ai-sdk/provider": "^3.0.5",
    "@biomejs/biome": "1.9.4",
    "@types/node": "^22.8.6",
    "concurrently": "^8.2.2",
    "tsdown": "0.15.9",
    "typescript": "^5.9.3"
  },
  "description": "RISK AI NAVIGATOR - AI assistant for Techcombank's Risk Management Division"
}
```

## 6. Branding (client)

### 6.1 Logo files

The user supplies `client/public/Techcombank_logo_transparent.png` (1674×780
8-bit RGBA PNG: red diamonds + "TECHCOM" in `#D93832`, "BANK" in near-black
`#221F20`, transparent background with about 20px padding). Produce two files and
delete the original:

- `client/public/techcombank-logo.png`: the original cropped to its opaque
  bounding box (x 20–1653, y 20–759 → 1634×740).
- `client/public/techcombank-logo-dark.png`: same crop, with every pixel whose
  red channel is < 120 (the dark "BANK" letters) recoloured to white
  `#FFFFFF`, alpha kept. Red pixels stay red.

No image libraries are needed. Save this helper **outside the repo** (e.g. a temp folder) as `png.mjs`:

```js
import fs from 'node:fs'; import zlib from 'node:zlib';
export function decode(file) {
  const b = fs.readFileSync(file); let o = 8, w, h, idat = [];
  while (o < b.length) { const L = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + L);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8 || d[9] !== 6) throw new Error('need 8-bit RGBA'); }
    if (t === 'IDAT') idat.push(d); o += 12 + L; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * 4, px = Buffer.alloc(h * st); let prev = Buffer.alloc(st);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], line = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1)), out = Buffer.alloc(st);
    for (let i = 0; i < st; i++) { const a = i >= 4 ? out[i - 4] : 0, up = prev[i], c = i >= 4 ? prev[i - 4] : 0; let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[i] = v & 255; }
    out.copy(px, y * st); prev = out; }
  return { w, h, px };
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (buf) => { let c = -1; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
export function encode(file, { w, h, px }) {
  const st = w * 4, raw = Buffer.alloc(h * (st + 1));
  for (let y = 0; y < h; y++) { raw[y * (st + 1)] = 0; px.copy(raw, y * (st + 1) + 1, y * st, (y + 1) * st); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
```

and run, from that folder (`P` = the repo's `client/public`):

```bash
node -e '
import("./png.mjs").then(({decode,encode})=>{
const P=process.argv[1];const src=decode(P+"/Techcombank_logo_transparent.png");
const [x0,y0,x1,y1]=[20,20,1653,759];const w=x1-x0+1,h=y1-y0+1,px=Buffer.alloc(w*h*4);
for(let y=0;y<h;y++)src.px.copy(px,y*w*4,((y+y0)*src.w+x0)*4,((y+y0)*src.w+x1+1)*4);
encode(P+"/techcombank-logo.png",{w,h,px});
const d=Buffer.from(px);for(let i=0;i<d.length;i+=4){if(d[i]<120){d[i]=d[i+1]=d[i+2]=255}}
encode(P+"/techcombank-logo-dark.png",{w,h,px:d});})' "<repo>/client/public"
```

(If the supplied logo has different dimensions, compute the bounding box of
pixels with alpha > 8 and crop to that instead.)

Create `client/public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 66"><rect width="66" height="66" rx="12" fill="#fff"/><path fill="#d93832" d="M22 11 33 22 22 33 33 44 22 55 0 33ZM44 11 66 33 44 55 33 44 44 33 33 22Z"/></svg>
```

### 6.2 Brand components

Create `client/src/components/brand.tsx`:

```tsx
import { cn } from '@/lib/utils';

export const APP_NAME = 'RISK AI NAVIGATOR';
export const APP_TAGLINE = 'Techcombank Risk Management Division';

/**
 * Official Techcombank logo on a transparent background.
 * Dark mode swaps in a copy with white "BANK" lettering
 * (client/public/techcombank-logo-dark.png) so it stays legible.
 * Pass `height` for a fixed height, or omit it to fill the parent's width.
 */
export function TechcombankLogo({
  className,
  height,
}: {
  className?: string;
  height?: number;
}) {
  const sizing = height ? 'w-auto' : 'h-auto w-full';
  const style = height ? { height } : undefined;
  return (
    <>
      <img
        src="/techcombank-logo.png"
        alt="Techcombank"
        style={style}
        className={cn('select-none dark:hidden', sizing, className)}
        draggable={false}
      />
      <img
        src="/techcombank-logo-dark.png"
        alt="Techcombank"
        style={style}
        className={cn('hidden select-none dark:block', sizing, className)}
        draggable={false}
      />
    </>
  );
}

export function AppNameText() {
  return (
    <span className="flex flex-col leading-none">
      <span className="whitespace-nowrap font-extrabold text-[13px] text-brand tracking-[0.1em]">
        {APP_NAME}
      </span>
      <span className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground tracking-wide">
        Risk Management Division
      </span>
    </span>
  );
}

/**
 * Horizontal logo + app name lockup, used on the sign-in screen. The sidebar
 * instead shows a full-width logo with `AppNameText` below it.
 */
export function BrandLockup() {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <TechcombankLogo height={40} />
      <span className="border-brand/30 border-l pl-3">
        <AppNameText />
      </span>
    </div>
  );
}

/** Small mark for the collapsed sidebar: two interlocking diamonds. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.68}
      viewBox="0 0 66 45"
      aria-hidden="true"
      className="text-brand"
    >
      <path
        fill="currentColor"
        d="M22 0 33 11 22 22 33 33 22 44 0 22ZM44 0 66 22 44 44 33 33 44 22 33 11Z"
      />
    </svg>
  );
}

/**
 * Decorative diamond / chevron shapes inspired by the Techcombank mark.
 * Rendered behind the empty-state hero; purely visual.
 */
export function BrandShapes({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
    >
      {/* Large outlined diamond, top right */}
      <div className="-right-24 -top-24 absolute size-72 rotate-45 rounded-[28px] border-[28px] border-brand/[0.07]" />
      {/* Solid diamond pair, bottom left */}
      <div className="-left-16 absolute bottom-10 size-40 rotate-45 rounded-2xl bg-brand/[0.06]" />
      <div className="absolute bottom-24 left-20 size-20 rotate-45 rounded-lg bg-brand/[0.09]" />
      {/* Small accent diamonds */}
      <div className="absolute top-1/4 left-[12%] size-3 rotate-45 bg-brand/40" />
      <div className="absolute top-[18%] right-[22%] size-2 rotate-45 bg-brand/30" />
      <div className="absolute right-[10%] bottom-1/3 size-4 rotate-45 border-2 border-brand/30" />
    </div>
  );
}
```

Replace `client/src/components/greeting.tsx` with:

```tsx
import { motion } from 'framer-motion';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { APP_NAME, APP_TAGLINE, BrandMark } from './brand';

export const Greeting = () => {
  const { greeting } = useAppConfig();
  return (
    <div
      key="overview"
      className="mx-auto mb-8 flex size-full max-w-3xl flex-col items-center justify-center px-4 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex flex-col items-center gap-3"
      >
        <BrandMark size={44} />
        <h1 className="font-extrabold text-3xl text-foreground tracking-[0.12em] md:text-4xl">
          RISK <span className="text-brand">AI</span> NAVIGATOR
        </h1>
        <span className="sr-only">{APP_NAME}</span>
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.18em]">
          <span className="h-px w-6 bg-brand/50" />
          {APP_TAGLINE}
          <span className="h-px w-6 bg-brand/50" />
        </div>
        <p className="mt-2 text-base text-muted-foreground md:text-lg">
          {greeting}
        </p>
      </motion.div>
    </div>
  );
};
```

Replace `client/src/components/suggested-actions.tsx` with:

```tsx
import { motion } from 'framer-motion';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { ChatMessage } from '@chat-template/core';
import { Suggestion } from './elements/suggestion';
import { LightbulbIcon } from '@/components/icons';
import { softNavigateToChatId } from '@/lib/navigation';
import { useAppConfig } from '@/contexts/AppConfigContext';

interface SuggestedActionsProps {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const { chatHistoryEnabled } = useAppConfig();
  const suggestedActions = [
    'What is the current NPL ratio bank-wide, and how has it changed over the last 6 months by customer segment?',
    'Summarize our current market risk position, including any limit breaches this month.',
    'How are our liquidity ratios (LCR and NSFR) trending against regulatory limits?',
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="flex w-full flex-col"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={suggestedAction}
          className="border-b border-border"
        >
          <Suggestion
            suggestion={suggestedAction}
            variant="tertiary"
            onClick={(suggestion) => {
              softNavigateToChatId(chatId, chatHistoryEnabled);
              sendMessage({
                role: 'user',
                parts: [{ type: 'text', text: suggestion }],
              });
            }}
            className="h-auto w-full justify-start gap-2 rounded-none border-0 bg-transparent py-2 pl-0 text-left text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <LightbulbIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden />
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;

    return true;
  },
);
```

Replace `client/src/components/app-sidebar.tsx` with (logo fills the pane
width; app name + collapse toggle on the row below; collapsed rail shows the
diamond mark):

```tsx
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DbIcon } from '@/components/ui/db-icon';
import { NewChatIcon, SidebarCollapseIcon, SidebarExpandIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ClientSession } from '@chat-template/auth';
import { Button } from './ui/button';
import { Action } from './elements/actions';
import { AppNameText, BrandMark, TechcombankLogo } from './brand';

export function AppSidebar({
  user,
  preferredUsername,
}: {
  user: ClientSession['user'] | undefined;
  preferredUsername: string | null;
}) {
  const navigate = useNavigate();
  const { setOpenMobile, open, openMobile, isMobile, toggleSidebar } = useSidebar();

  const effectiveOpen = open || (isMobile && openMobile);

  return (
    <Sidebar
      collapsible="icon"
      className="group-data-[side=left]:border-r-0"
    >
      {/* ── Header: app title + collapse toggle ────────────────────────── */}
      <SidebarHeader
        className={cn(
          'border-b border-sidebar-border',
          effectiveOpen
            ? 'gap-3 px-3 pt-4 pb-3'
            : 'h-[44px] flex-row items-center justify-center px-2 py-0',
        )}
      >
        {effectiveOpen && (
          <Link
            to="/"
            onClick={() => setOpenMobile(false)}
            className="block w-full"
            aria-label="RISK AI NAVIGATOR home"
          >
            {/* Logo fills the full width of the pane */}
            <TechcombankLogo />
          </Link>
        )}

        <div
          className={cn(
            'flex items-center gap-2',
            effectiveOpen ? 'justify-between' : 'justify-center',
          )}
        >
          {effectiveOpen ? (
            <AppNameText />
          ) : (
            <span className="sr-only">RISK AI NAVIGATOR</span>
          )}
          <Action
            onClick={toggleSidebar}
            tooltip={effectiveOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <DbIcon
              icon={effectiveOpen ? SidebarCollapseIcon : SidebarExpandIcon}
              size={16}
              color="muted"
            />
          </Action>
        </div>
      </SidebarHeader>

      {!effectiveOpen && (
        <div className="flex justify-center pt-3">
          <BrandMark size={22} />
        </div>
      )}

      {/* ── Nav: New Chat item ───────────────────────────────────────────── */}
      <div className="px-2 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  type="button"
                  className="h-8 p-1 md:p-2 cursor-pointer"
                  onClick={() => {
                    setOpenMobile(false);
                    navigate('/');
                  }}
                >
                  <DbIcon icon={NewChatIcon} size={16} color="default" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    New chat
                  </span>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right" style={{ display: open ? 'none' : 'block' }}>New chat</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>

      {/* ── Chat history ────────────────────────────────────────────────── */}
      <SidebarContent>
        {effectiveOpen && <SidebarHistory user={user} />}
      </SidebarContent>

      {/* ── User nav ────────────────────────────────────────────────────── */}
      <SidebarFooter>
        {user && (
          <SidebarUserNav user={user} preferredUsername={preferredUsername} />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
```

Replace `client/src/components/chat-header.tsx` with (removes the "Ephemeral"
and "Feedback disabled" badges and the Databricks docs links, rewords the OBO
banner):

```tsx
import { useNavigate } from 'react-router-dom';

import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import { useConfig } from '@/hooks/use-config';
import { PlusIcon } from './icons';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';

function OboScopeBanner({ missingScopes }: { missingScopes: string[] }) {
  if (missingScopes.length === 0) return null;

  return (
    <div className="w-full border-b border-red-500/20 bg-red-50 dark:bg-red-950/20 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <TriangleAlert className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <p className="text-sm text-red-700 dark:text-red-400">
          RISK AI NAVIGATOR acts with your own Databricks permissions, but
          this app is missing the user authorization scopes{' '}
          <strong>{missingScopes.join(', ')}</strong>. Please contact the app
          administrator.
        </p>
      </div>
    </div>
  );
}

export function ChatHeader({ title, empty, isLoadingTitle }: { title?: string, empty?: boolean, isLoadingTitle?: boolean }) {
  const navigate = useNavigate();
  const { oboMissingScopes } = useConfig();

  return (
    <>
      <header className={cn("sticky top-0 flex h-[60px] items-center gap-2 bg-background px-4", {
        "border-b border-border md:pb-2": !empty,
      })}>
        {/* Toggle visible on mobile only — desktop toggle lives inside the sidebar */}
        <div className="md:hidden">
          <SidebarToggle forceOpenIcon />
        </div>

        {(title || isLoadingTitle) &&
          <h4 className="text-[16px] font-medium truncate">
            {isLoadingTitle ?
              <Skeleton className="w-32 h-6 bg-border" /> :
              title
            }
          </h4>
        }

        <div className="ml-auto flex items-center gap-2">
          {/* New Chat button — mobile only; desktop uses the sidebar rail */}
          <Button
            variant="default"
            className="order-2 ml-auto h-8 px-2 md:hidden"
            onClick={() => {
              navigate('/');
            }}
          >
            <PlusIcon />
            <span>New Chat</span>
          </Button>
        </div>
      </header>

      <OboScopeBanner missingScopes={oboMissingScopes} />
    </>
  );
}
```

### 6.3 Smaller client edits

- `client/src/components/chat.tsx`: add `import { BrandShapes } from './brand';`
  after the `Greeting` import. In the empty state (`if (messages.length === 0)`),
  change the scroll container and inner wrapper to:

```tsx
        <div className="relative flex min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4">
          <BrandShapes />
          <div className="relative m-auto flex w-full max-w-4xl flex-col">
```

- `client/src/layouts/ChatLayout.tsx`:
  - replace `import { DatabricksLogo } from '@/components/DatabricksLogo';` with `import { BrandLockup } from '@/components/brand';`
  - replace `<DatabricksLogo height={20} />` with `<BrandLockup />`
  - replace the text `Please authenticate using Databricks to access this application.` with `Please sign in to Databricks with your Techcombank account to use RISK AI NAVIGATOR.`
  - make the sidebar open by default: `const isCollapsed = localStorage.getItem('sidebar:state') === 'false';`
- `client/src/App.tsx`: `defaultTheme="system"` → `defaultTheme="light"`.
- `client/src/contexts/AppConfigContext.tsx`:

```ts
export const DEFAULT_GREETING =
  'Bank-wide asset quality insights, from credit to market and liquidity risk.';
```

- `client/index.html`:
  - favicon → `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`
  - theme-color meta `content="#d93832"`
  - title → `<title>RISK AI NAVIGATOR | Techcombank</title>` followed by
    `<meta name="description" content="AI assistant for Techcombank Risk Management: bank-wide asset quality, credit, market and liquidity risk insights" />`
  - **delete** the two `preconnect` links to `fonts.googleapis.com` / `fonts.gstatic.com` (no internet in the bank network).

### 6.4 Theme colours: `client/src/index.css`

Inside the light-mode `:root` block:

1. After `--color-neutral-050: #f7f7f7;` add:

```css
  /* Techcombank brand red (sampled from client/public/techcombank-logo.png) */
  --color-tcb-red-050: #fdf3f2;
  --color-tcb-red-100: #fbe3e1;
  --color-tcb-red-400: #ea6a63;
  --color-tcb-red-500: #e04a42;
  --color-tcb-red-600: #d93832;
  --color-tcb-red-700: #b82a25;
  --color-tcb-red-800: #8f1f1b;
  --color-tcb-ink: #221f20;
```

2. Replace the six light `--action-*` blue values with:

```css
  --action-default-background-hover: rgba(217, 56, 50, 0.06);
  --action-default-background-press: rgba(217, 56, 50, 0.12);
  --action-primary-background-hover: var(--color-tcb-red-700);
  --action-primary-background-press: var(--color-tcb-red-800);
  --action-tertiary-background-hover: rgba(217, 56, 50, 0.06);
  --action-tertiary-background-press: rgba(217, 56, 50, 0.12);
```

3. `--primary: var(--color-blue-600);` → `--primary: var(--color-tcb-red-600);`
   and add `--brand: var(--color-tcb-red-600);` right after `--primary-foreground`.
4. `--ring: #2272b4;` → `--ring: var(--color-tcb-red-600);`
5. `--sidebar-primary` and `--sidebar-ring` → `var(--color-tcb-red-600)`.

Inside the `.dark` block:

1. `--primary: var(--color-blue-500);` → `--primary: var(--color-tcb-red-500);`
   and add `--brand: var(--color-tcb-red-500);` after `--primary-foreground`.
2. `--ring: #4ba3d6;` → `--ring: var(--color-tcb-red-400);`
3. `--sidebar-primary: #2e86c1;` → `var(--color-tcb-red-500)`; `--sidebar-ring: #4ba3d6;` → `var(--color-tcb-red-400)`.
4. Replace the six dark `--action-*` values with:

```css
  --action-default-background-hover: rgba(234, 106, 99, 0.10);
  --action-default-background-press: rgba(234, 106, 99, 0.18);
  --action-primary-background-hover: var(--color-tcb-red-400);
  --action-primary-background-press: var(--color-tcb-red-100);
  --action-tertiary-background-hover: rgba(234, 106, 99, 0.10);
  --action-tertiary-background-press: rgba(234, 106, 99, 0.18);
```

In the `@theme { ... }` block, after `--color-primary-foreground: var(--primary-foreground);`
add `--color-brand: var(--brand);` (this enables `text-brand`, `bg-brand/[0.07]`, etc.).

## 7. Bundle and runtime config

Replace `databricks.yml` with:

```yaml
# RISK AI NAVIGATOR - Databricks Asset Bundle
#
# Deploys a prebuilt, self-contained Node.js app from ./app-dist.
# The app container never runs `npm install`: every dependency is already
# bundled into app-dist/server/dist (see scripts/build-offline.mjs).
#
# Requires Databricks CLI >= 0.279.0 (direct deployment engine, no Terraform).

bundle:
  name: risk-ai-navigator
  # Deploy with the Databricks Go SDK directly - no Terraform download needed.
  engine: direct

variables:
  serving_endpoint_name:
    description: "Agent Bricks Multi-Agent Supervisor endpoint used by the app"
    default: "mas-025958-ba-endpoint"
  app_name:
    description: "Databricks App name (lowercase, max 30 chars, cannot be changed after first deploy)"
    default: "risk-ai-navigator"

# The prebuilt app lives in folders that git ignores (dist/); make sure the
# bundle still uploads them.
sync:
  include:
    - app-dist/**

resources:
  apps:
    risk_ai_navigator:
      name: ${var.app_name}
      description: >-
        AI assistant for Techcombank Risk Management: bank-wide asset quality,
        credit, market and liquidity risk insights in plain language, using
        each user's own data permissions.
      source_code_path: ./app-dist

      # On-behalf-of-user (OBO) authorization: the app calls the agent with
      # the signed-in user's token, so every user only sees the data their
      # own Unity Catalog / Genie permissions allow.
      user_api_scopes:
        - model-serving # call the supervisor endpoint as the user
        - genie # the supervisor's Genie MCP tools run as the user
        - sql # Genie executes SQL on the warehouse as the user

      resources:
        # Also grant the app service principal CAN_QUERY (used for reading
        # the endpoint's metadata at startup).
        - name: serving-endpoint
          description: "Agent Bricks supervisor endpoint for RISK AI NAVIGATOR"
          serving_endpoint:
            name: ${var.serving_endpoint_name}
            permission: CAN_QUERY

targets:
  prod:
    default: true
    # No `mode: development`, so the app keeps its exact name
    # (development mode would prefix it with "[dev <user>]").
```

Create `app-dist/app.yaml` (this folder must **never** contain a `package.json`):

```yaml
# Runtime config for the Databricks App.
# There is deliberately NO package.json in this folder, so the platform does
# not run `npm install` / `npm run build` (the workspace has no npm access).
# server/dist/index.mjs already contains every dependency.
command: ["node", "server/dist/index.mjs"]

env:
  - name: NODE_ENV
    value: production
  - name: DATABRICKS_SERVING_ENDPOINT
    valueFrom: serving-endpoint
```

Append to `.gitignore` (the parent repo ignores `dist/`; these re-include the prebuilt app):

```gitignore

# RISK AI NAVIGATOR: the prebuilt app is committed so it can be deployed
# from a machine without npm access.
!app-dist/server/dist/
!app-dist/client/dist/
```

Create `.gitattributes`:

```gitattributes
# Keep line endings stable when the repo is cloned on Windows.
* text=auto
*.sh text eol=lf
# cmd batch files break (goto/labels) with LF endings
*.cmd text eol=crlf
# Prebuilt app: deploy exactly the bytes that were built and tested.
app-dist/** -text
```

## 8. Scripts (cmd-friendly, cross-platform)

Create `scripts/with-env.mjs` (cross-platform `VAR=value command`):

```js
#!/usr/bin/env node
// Cross-platform "VAR=value command" (works in cmd, VS Code terminal and bash).
// Usage: node scripts/with-env.mjs NAME=value [NAME2=value2 ...] -- <command...>
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const sep = args.indexOf('--');
if (sep === -1 || sep === args.length - 1) {
  console.error('Usage: node scripts/with-env.mjs NAME=value -- <command...>');
  process.exit(1);
}
const env = { ...process.env };
for (const pair of args.slice(0, sep)) {
  const i = pair.indexOf('=');
  env[pair.slice(0, i)] = pair.slice(i + 1);
}
const [cmd, ...rest] = args.slice(sep + 1);
const child = spawn(cmd, rest, {
  env,
  stdio: 'inherit',
  // npm is npm.cmd on Windows, which needs a shell to resolve
  shell: process.platform === 'win32',
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
```

Create `scripts/build-offline.mjs` (rebuilds `app-dist/` and checks that it runs with no `node_modules`):

```js
#!/usr/bin/env node
// Rebuilds the self-contained app in ./app-dist. Works in cmd, VS Code
// terminal and bash:   node scripts/build-offline.mjs
//
// Needs npm access (public registry or Nexus). The output runs with plain
// `node`: no node_modules and no `npm install` inside the Databricks App.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

function step(title, cmd, args) {
  console.log(`==> ${title}`);
  // npm is npm.cmd on Windows, which needs a shell
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error(`ERROR: "${title}" failed (exit code ${r.status})`);
    process.exit(1);
  }
}

step('Installing build dependencies', 'npm', ['ci', '--no-audit', '--no-fund']);
step('Building client (React) and server (single bundled file)', 'npm', ['run', 'build']);

console.log('==> Assembling app-dist/');
for (const part of ['server', 'client']) {
  rmSync(join('app-dist', part, 'dist'), { recursive: true, force: true });
  cpSync(join(part, 'dist'), join('app-dist', part, 'dist'), { recursive: true });
}

// Sanity check: the bundle must start with no node_modules anywhere near it.
console.log('==> Verifying app-dist runs without node_modules');
const tmp = mkdtempSync(join(tmpdir(), 'risk-ai-check-'));
cpSync('app-dist', tmp, { recursive: true });
const server = spawn(process.execPath, [join(tmp, 'server', 'dist', 'index.mjs')], {
  env: { ...process.env, PORT: '38123', NODE_ENV: 'production', UI_PREVIEW: 'true' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));

let ok = false;
for (let i = 0; i < 30 && !ok; i++) {
  try {
    ok = (await fetch('http://localhost:38123/ping')).ok;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}
server.kill();
await new Promise((r) => setTimeout(r, 300));
rmSync(tmp, { recursive: true, force: true });
if (!ok) {
  console.error('ERROR: bundled server did not start. Log:\n' + log);
  process.exit(1);
}
console.log('==> Done. app-dist/ is ready to deploy.');
```

Create `scripts/deploy.cmd`. **Save it with CRLF line endings**, because cmd `goto`/labels break with LF:

```bat
@echo off
rem Deploys RISK AI NAVIGATOR with the Databricks CLI direct engine (no Terraform).
rem Works in cmd and the VS Code terminal. Needs only the Databricks CLI.
rem
rem Usage (from the project folder):   scripts\deploy.cmd [cli-profile]
setlocal
cd /d "%~dp0.."

set "CLI_PROFILE=%~1"
if "%CLI_PROFILE%"=="" set "CLI_PROFILE=%DATABRICKS_CONFIG_PROFILE%"
if "%CLI_PROFILE%"=="" set "CLI_PROFILE=DEFAULT"
rem Also set in databricks.yml
set "DATABRICKS_BUNDLE_ENGINE=direct"

if not exist "app-dist\server\dist\index.mjs" goto notbuilt
if not exist "app-dist\client\dist\index.html" goto notbuilt

echo ==^> Databricks CLI version (needs 0.279.0 or newer)
databricks --version || goto failed

echo ==^> Validating bundle (profile %CLI_PROFILE%)
databricks bundle validate -p %CLI_PROFILE% || goto failed

echo ==^> Deploying bundle
databricks bundle deploy -p %CLI_PROFILE% || goto failed

echo ==^> Starting app
databricks bundle run risk_ai_navigator -p %CLI_PROFILE% || goto failed

databricks bundle summary -p %CLI_PROFILE%
echo ==^> Done.
exit /b 0

:notbuilt
echo ERROR: app-dist is not built. Run "node scripts\build-offline.mjs" on a machine with npm/Nexus access.
exit /b 1

:failed
echo ERROR: the step above failed. Fix the error shown and run this script again.
exit /b 1
```

Create `scripts/deploy.sh` (macOS/Linux equivalent; `chmod +x`):

```bash
#!/usr/bin/env bash
# Deploys RISK AI NAVIGATOR with the Databricks CLI direct engine (no Terraform).
#
# Usage: ./scripts/deploy.sh [databricks-cli-profile]
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE="${1:-${DATABRICKS_CONFIG_PROFILE:-DEFAULT}}"
export DATABRICKS_BUNDLE_ENGINE=direct # also set in databricks.yml

if [ ! -f app-dist/server/dist/index.mjs ] || [ ! -f app-dist/client/dist/index.html ]; then
  echo "ERROR: app-dist/ is not built. Run "node scripts/build-offline.mjs" on a machine with npm access." >&2
  exit 1
fi

echo "==> Databricks CLI version (needs >= 0.279.0)"
databricks --version

echo "==> Validating bundle"
databricks bundle validate -p "$PROFILE"

echo "==> Deploying bundle"
databricks bundle deploy -p "$PROFILE"

echo "==> Starting app"
databricks bundle run risk_ai_navigator -p "$PROFILE"

databricks bundle summary -p "$PROFILE"
```

## 9. Docs and env

Replace `.env.example` with:

```bash
# Local development settings for RISK AI NAVIGATOR.
# Copy to .env and fill in. Never commit .env.

# Databricks CLI profile to use locally (run: databricks auth login --profile <name>)
# Locally the app calls the agent with YOUR CLI login, i.e. your own permissions,
# which matches the OBO behaviour of the deployed app.
DATABRICKS_CONFIG_PROFILE=DEFAULT

# Agent Bricks supervisor endpoint
DATABRICKS_SERVING_ENDPOINT=mas-025958-ba-endpoint

# Optional: override the text under the app title on the start screen
# CHAT_GREETING=Bank-wide asset quality insights, from credit to market and liquidity risk.
```

Replace `README.md` with:

````markdown
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
````

Replace `CLAUDE.md` with:

```markdown
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
```

## 10. Build, verify, commit

1. `npm install`. Pre-existing TypeScript errors from the upstream template (`ChatTools` export,
   `react-syntax-highlighter` types, `server/src/index.ts` proxy header) are expected; the
   bundlers don't type-check. Don't "fix" them.
2. `node scripts/build-offline.mjs`. Expect `==> Done. app-dist/ is ready to deploy.`
   `app-dist/` should be about 18 MB, about 475 files, no file over 5 MB, and contain
   `server/dist/index.mjs`, `client/dist/index.html`, `client/dist/techcombank-logo.png`,
   `client/dist/techcombank-logo-dark.png`, `app.yaml`, and **no** `package.json`.
3. Offline proof: copy `app-dist/` to a temp folder with no `node_modules` above it and run
   `NODE_ENV=production PORT=8123 UI_PREVIEW=true node server/dist/index.mjs`. Check that:
   - `GET /ping` returns `pong`
   - `GET /` returns HTML with `<title>RISK AI NAVIGATOR | Techcombank</title>`
   - `GET /api/config` returns `{"features":{"chatHistory":false,"feedback":false},"obo":{"missingScopes":[]}}`
4. `npm run preview:ui` → http://localhost:3000 shows:
   - the full-width Techcombank logo top-left (transparent background)
   - "RISK AI NAVIGATOR / Risk Management Division" with the collapse toggle beside it
   - the red diamond mark above the hero title "RISK **AI** NAVIGATOR" (AI in red)
   - the subtitle and the three example questions
   - faint red diamond shapes in the background
   - red accents everywhere
   In dark mode, "BANK" in the logo is white. `npm run preview:dist` serves the
   built app on http://localhost:8000. Both are verified in cmd too.
5. **Screenshot gotcha:** headless Chrome `--screenshot` with `--virtual-time-budget`
   freezes framer-motion fade-ins half-way (text looks faded, the last suggestion is missing).
   That's a capture artifact, not a bug. Capture in real time (DevTools protocol, wait ~4 s) to check.
6. Commit on a branch (e.g. `risk-ai-navigator`), including `app-dist/`.

## 11. Deploying (for the person running it)

On Windows (cmd / VS Code terminal set to **Command Prompt**), with Databricks CLI >= 0.279.0
and `databricks auth login --host https://<workspace>.cloud.databricks.com --profile DEFAULT` done:

```bat
scripts\deploy.cmd DEFAULT
```

This runs `databricks bundle validate`, `deploy`, `run risk_ai_navigator`, then `summary`.

Permissions each user needs because of OBO:

| What | Permission |
| --- | --- |
| Endpoint `mas-025958-ba-endpoint` | `CAN_QUERY` |
| Both Genie spaces | `CAN_RUN` |
| The Genie SQL warehouse | `CAN_USE` |
| Underlying tables | `USE CATALOG`, `USE SCHEMA`, `SELECT` |
| App `risk-ai-navigator` | `CAN_USE` |

If an admin restricts app OAuth scopes, `model-serving`, `genie` and `sql` must be on the
allowed list.

Known risks to check on the first deploy:

| Risk | What to do |
| --- | --- |
| CLI < 0.279.0 | Fails with `unknown field: engine` or tries to download Terraform. Upgrade the CLI |
| Scope names rejected | Older workspaces use `serving.serving-endpoints`, `dashboards.genie`, `sql` instead |
| App name already exists | Delete it, or `databricks bundle deployment bind risk_ai_navigator risk-ai-navigator` |
| Several people deploy | Each person's deploy state is separate, so the second gets "already exists". Use one owner |
| App logs show `npm install` | The source folder isn't `./app-dist`, or a `package.json` got into it |
| 403 errors in chat | The user is missing one of the permissions above |
| Answers differ from Playground | Expected under OBO: users see only their own data |
| Long questions cut off | Supervisor + Genie questions can be slow; check proxy timeouts |

npm/Nexus note: the lockfile's `resolved` URLs point to `registry.npmjs.org`, but npm's
default `replace-registry-host=npmjs` rewrites them to whatever registry is configured.
A one-line project `.npmrc` (`registry=https://<nexus>/repository/<npm-group>/`) is
enough for `npm ci`. Databricks itself never installs packages.

