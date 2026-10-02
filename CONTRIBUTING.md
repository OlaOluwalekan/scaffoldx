# Contributing to ScaffoldX

Thank you for your interest in contributing to **ScaffoldX**! This guide outlines how to set up the repository locally, the codebase architecture, the testing workflow, and contribution guidelines.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful and constructive in issues, discussions, and pull requests.

---

## Getting Started

### 1. Fork & Clone

Fork the repository on GitHub, then clone your fork locally:

```bash
git clone https://github.com/OlaOluwalekan/scaffoldx.git
cd scaffoldx
```

### 2. Install Dependencies

Install the project dependencies:

```bash
npm install
```

---

## Codebase Architecture

The ScaffoldX repository is divided into two main layers:

```text
scaffoldx/
├── index.js                      # CLI entry point (Commander setup & prompt orchestration)
├── helpers/                      # CLI prompts and utility functions
│   ├── appname.js                # Target directory & collision handling (Clear/Ignore/Exit)
│   ├── packageManager.js         # PM detection & prompt
│   ├── language.js               # Language selection prompt
│   ├── entry.js                  # Entry point prompt
│   ├── output.js                 # Output folder prompt (TS only)
│   ├── database.js               # Database & ORM selection prompt
│   ├── port.js                   # Server port prompt & validation
│   ├── tests.js                  # Test suite prompt
│   ├── copy.js                   # Template renderer & Prettier formatter
│   └── install.js                # Dependency installation & success messaging
└── templates/                    # EJS templates for generated projects
    ├── javascript/               # JavaScript project template tree
    └── typescript/               # TypeScript project template tree
```

> [!IMPORTANT] > **Template Mirroring**: Whenever you make a change to an application feature or configuration in `templates/`, that change **must be mirrored across both** the `templates/javascript/` and `templates/typescript/` trees unless it is strictly language-specific (e.g., `tsconfig.json`, `tsup`).

---

## Local Development & Testing Workflow

### Fast Iteration with `npm link`

To test your local changes as you work:

```bash
# Link the local scaffoldx package globally
npm link

# Create a test scratch directory
mkdir test-app && cd test-app

# Run the linked CLI
scaffoldx
# or with flags
scaffoldx --yes --mongodb --pm pnpm
```

When you are done testing, you can unlink:

```bash
npm unlink -g scaffoldx
```

### Pre-PR Verification with Packaged Tarball

Before opening a pull request, verify that the package installs and functions properly as an npm package tarball without missing files or broken references:

```bash
# 1. Package the repository into a tarball
npm pack

# 2. Inspect the tarball content
tar -tf scaffoldx-*.tgz

# 3. Test running the packed tarball via npx
mkdir scratch-test && cd scratch-test
npx ../scaffoldx-*.tgz --yes

# 4. Clean up the test directory and tarball
cd ..
rm -rf scratch-test scaffoldx-*.tgz
```

---

## Pre-PR Smoke Test Checklist

Before opening a pull request, run through the core smoke test checklist detailed in [`test/manual-checklist.md`](test/manual-checklist.md):

- [ ] Non-empty directory collision prompt operates cleanly (Clear / Ignore / Exit).
- [ ] Scaffold with `-y, --yes` succeeds without interactive prompts.
- [ ] TypeScript app starts with `npm run dev` and builds with `npm run build`.
- [ ] Generated `package.json` contains only relevant scripts (`docker:*` and `db:*` only when database/ORM selected).
- [ ] Formatted output is clean with no broken template syntax or orphan blank lines.

---

## Commit & PR Conventions

- **Branch naming**: Use descriptive branch names like `feat/support-bun`, `fix/appname-collision`, or `docs/update-readme`.
- **Commit messages**: Use conventional commit prefixes:
  - `feat:` for new capabilities or user-facing options.
  - `fix:` for bug fixes.
  - `docs:` for documentation updates.
  - `chore:` for tooling, maintenance, or internal refactors.
- **PR Description**: Reference any related issue number and provide a concise summary of what was changed and how it was tested.

---

## Publishing

> [!NOTE]
> Only repository maintainers have rights to publish releases to npm. Contributors should open a PR against `master`. Once merged, releases are tagged and published by the maintainer.
