#!/usr/bin/env bash
set -e

SKILLS_DIR="$HOME/.claude/skills"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo ""
echo -e "${CYAN}Claude Skills Installer${RESET}"
echo "========================"
echo ""

# Find all skill directories (those containing a SKILL.md)
skills=()
while IFS= read -r skill_md; do
  skill_dir="$(dirname "$skill_md")"
  skill_name="$(basename "$skill_dir")"
  skills+=("$skill_name")
done < <(find "$REPO_DIR" -maxdepth 2 -name "SKILL.md" | sort)

if [ ${#skills[@]} -eq 0 ]; then
  echo "No skills found."
  exit 1
fi

# Install all or a specific skill
INSTALL_TARGET="${1:-all}"

install_skill() {
  local name="$1"
  local src="$REPO_DIR/$name"
  local dest="$SKILLS_DIR/$name"

  mkdir -p "$dest"
  cp -r "$src/." "$dest"
  echo -e "  ${GREEN}✓${RESET} $name"
}

mkdir -p "$SKILLS_DIR"

if [ "$INSTALL_TARGET" = "all" ]; then
  echo "Installing all skills..."
  echo ""
  for skill in "${skills[@]}"; do
    install_skill "$skill"
  done
else
  if [ -d "$REPO_DIR/$INSTALL_TARGET" ]; then
    echo "Installing skill: $INSTALL_TARGET"
    echo ""
    install_skill "$INSTALL_TARGET"
  else
    echo "Skill '$INSTALL_TARGET' not found."
    echo "Available skills: ${skills[*]}"
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}Done!${RESET} Skills installed to $SKILLS_DIR"
echo ""
