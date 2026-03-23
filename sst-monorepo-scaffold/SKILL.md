---
name: sst-monorepo-scaffold
description: This skill should be used when the user asks to "crear un nuevo proyecto SST", "scaffold a new SST project", "crear un monorepo con SST", "nuevo proyecto con React y tRPC", "iniciar un proyecto serverless con SST", or any variation involving creating a new project with SST v3 + AWS + React + tRPC monorepo structure.
version: 0.1.0
---

# SST Monorepo Scaffold Skill

Scaffold a production-ready SST v3 monorepo with React + Vite + Tailwind v4 (web) and tRPC Lambda (bff).

## Stack generado

- **Monorepo**: npm workspaces (`packages/web`, `packages/bff`)
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4
- **Router**: React Router v7 (`react-router`)
- **BFF**: tRPC v11 + AWS Lambda (Function URL)
- **Infra**: SST v3 — Lambda declared in `infra/bff.ts`
- **CI/CD**: GitHub Actions (ci, staging, production)
- **Stages**: `local` (sst dev) | `staging` | `production`

## Flujo de ejecución

### Paso 1: Recolectar configuración

Use `AskUserQuestion` to gather (combine into 1–2 questions max):

| Variable | Ejemplo | Default |
|----------|---------|---------|
| `{{PROJECT_NAME}}` | `mi-app` | — |
| `{{PROJECT_DESCRIPTION}}` | `A platform for managing invoices and work hours.` | — |
| `{{ORG_SCOPE}}` | `@miapp` | `@{{PROJECT_NAME}}` |
| `{{AWS_PROFILE}}` | `my-profile` | `default` |
| `{{AWS_REGION}}` | `us-east-1` | `us-east-1` |
| `{{DOMAIN}}` | `miapp.com` | — |
| `{{TARGET_DIR}}` | `/Users/user/projects/mi-app` | cwd |
| `{{YEAR}}` | `2026` | current year |

### Paso 2: Leer todos los templates

Read every file from `~/.claude/skills/sst-monorepo-scaffold/assets/`. The full list:

**Raíz:**
- `assets/root-package.json` → `{{TARGET_DIR}}/package.json`
- `assets/root-tsconfig.json` → `{{TARGET_DIR}}/tsconfig.json`
- `assets/sst.config.ts` → `{{TARGET_DIR}}/sst.config.ts`
- `assets/CLAUDE.md.template` → `{{TARGET_DIR}}/CLAUDE.md`
- `assets/gitignore.template` → `{{TARGET_DIR}}/.gitignore`

**Infra:**
- `assets/infra/bff.ts` → `{{TARGET_DIR}}/infra/bff.ts`

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

### Paso 3: Sustituir variables

Replace ALL occurrences of each placeholder in the file contents before writing:

- `{{PROJECT_NAME}}` → slug del proyecto (e.g., `mi-app`)
- `{{PROJECT_DESCRIPTION}}` → one-sentence description of what the project does (from user input)
- `{{ORG_SCOPE}}` → npm scope (e.g., `@miapp`)
- `{{AWS_PROFILE}}` → AWS CLI profile name
- `{{AWS_REGION}}` → AWS region
- `{{DOMAIN}}` → production domain (e.g., `miapp.com`)
- `{{YEAR}}` → current year

### Paso 4: Escribir todos los archivos

Write each file to `{{TARGET_DIR}}`. Create parent directories as needed (use Bash `mkdir -p` for each subdirectory before writing).

Write ALL files — do not skip any.

### Paso 5: Mostrar checklist post-scaffold

```
✅ Proyecto scaffoldeado en {{TARGET_DIR}}

Próximos pasos:
  cd {{TARGET_DIR}}
  npm install

Desarrollo local:
  npx sst dev          # stage: local

Deploy:
  npx sst deploy --stage staging     # staging
  npx sst deploy --stage production  # production

Secrets (si aplica):
  npx sst secret set MySecret value --stage staging
  npx sst secret set MySecret value --stage production
```

## Convenciones del proyecto generado

- Serverless only — no EC2, no managed servers
- Sin librerías de estado externas (no Zustand, no MobX)
- Tailwind v4: `@import "tailwindcss"` + `@theme` en `index.css`, sin `tailwind.config.js`
- Colores desde `@theme` únicamente (no hex en JSX)
- Componentes: máximo 400 líneas
- React Router v7: `createBrowserRouter` + `RouterProvider`
- tRPC importado en web vía `{{ORG_SCOPE}}/bff` workspace
