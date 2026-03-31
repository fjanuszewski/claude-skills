---
name: sst-monorepo-scaffold
description: This skill should be used when the user asks to "crear un nuevo proyecto SST", "scaffold a new SST project", "crear un monorepo con SST", "nuevo proyecto con React y tRPC", "iniciar un proyecto serverless con SST", or any variation involving creating a new project with SST v3 + AWS + React + tRPC monorepo structure.
version: 0.2.0
---

# SST Monorepo Scaffold Skill

Scaffold a production-ready SST v3 monorepo with React + Vite + Tailwind v4 (web) and tRPC Lambda (bff).

## Generated Stack

- **Monorepo**: npm workspaces (`packages/web`, `packages/bff`)
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4
- **Router**: React Router v7 (`react-router`)
- **BFF**: tRPC v11 + AWS Lambda (Function URL)
- **Infra**: SST v3 — Lambda declared in `infra/bff.ts`
- **CI/CD**: GitHub Actions (ci, staging, production)
- **Stages**: `local` (sst dev) | `staging` | `production`

## Execution Flow

### Step 1: Collect Configuration

Use `AskUserQuestion` to gather (combine into 2–3 questions max):

| Variable | Example | Default |
|----------|---------|---------|
| `{{PROJECT_NAME}}` | `my-app` | — |
| `{{PROJECT_DESCRIPTION}}` | `A platform for managing invoices and work hours.` | — |
| `{{ORG_SCOPE}}` | `@myapp` | `@{{PROJECT_NAME}}` |
| `{{AWS_PROFILE}}` | `my-profile` | `default` |
| `{{AWS_REGION}}` | `us-east-1` | `us-east-1` |
| `{{DOMAIN}}` | `myapp.com` | — |
| `{{TARGET_DIR}}` | `/Users/user/projects/my-app` | cwd |
| `{{YEAR}}` | `2026` | current year |
| `{{I18N_LANGUAGES}}` | `en, es, pt-BR` | — (optional) |
| `{{DESIGN_PEN_PATH}}` | `./design.pen` | — (optional) |

**i18n**: Ask the user if the project will handle multiple languages. If yes, ask which languages (e.g. `en, es`).

**Pencil.dev**: Ask the user if the project uses a Pencil.dev design file (`design.pen`). If yes, ask for the path relative to the project root (e.g. `./design.pen`).

### Step 2: Read All Templates

Read every file from `~/.claude/skills/sst-monorepo-scaffold/assets/`. The full list:

**Root:**
- `assets/root-package.json` → `{{TARGET_DIR}}/package.json`
- `assets/root-tsconfig.json` → `{{TARGET_DIR}}/tsconfig.json`
- `assets/sst.config.ts` → `{{TARGET_DIR}}/sst.config.ts`
- `assets/CLAUDE.md.template` → `{{TARGET_DIR}}/CLAUDE.md`
- `assets/gitignore.template` → `{{TARGET_DIR}}/.gitignore`

**Infra:**
- `assets/infra/bff.ts` → `{{TARGET_DIR}}/infra/bff.ts`
- `assets/infra/web.ts` → `{{TARGET_DIR}}/infra/web.ts`

**Web package:**
- `assets/packages/web/package.json` → `{{TARGET_DIR}}/packages/web/package.json`
- `assets/packages/web/vite.config.ts` → `{{TARGET_DIR}}/packages/web/vite.config.ts`
- `assets/packages/web/tsconfig.json` → `{{TARGET_DIR}}/packages/web/tsconfig.json`
- `assets/packages/web/index.html` → `{{TARGET_DIR}}/packages/web/index.html`
- `assets/packages/web/src/main.tsx` → `{{TARGET_DIR}}/packages/web/src/main.tsx`
- `assets/packages/web/src/App.tsx` → `{{TARGET_DIR}}/packages/web/src/App.tsx`
- `assets/packages/web/src/index.css` → `{{TARGET_DIR}}/packages/web/src/index.css`

**BFF package:**
- `assets/packages/bff/package.json` → `{{TARGET_DIR}}/packages/bff/package.json`
- `assets/packages/bff/tsconfig.json` → `{{TARGET_DIR}}/packages/bff/tsconfig.json`
- `assets/packages/bff/src/index.ts` → `{{TARGET_DIR}}/packages/bff/src/index.ts`
- `assets/packages/bff/src/app.router.ts` → `{{TARGET_DIR}}/packages/bff/src/app.router.ts`
- `assets/packages/bff/src/trpc.ts` → `{{TARGET_DIR}}/packages/bff/src/trpc.ts`

**GitHub Actions:**
- `assets/github/ci.yml` → `{{TARGET_DIR}}/.github/workflows/ci.yml`
- `assets/github/release.yml` → `{{TARGET_DIR}}/.github/workflows/release.yml`
- `assets/github/stg-release.yml` → `{{TARGET_DIR}}/.github/workflows/stg-release.yml`

### Step 3: Substitute Variables

Replace ALL occurrences of each placeholder in the file contents before writing:

- `{{PROJECT_NAME}}` → project slug (e.g., `my-app`)
- `{{PROJECT_DESCRIPTION}}` → one-sentence description of what the project does (from user input)
- `{{ORG_SCOPE}}` → npm scope (e.g., `@myapp`)
- `{{AWS_PROFILE}}` → AWS CLI profile name
- `{{AWS_REGION}}` → AWS region
- `{{DOMAIN}}` → production domain (e.g., `myapp.com`)
- `{{YEAR}}` → current year

**Conditional placeholders** — these lines exist in `CLAUDE.md.template` and must be handled as follows:

- `{{I18N_RULE}}`:
  - If the user enabled i18n → replace with:
    `- When creating a component, load all user-facing text using i18n keys. Supported languages: {{I18N_LANGUAGES}}.`
    (with `{{I18N_LANGUAGES}}` already substituted, e.g. `en, es, pt-BR`)
  - If not → **remove the entire line** from the output.

- `{{DESIGN_PEN_RULE}}`:
  - If the user provided a design.pen path → replace with:
    `- Whenever a component or layout in \`packages/web\` is modified, reflect or compare the change with the Pencil.dev design file at \`{{DESIGN_PEN_PATH}}\`. Keep it as the single source of design truth.`
    (with `{{DESIGN_PEN_PATH}}` already substituted)
  - If not → **remove the entire line** from the output.

### Step 4: Write All Files

Write each file to `{{TARGET_DIR}}`. Create parent directories as needed (use Bash `mkdir -p` for each subdirectory before writing).

Write ALL files — do not skip any.

### Step 5: Show Post-scaffold Checklist

```
✅ Project scaffolded in {{TARGET_DIR}}

Next steps:
  cd {{TARGET_DIR}}
  npm install

Local development:
  npx sst dev          # stage: local

Deploy:
  npx sst deploy --stage staging     # staging
  npx sst deploy --stage production  # production

Secrets (if applicable):
  npx sst secret set MySecret value --stage staging
  npx sst secret set MySecret value --stage production
```

## Generated Project Conventions

- Serverless only — no EC2, no managed servers
- No external state libraries (no Zustand, no MobX)
- Tailwind v4: `@import "tailwindcss"` + `@theme` in `index.css`, no `tailwind.config.js`
- Colors from `@theme` only (no hex in JSX)
- Components: max 400 lines
- React Router v7: `createBrowserRouter` + `RouterProvider`
- tRPC imported in web via `{{ORG_SCOPE}}/bff` workspace
