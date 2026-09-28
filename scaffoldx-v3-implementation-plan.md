# ScaffoldX v3.0.0 — Implementation Plan

**Audience:** Google Antigravity (AI coding agent) implementing this alongside Olalekan.
**Repo:** `scaffoldx` (npm package `scaffoldx`, currently v2.0.2)

## How to work through this plan

- Implement **one step at a time, in order**. Each step lists a Goal, files to create, files to edit, and a Test procedure.
- **Do not start the next step until the current step's test passes.** If a test fails, fix the step before moving on — later steps assume earlier ones work.
- Commit after each passing step (small commits make it easy to bisect if something breaks later).
- "Tool source" = the scaffoldx CLI's own code (`index.js`, `helpers/**`). "Templates" = the files that get scaffolded into a *user's generated app* (`templates/javascript/**`, `templates/typescript/**`). Most steps touch both — read carefully which is which.
- Two template trees exist (JavaScript and TypeScript) and are largely parallel. Unless a step says otherwise, mirror every template change in **both** trees.

---

## Step 0 — Baseline safety net

**Goal:** Before changing anything, make sure you can tell if you've broken something.

**New files:**
- `test/manual-checklist.md` — a plain checklist of the CLI flows to manually run through (no-db JS, no-db TS, Mongoose+JS, Mongoose+TS, Prisma+JS, Prisma+TS), used throughout this plan as the manual smoke test.

**Edited files:** none.

**Test:** Run through `test/manual-checklist.md` once against the current `v2.0.2` code in a scratch directory (`mkdir /tmp/sx-baseline && cd /tmp/sx-baseline && node /path/to/scaffoldx/index.js`) and record which flows currently work, so later regressions are obvious. Expect the Mongoose `.env` gap and the directory-overwrite bug (see Step 1) to already be broken — that's the known baseline, not a new failure.

---

## Step 1 — Fix existing bugs

**Goal:** Fix the four correctness bugs identified in review, with no new features yet, so every later step builds on solid ground.

**Edited files:**
- `helpers/appname.js` — add the missing `await` on `inquirer.prompt({...overwrite...})`.
- `helpers/install.js` — wrap `exec('npm install', ...)` in a `new Promise((resolve, reject) => ...)` and `await` it in `index.js` for real; reject on error instead of just logging; propagate the rejection so the CLI exits non-zero on install failure. Do the same for the `npx prisma init` `exec` call.
- `templates/javascript/package.json.ejs` — remove `typescript`, `ts-node`, `@types/node` from the Prisma devDependencies block (TS tooling has no place in a JS project).
- `index.js` — since `installDependencies` now truly rejects on failure, wrap the call in try/catch and exit with a clear error message.

