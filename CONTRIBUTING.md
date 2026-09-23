# Contributing

```
npm install
npm run check          # typecheck, unit tests, build
npm run e2e            # needs claude and codex on PATH (or CODEX_EXE), and a key in ~/.jev-skills/config.json
npm run scale -- 3000  # synthetic library: latency, requests, precision
```

`dist/` is committed on purpose. Hooks run straight from it with no install step, so rebuild before you commit and CI fails if `dist/` is stale.

Code rules: no comments, short files, one job per function, enums over string constants, Zod at every boundary, types inferred from schemas, never repeat yourself.

Where things live:

- `src/hook.ts` is the hook entry point. It reads one JSON event on stdin and prints at most one JSON object.
- `src/observer/` builds the state Jev sees, asks, selects, and renders the injection.
- `src/jev/` is the Jev client, the fan-out, and the question templates.
- `src/registry/` finds, parses, caches, and prefilters skills.
- `src/prompts/` is not here; there is no LLM prompt in this plugin. Jev answers typed questions.
- `test/` are unit tests, `scripts/e2e.ts` spawns real agents, `scripts/scaleTest.ts` generates libraries.

To add a new hook event, extend `HookEvent` and `HookInputSchema` in `src/hooks/input.ts`, handle it in `dispatch`, and declare it in `hooks/hooks.json` and `src/codexInstall.ts`.
