# ScaffoldX Manual Smoke Test Checklist

This checklist defines the manual test flows to run across ScaffoldX versions and features to prevent regressions.

---

## The 6 Core Baseline Flows

| Flow ID | Language | Database | ORM | Expected Starter Behavior |
|---------|----------|----------|-----|---------------------------|
| **F1** | JavaScript | None | None | Minimal Express server in JS |
| **F2** | TypeScript | None | None | Minimal Express server in TS with tsconfig/nodemon |
| **F3** | JavaScript | MongoDB | Mongoose | Mongoose connect + User model in JS |
| **F4** | TypeScript | MongoDB | Mongoose | Mongoose connect + User model in TS |
| **F5** | JavaScript | Database | Prisma | Prisma client + schema.prisma in JS |
| **F6** | TypeScript | Database | Prisma | Prisma client + schema.prisma in TS |

---

## Per-Flow Verification Steps

For each flow, verify the following:

1. **Scaffold Generation:**
   - [ ] CLI prompts complete without errors
   - [ ] Appropriate directory structure created
   - [ ] Correct dependencies in generated `package.json`
   - [ ] No misplaced language tools (e.g., TS tools in JS project)
   - [ ] `.gitignore` and `.env` / `.env.example` present and correct

2. **Installation & Setup:**
   - [ ] Package manager install runs and completes cleanly
   - [ ] If Prisma: `prisma init` and model generation succeed

3. **Runtime & Endpoints:**
   - [ ] Dev server starts (`<pkg-mgr> run dev`) without compile or runtime crash
   - [ ] Default root / health route returns expected status
   - [ ] Users route (`GET /api/v1/users`) returns expected response
   - [ ] Server stops cleanly on interrupt (Ctrl+C / SIGINT)

---

## Edge Case & Safety Checks

- [ ] **Directory Collision - Non-empty Target:**
  - Clear existing content works as expected.
  - Abort/Exit cleanly exits without modifying or deleting files.
- [ ] **Install Failure Handling:**
  - Network/tool failure during install reports clear error and exits non-zero.

---

## v2.0.2 Baseline Test Results

Date: 2026-09-28
Environment: Windows, Node.js v20.x / v22.x, npm

| Flow | Status | Notes / Known Baseline Issues |
|------|--------|--------------------------------|
| **F1: JS + No-DB** | PASS | Scaffolds and starts successfully. Missing `.env` / `.env.example`. |
| **F2: TS + No-DB** | PASS | Scaffolds and starts successfully with ts-node/nodemon. Missing `.env` / `.env.example`. |
| **F3: JS + Mongoose** | PARTIAL | Scaffolds files. **Known issue:** No `.env` created, instructions ask user to open nonexistent `.env`. |
| **F4: TS + Mongoose** | PARTIAL | Scaffolds files. **Known issue:** No `.env` created, instructions ask user to open nonexistent `.env`. |
| **F5: JS + Prisma** | PARTIAL | Scaffolds files. **Known issues:** TS dependencies (`typescript`, `ts-node`, `@types/node`) incorrectly placed in JS `devDependencies`. |
| **F6: TS + Prisma** | PASS | Scaffolds files and Prisma schema. Works as designed in v2. |
| **Directory collision** | FAIL | **Known bug:** `inquirer.prompt` for overwrite in `helpers/appname.js` missing `await`, silently continues / crashes. |
| **Install error handling** | FAIL | **Known bug:** `exec('npm install')` errors logged but not rejected; CLI exits 0 regardless. |

---

## v3.0.0 Regression Test Results

Date: 2026-10-02
Environment: Windows, Node.js v22.x, npm, pnpm

| Flow / Feature | Status | Notes / Fix Verifications |
|---|---|---|
| **F1: JS + No-DB** | PASS | Scaffolds cleanly with `.env`, `.env.example`, `.gitignore` (with AI ignores), and lean scripts. |
| **F2: TS + No-DB** | PASS | Extensionless TS imports, `tsx watch`, `tsup build`, `vitest run`, and `eslint .` all succeed. |
| **F3: JS + Mongoose** | PASS | Standalone single-node Mongo `docker-compose.yml` (no replica set); Compass connects directly. |
| **F4: TS + Mongoose** | PASS | Standalone single-node Mongo `docker-compose.yml`, extensionless imports, Prettier-formatted output. |
| **F5: JS + Postgres (Prisma)** | PASS | Pure JS dependencies (no stray TS dependencies in devDependencies); Prisma scripts included. |
| **F6: TS + Postgres (Prisma)** | PASS | Full Prisma + Postgres stack with Prisma scripts (`docker:up`, `docker:down`, `db:*`). |
| **F7: TS + Mongo (Prisma)** | PASS | Replica set configured in `docker-compose.yml` for Prisma Mongo compatibility. |
| **Directory collision handling** | PASS | Properly prompts (Clear / Ignore / Exit) and awaits response; clears directory when requested. |
| **Install error handling** | PASS | Rejects on spawn error, logs chalk error, exits code 1. |
| **Step 1: appName propagation** | PASS | No `._dev` bug when scaffolding into `.`. Resolved directory basename used properly. |
| **Step 2: Mongo docker-compose split** | PASS | Mongoose gets single-node compose; Prisma gets replica set compose with keyfile. |
| **Step 3: Extensionless TS imports** | PASS | Bundler module resolution, extensionless local imports compile cleanly with `tsx` and `tsup`. |
| **Step 4: `--yes` flag & overrides** | PASS | `scaffoldx --yes` and flag combinations (`--js`, `--mongodb`, `--pm <mgr>`, `--no-db`) complete non-interactively with zero prompts. |
| **Step 5: Lean package.json scripts** | PASS | Only relevant `docker:*` and `db:*` scripts generated for active ORM/DB setup. |
| **Step 6: Prettier output formatting** | PASS | Cleanly formatted source, JSON, YAML, and collapsed blank lines in `.env`. |
| **Step 7: AI tooling metadata ignores** | PASS | `.agents/`, `.claude/`, `.windsurf/`, and `skills-lock.json` safely ignored. |