**New files:** none yet (the `.env`/`.gitignore` gap is fixed properly in Step 9, once `.env.example` scaffolding exists for every path — don't patch it here).

**Test:**
1. Run the CLI, choose a non-`.` app name pointing at a directory that already has files in it, answer "no" to overwrite → confirm the CLI actually exits and does **not** delete the directory (this was silently broken before).
2. Scaffold a JS + Prisma project → open generated `package.json` → confirm no `typescript`/`ts-node`/`@types/node` in devDependencies.
3. Temporarily rename your global `npm` binary (or point `PATH` away from it) and re-run the CLI → confirm it now prints a clear failure and exits non-zero instead of silently continuing.

---

## Step 2 — Package manager selection

**Goal:** Support npm, pnpm, yarn, and bun for the generated project's install/dev/start commands, detected where possible and confirmable by the user.

**New files:**
- `helpers/packageManager.js` — exports `detectPackageManager()` (reads `process.env.npm_config_user_agent`, which is set by `npx`/`pnpm dlx`/`yarn dlx`/`bunx`, to guess a default) and `collectPackageManager(defaultGuess)` (an inquirer `list` prompt: npm / pnpm / yarn / bun, pre-selecting the detected default).

**Edited files:**
- `index.js` — call `collectPackageManager` early (right after app name, before language), thread `packageManager` into `templateData`.
- `helpers/install.js` — replace the hardcoded `npm install` exec with a lookup table mapping package manager → install command (`npm install`, `pnpm install`, `yarn install`, `bun install`) and → run-script prefix (`npm run dev`, `pnpm dev`, `yarn dev`, `bun run dev`), used both for actually running the install and for the final "get started" instructions.
- `templates/javascript/package.json.ejs`, `templates/typescript/package.json.ejs` — no content change needed here (scripts stay package-manager-agnostic), but confirm nothing in them assumes `npm run`.

**Test:** Scaffold the same minimal (no-db) app four times, once per package manager, in four scratch directories. Confirm: (a) the CLI installs with the right tool each time and doesn't error if a manager isn't installed on your machine — in that case, catch the spawn error and tell the user to install it rather than crashing; (b) the final printed instructions use the right run command for each; (c) each generated project actually starts with its manager's dev command.

---

## Step 3 — Directory-handling prompt (clear / ignore / exit)

**Goal:** Replace the current binary overwrite prompt with three explicit choices.

**Edited files:**
- `helpers/appname.js` — replace the `confirm`/`overwrite` prompts (both branches: `appName === '.'` and not) with a single `list` prompt: `Clear existing content`, `Scaffold alongside existing content`, `Exit without scaffolding`. Wire each choice to `fs.emptyDir`, "do nothing, just proceed", and `process.exit(0)` respectively.

**New files:** none.

**Test:** Run the CLI three times against a scratch directory pre-populated with a dummy file (`touch existing.txt`):
1. Choose "clear" → confirm `existing.txt` is gone and the app scaffolds normally.
2. Recreate `existing.txt`, choose "ignore" → confirm `existing.txt` still exists **and** the app files were added alongside it.
3. Recreate `existing.txt`, choose "exit" → confirm the CLI exits cleanly, `existing.txt` is untouched, and no app files were written.

---

## Step 4 — Database type selection (Postgres / MongoDB), before ORM choice

**Goal:** Insert a database-type prompt between "use a database?" and "choose ORM", and make Postgres force Prisma automatically.

**Edited files:**
- `helpers/database.js` — after the `useDatabase` confirm, add a `databaseType` list prompt (`Postgres`, `MongoDB`, `Firebase (coming soon — disabled)`) shown only when `useDatabase` is true. Disable/skip the Firebase option for now (leave it in the list as non-selectable or simply omit it with a code comment noting it's the future slot — your call, but don't wire any Firebase logic yet). Then: if `databaseType === 'Postgres'`, skip the ORM prompt entirely and set `orm = 'Prisma'` in code; otherwise show the existing ORM prompt (`Mongoose` / `Prisma`) for MongoDB. Return `{ useDatabase, databaseType, orm }`.
- `index.js` — thread `databaseType` into `templateData`.

**New files:** none yet (docker-compose and Prisma-version branching land in Steps 5–6).

**Test:** Run the CLI four ways and confirm the prompt flow matches the matrix below (print the resolved `{ useDatabase, databaseType, orm }` to console temporarily for verification, then remove the debug log once confirmed):
| useDatabase | databaseType asked? | ORM asked? | Resolved orm |
|---|---|---|---|
| No | No | No | null |
| Yes | Yes | Only if Mongo | Postgres→Prisma auto; Mongo→user choice |

---

## Step 5 — Postgres path: docker-compose.yml + Prisma v7 scaffolding

**Goal:** When `databaseType === 'Postgres'`, scaffold a working local Postgres container and a Prisma v7–correct setup (this is **not** just "install a newer version" — v7 changed the generator provider name, requires an explicit `output` path, and requires a `prisma.config.ts`).

**New template files** (root of generated app, both JS and TS trees where applicable):
- `docker-compose.postgres.yml.ejs` → copied/rendered as `docker-compose.yml` when `databaseType === 'Postgres'`. Should define a single `postgres` service (official `postgres:16` image, exposed `5432:5432`, env vars for `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` matching the `DATABASE_URL` you print in the getting-started instructions, and a named volume for persistence).
- `prisma.config.ts.ejs` → rendered at project root **only** for the Postgres/Prisma-v7 path. Points to `prisma/schema.prisma`, sets migrations path, and reads `DATABASE_URL` via `env()`.

**Edited files:**
- `helpers/copy.js` — add a conditional similar to the existing `db`/`models` folder handling: only copy `docker-compose.postgres.yml.ejs` → `docker-compose.yml` and `prisma.config.ts.ejs` when `databaseType === 'Postgres'`.
- `helpers/install.js` — in the Prisma branch, split into two code paths keyed on `databaseType`:
  - **Postgres path:** install `prisma@7` and `@prisma/client@7`; run `npx prisma init --datasource-provider postgresql`; after init, edit the generated `schema.prisma`'s `generator client` block to `provider = "prisma-client"` with an explicit `output = "../generated/prisma"` (or similar path — pick one and use it consistently); append the `User` model using the existing SQL-style `@id @default(uuid())` shape (unchanged from today).
  - **Mongo path:** unchanged from Step 6 below — do not touch it here.
- `templates/typescript/src/db/connect.ts`, `templates/javascript/src/db/connect.js.ejs` — for the Postgres path, change the import from `@prisma/client` to the configured generated output path (e.g. `../../generated/prisma`), matching whatever `output` you set in the schema edit above. Keep the Mongo/v6 branch importing from `@prisma/client` as today.
- Final getting-started instructions in `helpers/install.js` — for Postgres, print the `docker-compose up -d` step **before** the `prisma generate`/`DATABASE_URL` instructions, and make sure the printed `DATABASE_URL` matches the docker-compose credentials exactly.

**Test:**
1. Scaffold a TS app with Postgres selected. Confirm `docker-compose.yml` and `prisma.config.ts` exist at project root, and `schema.prisma` has `provider = "prisma-client"` with an `output` path.
2. `docker compose up -d`, update `.env`/`DATABASE_URL` per the printed instructions, run `npx prisma generate` then `npx prisma db push` (or `migrate dev`) — confirm no errors.
3. Start the dev server, hit `GET /api/v1/users` — confirm it queries successfully (empty array) against the running Postgres container, proving the import path from the custom `output` actually resolves.
4. Repeat for the JS tree.

---

## Step 6 — MongoDB path: Prisma v6 or Mongoose, with correct model shape

**Goal:** When `databaseType === 'MongoDB'`, support both ORM choices correctly — Prisma here must stay on v6 (Prisma 7 does not support the Mongo connector), with a Mongo-correct model.

**New template files:**
- `docker-compose.mongo.yml.ejs` → rendered as `docker-compose.yml` when `databaseType === 'MongoDB'` (official `mongo:7` image, `27017:27017`, named volume, no auth needed for local dev — keep it simple, note in a comment that production Mongo should enable auth).

**Edited files:**
- `helpers/copy.js` — extend the conditional from Step 5 to also copy `docker-compose.mongo.yml.ejs` → `docker-compose.yml` for the Mongo path.
- `helpers/install.js` — Mongo+Prisma path: install pinned `prisma@6` / `@prisma/client@6` (not `latest`, to avoid drifting onto v7); run `npx prisma init --datasource-provider mongodb`; append a Mongo-correct `User` model (`id String @id @default(auto()) @map("_id") @db.ObjectId`, not the UUID version). Mongo+Mongoose path is unchanged from today, but confirm it now also gets `docker-compose.yml`.
- Getting-started instructions — same "print docker-compose up -d first" treatment as Postgres, with the Mongo connection string matching the compose file.

**Test:**
1. Scaffold TS + Mongo + Prisma. Confirm `@prisma/client` resolves to v6 (`npm ls @prisma/client` shows a `6.x`), `docker-compose.yml` is the Mongo variant, and the generated `User` model in `schema.prisma` uses `@db.ObjectId`, not `uuid()`.
2. `docker compose up -d`, `npx prisma db push`, start the server, hit `/api/v1/users` — confirm it queries successfully against the containerized Mongo.
3. Scaffold TS + Mongo + Mongoose, confirm `docker-compose.yml` (Mongo variant) is present, the app connects, and `/api/v1/users` still works via the existing Mongoose model.
4. Repeat both for the JS tree.

---

## Step 7 — Services layer

**Goal:** Add a `services` layer between controllers and data access, matching whichever ORM/no-db path was chosen, so controllers stop talking to the DB directly.

**New template files** (both JS/TS trees):
- `src/services/users.service.js(.ts)` — houses the actual `User.find({})` (Mongoose) / `db.user.findMany({})` (Prisma) / static `[]` (no-db) call, conditionally rendered by EJS exactly like `users.controller` is today.

**Edited files:**
- `templates/javascript/src/controllers/users.controller.js.ejs`, `templates/typescript/src/controllers/users.controller.ts` — replace the direct model/db call with a call into `usersService.getUsers()`, keep the HTTP-status-code handling in the controller.

**Test:** Re-scaffold each of the six flows from Step 0's checklist, confirm `src/services/users.service.*` exists with the right implementation per flow, and `GET /api/v1/users` still returns the expected shape in every case.

---

## Step 8 — Security & observability middleware

**Goal:** Add `helmet`, basic rate limiting, and request logging by default (not optional — this is the main "professional boilerplate" signal).

**New template files:**
- `src/middleware/security.js(.ts)` — exports a function that applies `helmet()` and an `express-rate-limit` limiter (sane default: 100 requests / 15 min per IP) to the app.

**Edited files:**
- `templates/*/src/index.*.ejs` — import and call the security middleware setup, and add `morgan('dev')` (or `'combined'` — pick `dev` for a leaner default) before the routes.
- `templates/javascript/package.json.ejs`, `templates/typescript/package.json.ejs` — add `helmet`, `express-rate-limit`, `morgan` to dependencies (and `@types/morgan` to TS devDependencies).

**Test:** Scaffold + start a minimal app. `curl -I` the root route and confirm helmet's security headers are present (e.g. `X-Content-Type-Options`). Hit `/api/v1/users` 101 times in a tight loop and confirm the 101st request gets a 429. Confirm request lines are logged to the console.

---

## Step 9 — Health endpoint, `.env.example`, and `.gitignore` for every path

**Goal:** Add `/health`, and properly close the `.env`/`.gitignore` gap identified in Step 1 (currently only the Prisma flow ever produces these files).

**New template files:**
- `src/routes/health.routes.js(.ts)` and a matching controller, returning `{ status: 'ok', uptime: process.uptime() }`.
- `.gitignore.ejs` (root) — standard Node ignores (`node_modules`, `.env`, `dist`/output folder, etc.), rendered for **every** flow, not just Prisma.
- `.env.example.ejs` (root) — conditionally includes `MONGO_URI=`, `DATABASE_URL=`, or nothing, plus `PORT=<%= port %>`, rendered for every flow.

**Edited files:**
- `templates/*/src/index.*.ejs` — mount the health route (e.g. `app.use('/health', healthRoutes)`), before or alongside the existing `/` route.
- `helpers/copy.js` — remove any logic that special-cases `.gitignore` only existing via Prisma's own `init`; instead always copy `.gitignore.ejs` → `.gitignore` and `.env.example.ejs` → `.env.example` up front. Keep the Prisma-init-generated `.env` behavior for the Prisma paths, but make sure it doesn't collide with `.env.example`.
- `helpers/install.js` — for the Mongoose path specifically, actually create a real `.env` (copy from `.env.example` or write directly) instead of just printing instructions about a file that doesn't exist — this closes bug #2 from the review.

**Test:** Re-run all six baseline flows. Confirm every single one produces `.gitignore` and `.env.example`; confirm the Mongoose flow now also produces a real, editable `.env`; hit `GET /health` on each and confirm `{ status: 'ok', ... }`.

---

## Step 10 — Centralized config / env validation

**Goal:** Replace ad hoc `process.env.X` reads with a single validated config module.

**New template files:**
- `src/config/index.js(.ts)` — uses `envalid` (or `zod`, pick one consistently) to validate `PORT` and, conditionally, `DATABASE_URL`/`MONGO_URI`, exporting a typed/validated `config` object. Fail fast with a clear message if a required var is missing.

**Edited files:**
- `templates/*/src/index.*.ejs`, `db/connect.*` — replace direct `process.env.PORT` / `process.env.DATABASE_URL` / `process.env.MONGO_URI` reads with `config.port` / `config.databaseUrl` etc.
- `package.json.ejs` (both trees) — add the chosen validation library as a dependency.

**Test:** Scaffold a Postgres app, delete `DATABASE_URL` from `.env`, start the server — confirm it fails immediately with a clear validation error rather than an opaque Prisma connection error later. Restore the var, confirm normal startup.

---

## Step 11 — Graceful shutdown

**Goal:** Close the HTTP server and DB connection cleanly on `SIGTERM`/`SIGINT` (important for Render, which sends `SIGTERM` on redeploy).

**Edited files:**
- `templates/*/src/index.*.ejs` — capture the `app.listen(...)` return value as `server`; add `process.on('SIGTERM', shutdown)` and `process.on('SIGINT', shutdown)` where `shutdown` closes `server`, then closes the Prisma client (`db.$disconnect()`) or Mongoose connection (`mongoose.connection.close()`) if applicable, then exits.

**Test:** Start the server, send `SIGTERM` (`kill -TERM <pid>`, or Ctrl+C for `SIGINT`), confirm a clean shutdown log and the process exits without hanging (test both with and without a database configured).

---

## Step 12 — CORS refinement

**Goal:** Stop defaulting to wide-open CORS silently; make the allowed origin configurable.

**Edited files:**
- `helpers/port.js` or a new small prompt (your call — could live in a new `helpers/cors.js`) — ask for an allowed origin, defaulting to `*` for local dev, but making it explicit rather than implicit.
- `src/config/index.js(.ts)` template — add `corsOrigin` to the validated config.
- `templates/*/src/index.*.ejs` — `app.use(cors({ origin: config.corsOrigin }))` instead of the bare `cors()`.

**Test:** Scaffold with a specific origin (e.g. `http://localhost:5173`), start the server, confirm a `curl` with a different `Origin` header doesn't get `Access-Control-Allow-Origin` back, while a request with the matching origin does.

---

## Step 13 — Static OpenAPI/Swagger docs

**Goal:** Ship a static OpenAPI YAML spec (kept separate from code, per your preference) and mount Swagger UI to read it — behind an opt-in prompt.

**New template files:**
- `docs/openapi.yaml.ejs` — a minimal valid OpenAPI 3 document describing the existing `/api/v1/users` GET endpoint and `/health`, as a starting point the user extends themselves.

**Edited files:**
- `helpers/*.js` — add a new confirm prompt, "Include Swagger/OpenAPI docs?", threaded into `templateData` as `useSwagger`.
- `helpers/copy.js` — only copy `docs/openapi.yaml.ejs` when `useSwagger` is true.
- `templates/*/src/index.*.ejs` — conditionally import `swagger-ui-express` + `yamljs` (or `js-yaml`), load `docs/openapi.yaml`, and mount at `/api-docs`.
- `package.json.ejs` (both trees) — conditionally add `swagger-ui-express` and a YAML-loading dependency.

**Test:** Scaffold with Swagger enabled, start the server, open `/api-docs` in a browser, confirm the Swagger UI renders and reflects the YAML file's contents. Scaffold with it disabled, confirm no swagger deps or `/api-docs` route exist.

---

## Step 14 — Tests scaffold (opt-in)

**Goal:** Offer a test setup (Jest or Vitest + Supertest — pick one as the default, Jest is the safer choice for broad compatibility) behind a prompt, with one real passing test.

**New template files:**
- `tests/health.test.js(.ts)` — a Supertest test hitting `/health`, asserting `200` and the expected body shape.
- `jest.config.js.ejs` (or vitest equivalent) — minimal config for ESM.

**Edited files:**
- prompts — add "Include a test setup?" confirm.
- `package.json.ejs` (both trees) — conditionally add `jest`/`vitest`, `supertest`, and a `"test"` script that actually runs them (replacing the placeholder `"test": "echo ... && exit 1"` — note this placeholder is in *scaffoldx's own* `package.json`, not the template; leave scaffoldx's own untouched here, this step is about the generated app's `package.json` only).

**Test:** Scaffold with tests enabled, run the package manager's test command, confirm `tests/health.test.js` passes against a real running instance of the app (or an in-process supertest against the exported `app`, if you refactor `index.*` to export `app` separately from the `listen` call — recommended, do that refactor here if not already done in Step 11).

---

## Step 15 — Lint config for generated apps

**Goal:** Ship a minimal ESLint config in generated projects (current ESLint majors default to flat config — confirm the ESLint version you pin and use the matching config format).

**New template files:**
- `eslint.config.js.ejs` (flat config) — sensible defaults for Node/ESM, with a TS variant using `typescript-eslint` for the TS tree.

**Edited files:**
- `package.json.ejs` (both trees) — add `eslint` (+ `typescript-eslint` for TS) as devDependencies and a `"lint"` script.

**Test:** Scaffold both trees, run the lint script, confirm it exits 0 on the untouched generated code, then intentionally introduce an obvious lint violation (e.g. unused var) and confirm it's caught.

---

## Step 16 — `engines` field / Node version pin

**Goal:** Pin a minimum Node version in generated `package.json`, especially now that Prisma 7 requires Node ≥ 20.19.

**Edited files:**
- `package.json.ejs` (both trees) — add `"engines": { "node": ">=20.19.0" }`.

**Test:** No functional test needed beyond confirming the field renders correctly in a scaffolded `package.json` for each flow.

---

## Step 17 — Regression pass

**Goal:** Before touching local-testing/publish workflow, re-run the full manual checklist across every combination introduced so far.

**Test:** Re-scaffold all of: {JS, TS} × {no-db, Postgres+Prisma, Mongo+Mongoose, Mongo+Prisma} × {swagger on/off} × {tests on/off}, for at least two different package managers. For each: install succeeds, server starts, `/health` and `/api/v1/users` respond, graceful shutdown works, lint passes. Fix anything that breaks before moving to Step 18 — this is the gate before documentation and publishing.

---

## Step 18 — Local testing workflow (before publishing)

This isn't a code step — it's the process for testing the `scaffoldx` CLI itself locally, since npm packages with a `bin` entry need to be linked or packed to test the real global-install experience.

**Option A — `npm link` (fastest, good for iterating):**
```bash
cd /path/to/scaffoldx        # the scaffoldx repo root
npm link                     # creates a global symlink to this local package

cd /tmp/some-scratch-dir
scaffoldx                    # runs your local code as if globally installed
```
When done testing:
```bash
npm unlink -g scaffoldx
```
Caveat: `npm link` uses a symlink into your local `node_modules`/global bin, so it can mask packaging mistakes (e.g. a file you forgot to include in the published package). Use it for fast iteration, not as the final check.

**Option B — `npm pack` (closer to the real published experience, use this before every publish):**
```bash
cd /path/to/scaffoldx
npm pack                     # produces scaffoldx-<version>.tgz in the current dir

cd /tmp/some-scratch-dir
npx /path/to/scaffoldx/scaffoldx-<version>.tgz
```
This installs and runs the CLI from the actual tarball that would be uploaded to npm, so it will catch a missing `files` entry in `package.json` or anything else that only breaks in a real install.

**Test:** Run through the full checklist from Step 17 once via `npm link` (fast iteration) and once via `npm pack` (final check) before publishing.

---

## Step 19 — Versioning and publishing

**Goal:** Bump the version correctly and publish to npm under your account.

**One-time setup (if not already logged in on this machine):**
```bash
npm login
npm whoami          # confirm it prints your npm username
```

**Versioning** (this repo is currently at `2.0.2` in `package.json`; the changes in this plan are feature additions with some breaking behavior — e.g. Postgres now forces Prisma v7, generated project structure changed — so a **major** bump to `3.0.0` is appropriate, not a patch):
```bash
git status                  # make sure your working tree is clean first — npm version requires this
npm version major           # bumps package.json to 3.0.0, commits, and creates a git tag v3.0.0
```
Use `npm version minor` instead if you decide the changes should be additive/non-breaking (e.g. if you keep the pre-change directory-overwrite and ORM-selection behavior available under new opt-in flags rather than replacing it — your call based on how you actually shipped it).

**Publishing:**
```bash
npm publish
```
(No `--access public` flag needed — `scaffoldx` is an unscoped package name, that flag only matters for scoped packages like `@yourname/scaffoldx`.)

**Push the version tag:**
```bash
git push --follow-tags
```

**Verify the live package:**
```bash
npx scaffoldx@latest
```
Run it in a fresh scratch directory and confirm the published version matches what you just shipped, and that the CLI works end-to-end from a true fresh install (this is the final real-world check, separate from `npm pack` testing).

---

## Step 20 — README update (assign to Google Antigravity as the final task)

**Goal:** Bring `README.md` up to date with everything shipped in this plan.

**Edited files:**
- `README.md` — update to document: the new directory-handling prompt (clear/ignore/exit), package manager selection and how to run the generated app with npm/pnpm/yarn/bun specifically (a command table, one row per manager, for install/dev/start/test/lint), the database-type step (Postgres/MongoDB) and what each produces (docker-compose, Prisma version used, model shape), the Swagger opt-in and where the spec lives, the tests opt-in, the new default middleware (helmet/rate-limit/morgan) and health endpoint, the config/env-validation behavior and what happens on a missing required var, graceful shutdown behavior, and an updated folder-structure diagram for both the JS and TS output trees reflecting `services/`, `config/`, `middleware/security.*`, `routes/health.*`, `docs/openapi.yaml` (conditional), `tests/` (conditional), `docker-compose.yml` (conditional), `.env.example`, `eslint.config.js`.
- Bump any version references in the README's examples to match the new CLI flow.

**Test:** Have a second person (or a fresh read-through with no prior context) follow the README's "Usage" section exactly, using a package manager other than npm, and confirm they can get a running server with no undocumented steps.

---

## Step 21 — CONTRIBUTING.md (final task)

**Goal:** Add contributor documentation for the `scaffoldx` project itself (this is a doc about contributing to the CLI tool's own repo, not something generated into user projects).

**New files:**
- `CONTRIBUTING.md` — should cover: how to fork/clone and set up the repo, the `npm link` local-testing workflow from Step 18 (reference it rather than duplicating), the repo's structure (tool source vs. templates, and that template changes must be mirrored across the JS/TS trees), the manual checklist from Step 0/17 as the expected pre-PR smoke test, commit/PR conventions, and how versioning/publishing works (link to Step 19, but note that only the maintainer publishes — contributors just open PRs).

**Edited files:**
- `README.md` — add a short "Contributing" section linking to `CONTRIBUTING.md` (replacing the current one-line "Contributions are welcome" blurb).

**Test:** No functional test — review for completeness against the checklist above; confirm every internal link (e.g. to sections of `README.md`) resolves correctly.
