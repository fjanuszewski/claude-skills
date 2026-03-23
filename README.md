# claude-skills

A collection of personal [Claude Code](https://claude.ai/code) skills — reusable, installable prompts that extend Claude with project scaffolding, automation, and domain-specific workflows.

> **1 skill available**

---

## What are Claude Code skills?

Skills are instruction sets that Claude Code loads on demand. When you invoke a skill (by name or via a trigger phrase), Claude follows its steps to perform complex, multi-file tasks — like scaffolding an entire project from scratch — without you having to explain the process every time.

Skills live in `~/.claude/skills/<skill-name>/SKILL.md` and can include template assets, references, and structured workflows.

---

## Installation

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

### [`sst-monorepo-scaffold`](./sst-monorepo-scaffold/)

Scaffolds a production-ready SST v3 monorepo from scratch.

**Triggers:** *"crear un nuevo proyecto SST"*, *"scaffold a new SST project"*, *"nuevo proyecto con React y tRPC"*

**Generates:**
- `packages/web` — React 19 + Vite + TypeScript + Tailwind CSS v4
- `packages/bff` — tRPC v11 Lambda (Function URL)
- `infra/bff.ts` — SST v3 Lambda declaration
- `CLAUDE.md` — project-specific Claude instructions
- GitHub Actions — CI, staging deploy, production deploy

**Stack:** SST v3 · React 19 · tRPC v11 · Tailwind v4 · AWS Lambda · npm workspaces

---

## Adding a new skill

1. Create a folder: `~/.claude/skills/my-skill/`
2. Add `SKILL.md` with a YAML frontmatter `description:` that defines trigger phrases
3. Optionally add an `assets/` directory with templates
4. Copy it here and send a PR

---

## License

MIT
