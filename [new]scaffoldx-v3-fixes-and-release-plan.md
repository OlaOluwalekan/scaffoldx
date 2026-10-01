# ScaffoldX v3 — Fixes & Release Plan

**Audience:** Google Antigravity, continuing the v3 implementation (Steps 0–18 already done).
**Scope:** Fix the issues found during testing, then finish with README, CONTRIBUTING.md, and publishing — in that order, since publishing is the last step and depends on the docs being final.

Same rules as before: one step at a time, test before moving on, commit after each passing step.

---

## Step 1 — Fix the `appName` propagation bug (the `._dev` issue)

**Root cause, confirmed from the code you attached:** in `index.js`, `templateData.appName` is correctly resolved (`appName === '.' ? path.basename(process.cwd()) : appName`) and that resolved value is what every `.ejs` template renders with — which is why `docker-compose.yml` got the name right. But the call to `installDependencies(targetDir, port, appName, orm, packageManager, databaseType)` passes the **raw, unresolved `appName`** (still literally `'.'` when scaffolding into the current directory), not `templateData.appName`. Every string built inside `install.js` from that parameter (`${appName}_dev`) inherits the bug.

**Edited files:**
- `index.js` — change the `installDependencies(...)` call to pass `templateData.appName` instead of the raw `appName` variable.
- `helpers/install.js` — rename the parameter from `appName` to `resolvedAppName` (or similar) purely for clarity, so a future contributor can't reintroduce the same mix-up by accident. No logic change needed beyond the rename once the caller is fixed.

**Test:** Scaffold with `appName` left as `.` (current directory) and Postgres selected. Confirm the printed instructions, the generated `.env`, and `docker-compose.yml` all show the **same** resolved directory-basename-based `_dev` database name — not `._dev` anywhere. Repeat with an explicit app name (e.g. `my-app`) to confirm it still works in that branch too.

---

## Step 2 — Split the Mongo docker-compose by ORM (fixes the Compass connection issue)

**Why this happens:** Prisma's MongoDB connector requires MongoDB to run as a replica set (even single-node) because it uses multi-document transactions internally — that's a real Prisma requirement, and the keyfile + `rs.initiate` setup you built is the correct way to satisfy it. But Mongoose has no such requirement, and the replica-set/auth/keyfile machinery is exactly the kind of extra moving part that causes `Server selection timed out` in Compass (SDAM topology discovery across the replica set config, keyfile auth handshake, timing of the init container, etc.) when it isn't actually needed. The fix isn't to debug Compass's replica-set discovery — it's to **not run a replica set at all when Mongoose is the ORM**, since nothing requires it.

**New template files** (both `templates/javascript/` and `templates/typescript/`):
- `docker-compose.mongo-mongoose.yml.ejs` — a plain single-node `mongo:7` container: root username/password auth (`admin`/`secret_password`, consistent with your existing credentials), `27017:27017`, one named volume, **no keyfile, no replica set, no init container**.
- `docker-compose.mongo-prisma.yml.ejs` — your existing `docker-compose.mongo.yml.ejs` content, renamed (replica set + keyfile, unchanged — Prisma needs it).

**Edited files:**
- `helpers/copy.js` — replace the single `file === 'docker-compose.mongo.yml.ejs'` branch with a selection between the two new filenames, keyed on `data.orm === 'Mongoose'` vs `data.orm === 'Prisma'` (both still gated on `data.databaseType === 'MongoDB'`), writing either to `docker-compose.yml` at the destination, same as today.
- `templates/javascript/.env.example.ejs`, `templates/typescript/.env.example.ejs` — for the Mongoose branch, drop `&replicaSet=rs0` from the `MONGO_URI` (keep `?authSource=admin` only); leave the Prisma/MongoDB branch's `DATABASE_URL` unchanged (it still needs `replicaSet=rs0`).
- `helpers/install.js` — same split for the `targetUrl`/`mongoDbUrl` strings used in the printed getting-started instructions: Mongoose gets the no-replica-set URI, Prisma+Mongo keeps the replica-set URI.

**Test:**
1. Scaffold TS + MongoDB + Mongoose. `docker compose up -d`, confirm the container comes up with no init/keyfile containers involved. Connect with MongoDB Compass using the printed connection string — confirm it connects and you can browse collections (this is the actual regression test for the reported bug).
2. Scaffold TS + MongoDB + Prisma — confirm it's unchanged from current behavior (replica set, keyfile, app connects, `npx prisma studio` works). Compass may still struggle here; that's expected and fine — mention in Step 9 (README) that Prisma Studio is the recommended viewer for the Prisma+Mongo path, Compass for the Mongoose path.

