# ScaffoldX

[![npm version](https://badge.fury.io/js/scaffoldx.svg)](https://www.npmjs.com/package/scaffoldx)
[![license](https://img.shields.io/npm/l/scaffoldx.svg)](https://www.npmjs.com/package/scaffoldx)

**ScaffoldX** is a production-ready CLI scaffolder for Express applications in JavaScript and TypeScript. It generates clean, modern server architectures complete with strict environment validation, security middlewares, database options (Postgres/MongoDB via Prisma or Mongoose), OpenAPI/Swagger docs, testing setups (Vitest + Supertest), and Docker Compose configurations with zero boilerplate fatigue.

---

## Features

- **Modern TypeScript & JavaScript**:
  - TypeScript builds powered by [tsx](https://github.com/privatenumber/tsx) for fast dev watching and [tsup](https://tsup.egoist.dev/) for bundling.
  - Native extensionless imports (`"moduleResolution": "Bundler"`, `"noEmit": true`).
- **Flexible Database & ORM Integrations**:
  - **PostgreSQL**: Configured with Prisma (Prisma 7 with `@prisma/adapter-pg` driver adapter) and Docker Compose.
  - **MongoDB**:
    - **Mongoose**: Standalone single-node Docker Compose setup compatible with MongoDB Compass out of the box.
    - **Prisma**: Configured with single-node replica set and keyfile required by the Prisma Mongo engine, viewable via Prisma Studio.
  - **No Database**: Minimal, ultra-lean setup without database drivers or containers.
- **Production-Ready Middlewares Built In**:
  - Security headers via `helmet`.
  - Rate limiting via `express-rate-limit`.
  - Configurable CORS via `cors` (origin configurable via `CORS_ORIGIN`).
  - HTTP request logging via `morgan`.
  - Standardized health check route at `/health`.
  - Centralized error handler and custom error hierarchy (`BadRequestError`, `NotFoundError`, `UnauthenticatedError`, `CustomAPIError`).
- **Strict Environment Validation**:
  - Typesafe configuration parsing and validation using [envalid](https://github.com/af/envalid).
- **Graceful Shutdown**:
  - Handles `SIGINT` and `SIGTERM` with in-flight request draining and clean database disconnection.
- **Interactive or Non-Interactive**:
  - Rich interactive prompts with collision safety (Clear, Ignore, Exit).
  - One-line non-interactive scaffolding via `-y, --yes` and CLI override flags.
- **Testing & Code Quality**:
  - Opt-in unit/integration testing with [Vitest](https://vitest.dev/) and [Supertest](https://github.com/ladjs/supertest).
  - Modern ESLint 9 flat configuration (`eslint.config.js`).
  - Automated Prettier formatting on generated project files.

---

## Installation & Quick Start

Scaffold directly using `npx` (recommended):

```bash
npx scaffoldx
```

Or install globally:

```bash
npm install -g scaffoldx
scaffoldx
```

---

## Non-Interactive & CLI Flags

Use `-y` or `--yes` to skip all prompts and use sensible defaults:
- **Default with `--yes`**: TypeScript, Postgres + Prisma, npm, port 3000, tests enabled, target directory `.` (clears target if non-empty).

### Available CLI Flags

| Flag | Description |
|---|---|
| `-y, --yes` | Skip all prompts and scaffold immediately with defaults |
| `--ts` | Use TypeScript (default) |
| `--js` | Use JavaScript |
| `--postgres` | Use Postgres + Prisma (default) |
| `--mongodb` | Use MongoDB (defaults to Mongoose under `--yes`) |
| `--no-db` | Skip database setup and docker containers |
| `--pm <manager>` | Specify package manager (`npm`, `pnpm`, `yarn`, `bun`) |

### Example Invocations

```bash
# Quick TypeScript + Postgres starter
npx scaffoldx --yes

# JavaScript + MongoDB + Mongoose starter using pnpm
npx scaffoldx --yes --js --mongodb --pm pnpm

# Minimal TypeScript API with no database using bun
npx scaffoldx --yes --no-db --pm bun
```

---

## Interactive Prompts Guide

When run without flags, ScaffoldX guides you through the setup:

1. **App Name & Target Directory**:
   - Provide a folder name or `.` to scaffold into the current working directory.
   - **Collision Handling**: If the target directory already contains files, you will be prompted:
     - **Clear existing content**: Empties directory before generating files.
     - **Scaffold alongside existing content**: Writes project files without deleting existing contents.
     - **Exit without scaffolding**: Cancels operation cleanly without touching the filesystem.
2. **Package Manager Selection**:
   - Automatically detects your active package manager (`pnpm`, `yarn`, `bun`, or `npm`) and sets it as the default choice.
3. **Language Selection**:
   - Choose between **TypeScript** or **JavaScript**.
4. **Entry Point**:
   - Project entry point (default: `index.ts` or `index.js`).
5. **Output Folder** *(TypeScript only)*:
   - Output directory for compiled build artifacts (default: `dist`).
6. **Database & ORM**:
   - **Postgres**: Automatically pairs with **Prisma**. Generates `prisma/schema.prisma`, `prisma.config.ts`, connection client, and Postgres `docker-compose.yml`.
   - **MongoDB**: Choose between:
     - **Mongoose**: Standalone single-node Mongo container; directly viewable and connectable via MongoDB Compass.
     - **Prisma**: Replica-set Mongo container with keyfile required by Prisma Mongo engine; viewable via Prisma Studio (`npm run db:studio`).
   - **None**: Skips database setup.
7. **Server Port**:
   - Port number for the HTTP server (default: `3000`).
8. **Test Scaffolding**:
   - Opt-in Vitest + Supertest suite with pre-configured tests for `/health` and routes.

---

## Package Manager Commands

Scaffolded projects include lean scripts conditioned on your selected setup:

| Task | npm | pnpm | yarn | bun |
|---|---|---|---|---|
| **Install** | `npm install` | `pnpm install` | `yarn` | `bun install` |
| **Dev Server** | `npm run dev` | `pnpm dev` | `yarn dev` | `bun run dev` |
| **Build (TS)** | `npm run build` | `pnpm build` | `yarn build` | `bun run build` |
| **Start (Prod)** | `npm run start` | `pnpm start` | `yarn start` | `bun run start` |
| **Typecheck (TS)** | `npm run typecheck` | `pnpm typecheck` | `yarn typecheck` | `bun run typecheck` |
| **Lint** | `npm run lint` | `pnpm lint` | `yarn lint` | `bun run lint` |
| **Test** | `npm run test` | `pnpm test` | `yarn test` | `bun run test` |
| **Start DB** *(if DB)* | `npm run docker:up` | `pnpm docker:up` | `yarn docker:up` | `bun run docker:up` |
| **Stop DB** *(if DB)* | `npm run docker:down` | `pnpm docker:down` | `yarn docker:down` | `bun run docker:down` |
| **Prisma Generate** *(if Prisma)* | `npm run db:generate` | `pnpm db:generate` | `yarn db:generate` | `bun run db:generate` |
| **Prisma Migrate** *(if Prisma)* | `npm run db:migrate` | `pnpm db:migrate` | `yarn db:migrate` | `bun run db:migrate` |
| **Prisma Studio** *(if Prisma)* | `npm run db:studio` | `pnpm db:studio` | `yarn db:studio` | `bun run db:studio` |

> [!NOTE]
> Database reset: For destructive migrations, run `<pm> prisma migrate reset` deliberately rather than relying on a script shortcut.

---

## TypeScript Toolchain

ScaffoldX v3 uses a modern TypeScript toolchain:
- **`tsx`** (`npm run dev`): Executes and watches TypeScript files directly with zero transpile overhead.
- **`tsup`** (`npm run build`): Fast esbuild-backed bundler producing production ESM output in `dist/`.
- **`tsc --noEmit`** (`npm run typecheck`): Typechecking without emitting files.
- **Extensionless Imports**: Uses `"moduleResolution": "Bundler"` so you write `import config from './config/index'` without manual `.js` suffixes in TypeScript.

---

## API Documentation & Middleware

- **OpenAPI / Swagger UI**:
  - Interactive API documentation available at `/docs` out of the box.
  - The OpenAPI 3.0 specification file is located at `src/docs/openapi.yaml`.
- **Configurable CORS**:
  - Set `CORS_ORIGIN` in `.env` to a specific origin (e.g. `http://localhost:5173`) or leave as `*`.
- **Health Check**:
  - Dedicated endpoint at `GET /health` responding with status, timestamp, and environment.

---

## Folder Structure

### TypeScript Project (`tsup` + `tsx`)

```text
my-app/
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml          # If database selected
├── eslint.config.js
├── package.json
├── prisma.config.ts            # If Prisma selected
├── README.md
├── tsconfig.json
├── vitest.config.ts            # If tests selected
├── src/
│   ├── index.ts
│   ├── config/
│   │   └── index.ts            # Envalid schema & environment validation
│   ├── controllers/
│   │   └── users.controller.ts
│   ├── db/                     # If database selected
│   │   └── connect.ts
│   ├── docs/
│   │   └── openapi.yaml        # Static OpenAPI 3.0 spec
│   ├── errors/
│   │   ├── bad-request-error.ts
│   │   ├── custom-error.ts
│   │   ├── not-found-error.ts
│   │   └── unauthenticated-error.ts
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   ├── not-found.ts
│   │   └── security.ts         # Helmet & rate limiter configuration
│   ├── models/                 # If Mongoose selected
│   │   └── User.model.ts
│   ├── prisma/                 # If Prisma selected
│   │   └── schema.prisma
│   └── routes/
│       └── users.routes.ts
└── tests/                      # If tests selected
    ├── app.test.ts
    └── users.test.ts
```

### JavaScript Project

```text
my-app/
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml          # If database selected
├── eslint.config.js
├── package.json
├── README.md
├── vitest.config.js            # If tests selected
├── src/
│   ├── index.js
│   ├── config/
│   │   └── index.js            # Envalid schema & environment validation
│   ├── controllers/
│   │   └── users.controller.js
│   ├── db/                     # If database selected
│   │   └── connect.js
│   ├── docs/
│   │   └── openapi.yaml        # Static OpenAPI 3.0 spec
│   ├── errors/
│   │   ├── bad-request-error.js
│   │   ├── custom-error.js
│   │   ├── not-found-error.js
│   │   └── unauthenticated-error.js
│   ├── middleware/
│   │   ├── error-handler.js
│   │   ├── not-found.js
│   │   └── security.js         # Helmet & rate limiter configuration
│   ├── models/                 # If Mongoose selected
│   │   └── User.model.js
│   ├── prisma/                 # If Prisma selected
│   │   └── schema.prisma
│   └── routes/
│       └── users.routes.js
└── tests/                      # If tests selected
    ├── app.test.js
    └── users.test.js
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, development setup, pre-PR checklist, and submission process.

---

## License

This project is licensed under the [MIT License](LICENSE).
