# Skill library

Put skills here as `<name>/SKILL.md` with `name` and `description` frontmatter, exactly like a Claude Code or Codex skill. Nested folders are fine; the folder above a skill becomes its category.

Skills in this folder are never listed to the model. The observer asks Jev about each one on every turn and injects only the ones that matter.

The user-level library at `~/.jev-skills/library` is scanned too. Run `node dist/cli.js migrate --apply` to move an existing `~/.claude/skills` or `~/.codex/skills` folder there.