---

## Step 3 — Extensionless TypeScript imports

**Goal:** Let generated TS code import without `.js` suffixes. The current `"module": "NodeNext" / "moduleResolution": "NodeNext"` setup is Node-ESM-accurate, which is exactly why it *requires* the extension — Node's own ESM loader has no extension-guessing. The clean way to drop the requirement without reintroducing CommonJS is to let a bundler resolve imports at build time and a bundler-aware transpiler run them in dev — so this step changes the dev/build toolchain, not just a config flag.

**Edited files (`templates/typescript/` only):**
- `tsconfig.json.ejs` — change `"module": "NodeNext"` → `"module": "ESNext"`, `"moduleResolution": "NodeNext"` → `"moduleResolution": "Bundler"`, add `"noEmit": true` (emission now happens via the bundler, not `tsc`). Keep `"strict"`, `"rootDir"`, etc. as-is.
- `package.json.ejs` (typescript) —
  - devDependencies: add `tsx` and `tsup`; remove `nodemon` (TS path only — the JavaScript template keeps `nodemon`, it's unaffected by this step).
  - scripts: replace `"predev"`/`"dev"` with `"dev": "tsx watch src/<%= entryPoint %>.ts"`; replace the build-via-raw-`tsc` approach with `"build": "tsup src/<%= entryPoint %>.ts --format esm --out-dir <%= outputFolder %>"`; keep `"start": "node <%= outputFolder %>/<%= entryPoint %>.js"`; add `"typecheck": "tsc --noEmit"` (since `tsc` is no longer doing the build, keep it around purely for type-checking — worth wiring into a future CI step, not required now).
- Delete `nodemon.json.ejs` from the TypeScript template tree (no longer used) and remove its copy-step special-casing in `helpers/copy.js` (the `file === 'nodemon.json'` skip-for-JS logic in the language check can go too, since nodemon.json no longer exists on the TS side at all).

**Test:** Scaffold a TS app, write a second trivial file (e.g. `src/utils/greet.ts` exporting a function) and import it from the entry file **without** a `.js` extension. Run `<pm> run dev` — confirm it starts and the import resolves. Run `<pm> run build` then `<pm> run start` — confirm the built output also runs correctly. Run `<pm> run typecheck` — confirm it reports no errors on the untouched generated code.

---

## Step 4 — `--yes` flag, plus a small set of override flags

**Your instinct to keep flags minimal is the right call** — a scaffolder that mirrors every prompt as a flag turns into a second UI to maintain and document for marginal benefit over just answering the prompts. Recommended scope: one `--yes` flag that applies the exact defaults you listed, plus a handful of override flags for the choices people actually want to script around (language, database, package manager) — not one for every field like port/entry/output, which stay prompted even under `--yes` unless you pass the override. This keeps the surface small while still making `scaffoldx --yes --mongodb` a reasonable one-liner.

**Edited files:**
- `index.js` — add to the `commander` setup: `.option('-y, --yes', 'Skip prompts and use defaults')`, `.option('--js', 'Use JavaScript')`, `.option('--ts', 'Use TypeScript (default)')`, `.option('--postgres', 'Use Postgres + Prisma (default)')`, `.option('--mongodb', 'Use MongoDB')`, `.option('--no-db', 'Skip database setup')`, `.option('--pm <manager>', 'npm|pnpm|yarn|bun')`. Read `const opts = program.opts();` after `program.parse()`.
- `helpers/appname.js`, `helpers/packageManager.js`, `helpers/language.js`, `helpers/entry.js`, `helpers/output.js`, `helpers/database.js`, `helpers/port.js`, `helpers/tests.js` — each `collect*`/`*Options` function takes an additional optional `opts` argument; when `opts.yes` is true, return the default (or the matching override flag's value) immediately instead of calling `inquirer.prompt`. Concretely: app name `'.'` + "Clear existing content"; package manager from `--pm` or `npm`; language from `--js`/`--ts` or `TypeScript`; entry `index.ts`; output `dist`; database `true` with type from `--mongodb`/`--no-db` or `Postgres` (orm resolved the same way it already is — Postgres⇒Prisma, Mongo⇒prompt is skipped too under `--yes`, default to `Mongoose` unless you want `--mongodb` to still ask ORM — simplest: under `--yes`, Mongo defaults to `Mongoose`); port `3000`; tests `true`.

**Test:** Run `scaffoldx --yes` in an empty scratch dir with no further input — confirm it scaffolds a TS + Postgres + Prisma + npm + tests project with zero prompts and matches the defaults listed above exactly. Run `scaffoldx --yes --js --mongodb --pm pnpm` — confirm it scaffolds JS + MongoDB + Mongoose (or your chosen default ORM) with pnpm, still with zero prompts.

---

## Step 5 — Useful `package.json` scripts, kept lean

**Goal:** Add the small set of scripts people actually reach for, conditioned on what was selected — not every script imaginable.

**Edited files:**
- `templates/javascript/package.json.ejs`, `templates/typescript/package.json.ejs` — add, each gated on the relevant condition:
  - `"docker:up": "docker compose up -d"`, `"docker:down": "docker compose down"` — only when `useDatabase` is true (a `docker-compose.yml` exists).
  - `"db:generate": "prisma generate"`, `"db:migrate": "prisma migrate dev"`, `"db:studio": "prisma studio"` — only when `orm === 'Prisma'`. Skip a `db:reset` script — `prisma migrate reset` is destructive enough that it's better typed out deliberately than muscle-memoried as `pnpm db:reset`; mention the full command in the README instead.
  - Mongoose gets no `db:*` scripts (nothing to generate/migrate for a schemaless store).
  - `"build"` (TS only, added in Step 3) and `"typecheck"` (TS only, added in Step 3) stay as-is from that step.

**Test:** For each of the four `{Postgres+Prisma, Mongo+Prisma, Mongo+Mongoose, no-db}` combinations, confirm the generated `package.json` has exactly the scripts that combination should have — no `db:*` scripts leaking into the Mongoose or no-db cases, no `docker:*` scripts in the no-db case — and that each script actually runs successfully against a scaffolded instance.

---

## Step 6 — Format generated output

**Goal:** Clean up the blank-line/whitespace artifacts left behind by EJS conditionals, so scaffolded files look hand-written.

**Edited files:**
- `helpers/copy.js` — after `ejs.render(content, data)` and before `fs.writeFile`, run the result through Prettier for any file Prettier has a parser for (`.js`, `.ts`, `.json`, `.yml`/`.yaml`) using `prettier.format(render, { ...options, filepath: destPath })` (Prettier 3's async `format`, with `filepath` so it infers the right parser from the destination extension). Use the same style options already in the repo's own `.prettierrc` (`tabWidth: 2, semi: true, singleQuote: true, trailingComma: 'es5'`) passed explicitly, so generated-app formatting matches the tool's own conventions. For `.env`/`.env.example` (no sensible Prettier parser), just collapse 3+ consecutive blank lines down to 1 with a small regex instead.
- `package.json` (scaffoldx's own, root) — `prettier` is already a dependency here, so no new dependency needed; just add the `import prettier from 'prettier';` to `copy.js`.

**Test:** Scaffold a TS + Mongo + Mongoose app (a combination that exercises several EJS conditionals) and open `src/index.ts`, `package.json`, and `docker-compose.yml` — confirm no leftover double-blank-lines or stray whitespace from removed conditional blocks, and that the formatting is consistent with the rest of the codebase's style.

---

## Step 7 — The `.agents`, `.claude`, `.windsurf`, `skills-lock.json` files

**Finding:** these are not coming from ScaffoldX. There's no template for any of them anywhere in the repo, and `copy.js` only ever writes files it reads from `templates/<language>/`. The much more likely explanation: when you opened the scaffolded folder in VS Code, some AI coding assistant/extension active in that editor (Claude Code, Windsurf, or Google Antigravity itself, going by the folder names) auto-initialized its own project-level config/metadata the moment it saw the new workspace — that's normal behavior for those tools and unrelated to the scaffold output itself. Worth double-checking which extensions are active in that VS Code window the next time it happens, but there's no ScaffoldX bug to fix here.

**Edited files:**
- `templates/javascript/.gitignore.ejs`, `templates/typescript/.gitignore.ejs` — add `.agents/`, `.claude/`, `.windsurf/`, and `skills-lock.json` as defensive entries, so that if any AI tool initializes these in a contributor's or user's environment, they never get committed. This is good hygiene regardless of root cause.

**Test:** No functional test beyond confirming the new lines render correctly into a scaffolded `.gitignore`.

---

## Step 8 — Full regression pass

**Goal:** Before moving to documentation and publishing, confirm nothing from Steps 1–7 broke anything from the earlier plan.

**Test:** Re-run the full matrix from `test/manual-checklist.md` (all 6 baseline flows) plus: Mongo+Mongoose Compass connectivity (Step 2), extensionless TS imports + build + typecheck (Step 3), both `--yes` variants (Step 4), the new scripts per combination (Step 5), and a visual formatting check (Step 6) — across at least two package managers. Fix anything that regressed before proceeding. Update the "v2.0.2 Baseline" table in `test/manual-checklist.md` with a new dated results table for this round so there's a record.

---

## Step 9 — README update

**Goal:** Bring `README.md` fully up to date — this is the last content step before publishing, since the published package should ship with accurate docs.

**Edited files:**
- `README.md` — rewrite to cover: the directory-handling prompt (clear/ignore/exit); package manager selection and a command table (install/dev/build/start/test/lint/docker:up/db:generate etc.) per manager; the `--yes` flag and each override flag, with example invocations; the database-type step and what each combination produces (which `docker-compose.yml` variant, which Prisma version, Mongoose vs. Prisma Studio vs. Compass for viewing data — note explicitly that Compass works for the Mongoose+Mongo setup and Prisma Studio is the recommended viewer for the Prisma+Mongo setup); the Swagger opt-in and where the spec lives; the tests opt-in; the default middleware (helmet/rate-limit/morgan) and `/health`; env validation behavior; graceful shutdown; the extensionless-import TS toolchain (tsx for dev, tsup for build) and why `tsc` alone no longer builds the project; an updated folder-structure diagram for both JS and TS output reflecting every file introduced across both plans.
- Replace the current one-line "Contributions are welcome" blurb with a short "Contributing" section linking to `CONTRIBUTING.md` (written next step).

**Test:** Have a fresh read-through (no prior context) follow the README's Usage section exactly, using a package manager other than npm and at least one `--yes`-style invocation, and confirm a running server results with no undocumented steps.

---

## Step 10 — CONTRIBUTING.md

**Goal:** Contributor docs for the ScaffoldX repo itself.

**New files:**
- `CONTRIBUTING.md` — cover: fork/clone/setup; the local-testing workflow (`npm link` for fast iteration, `npm pack` + `npx <tarball>` as the final pre-publish check — same commands as Step 18 of the prior plan, link to or restate them); repo structure (tool source in `helpers/`/`index.js` vs. templates in `templates/<language>/`, and that template changes must be mirrored across both JS and TS trees); the manual checklist in `test/manual-checklist.md` as the expected pre-PR smoke test; commit/PR conventions; a note that only the maintainer publishes to npm, contributors just open PRs.

**Test:** Review against the list above for completeness; confirm any links into `README.md` resolve.

---

## Step 11 — Versioning and publishing (last)

**Goal:** Ship it, now that code, docs, and CONTRIBUTING.md are all final.

**Pre-publish local check (do this before anything below):**
```bash
cd /path/to/scaffoldx
npm pack                      # builds scaffoldx-<version>.tgz from the real package contents

cd /tmp/some-scratch-dir
npx /path/to/scaffoldx/scaffoldx-<version>.tgz --yes
```
Confirm this works exactly like the `npm link`-based testing you've been doing throughout — this is the closer-to-real-world final gate.

**One-time login (if not already logged in on this machine):**
```bash
npm login
npm whoami        # confirm it prints your npm username
```

**Versioning:** the repo is currently `2.0.2`. Everything shipped since (directory-handling change, package-manager support, database-type step with Postgres forcing Prisma, new default middleware, new project structure, TS toolchain change) is a major, breaking set of changes to the scaffolded output — bump to `3.0.0`:
```bash
git status                  # must be clean — npm version requires this
npm version major           # bumps package.json to 3.0.0, commits, tags v3.0.0
```

**Publish:**
```bash
npm publish
```
(No `--access public` needed — `scaffoldx` is unscoped.)

**Push the tag:**
```bash
git push --follow-tags
```

**Verify the live package** — run it in a brand-new scratch directory against the real published version, not your local checkout:
```bash
npx scaffoldx@latest --yes
```
Confirm the version printed/installed matches `3.0.0` and the CLI behaves end-to-end exactly as tested in Step 8.
