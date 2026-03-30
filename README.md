# claude-skills 🧠

Hey! This is my personal collection of [Claude Code](https://claude.ai/code) skills — reusable, installable prompts that extend Claude with project scaffolding, automation, and domain-specific workflows.

Instead of explaining the same setup process every time I start a new project, I just tell Claude what to do and these skills handle the rest.

> **4 skills available**

---

## What are Claude Code skills?

Skills are instruction sets that Claude Code loads on demand. When you invoke a skill (by name or via a trigger phrase), Claude follows its steps to perform complex, multi-file tasks — like scaffolding an entire project from scratch — without you having to explain the process every time.

Skills live in `~/.claude/skills/<skill-name>/SKILL.md` and can include template assets, references, and structured workflows.

---

## Installation ⚡

### Install all skills

```bash
git clone https://github.com/fjanuszewski/claude-skills.git
cd claude-skills
./install.sh
```

### Install a specific skill

```bash
./install.sh sst-monorepo-scaffold
```

Skills are copied to `~/.claude/skills/` and become available immediately in any Claude Code session.

---

## Skills

### [`sst-monorepo-scaffold`](./sst-monorepo-scaffold/) 🚀

Scaffolds a production-ready SST v3 monorepo from scratch.

**Triggers:** *"crear un nuevo proyecto SST"*, *"scaffold a new SST project"*, *"nuevo proyecto con React y tRPC"*

**Generates:**
- `packages/web` — React 19 + Vite + TypeScript + Tailwind CSS v4
- `packages/bff` — tRPC v11 Lambda (Function URL)
- `infra/bff.ts` — SST v3 Lambda declaration
- `CLAUDE.md` — project-specific Claude instructions
- GitHub Actions — CI, staging deploy, production deploy

**Stack:** SST v3 · React 19 · tRPC v11 · Tailwind v4 · AWS Lambda · npm workspaces

### [`dynamo-erd`](./dynamo-erd/) 📊

Generates a Mermaid Entity-Relationship Diagram from DynamoDB table definitions and backend code. Works with any IaC framework (SST, CDK, CloudFormation, Terraform) or plain backend code.

**Triggers:** *"generar ERD"*, *"crear diagrama de entidades DynamoDB"*, *"generate DynamoDB ERD"*, *"documentar modelo de datos"*

**Generates:**
- `DATABASE.md` — Mermaid erDiagram with all entities, attributes, and relationships
- Tables & Entities reference section
- Access Patterns documentation per table

**Supports:** SST v3 · AWS CDK · CloudFormation · SAM · Terraform · Plain backend code

### [`ship`](./ship/) 🚀

Stage, commit, and push all changes in one command. Optionally creates PRs and verifies GitHub Actions.

**Triggers:** *"ship"*, *"shipear"*, *"pushear"*, *"subir cambios"*, *"commit y push"*, *"commitear"*

**Features:**
- `git add .` + commit + push in one step
- Auto-generates descriptive commit messages (no AI attribution)
- Optional PR creation to `staging` and/or `main`/`master`
- Optional GitHub Actions verification after push
- Never adds `Co-Authored-By` or AI mentions

### [`page-to-pencil`](./page-to-pencil/) 🎨

Captures a live web page using Playwright and faithfully recreates it as a Pencil (.pen) design file with pixel-accurate layout, colors, typography, and icons.

**Triggers:** *"convertir página a pencil"*, *"page to pencil"*, *"capturar página en pencil"*, *"recrear UI en pencil"*, *"screenshot to pencil"*

**Features:**
- Opens any URL with Playwright and captures full-page screenshots
- Handles login/authentication flows (asks user to login manually or provide credentials)
- Multi-breakpoint support: mobile (375x812), tablet (768x1024), desktop (1440x900), desktop-xl (1920x1080)
- Extracts exact colors, fonts, icons, and spacing from computed styles
- Cross-references with project's component library for icon names and design tokens
- Ultra-strict visual validation — iterates until the .pen matches the original
- Auto-persists to disk (Pencil MCP works in-memory by default)

**Requires:** Pencil MCP server · Playwright MCP server

---

## Adding a new skill

1. Create a folder: `~/.claude/skills/my-skill/`
2. Add `SKILL.md` with a YAML frontmatter `description:` that defines trigger phrases
3. Optionally add an `assets/` directory with templates
4. Copy it here and send a PR

---

## License

MIT
