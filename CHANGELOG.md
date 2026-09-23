# Changelog

## 0.1.0

First release.

- Observer hook for Claude Code (`UserPromptSubmit`, `PostToolUse`, `SessionStart`, `PostCompact`) and Codex (same events via `~/.codex/hooks.json`).
- One Jev `noul` question per library skill, chunked to Jev's request limit and fanned out in parallel.
- Skill bodies injected as `additionalContext`, once per session, reset on compaction.
- BM25 prefilter above 1,200 skills so Jev sees at most 400 candidates.
- Index cache so a 3,000-skill library is scanned in milliseconds after the first run.
- Retry with backoff on Jev 429 and 529.
- Fails open on every error: prompts are never blocked.
- CLI: `setup`, `list`, `ask`, `status`, `migrate`, `install-codex`, `uninstall-codex`.
- End-to-end test that spawns headless Claude Code and Codex sessions against canary skills.
