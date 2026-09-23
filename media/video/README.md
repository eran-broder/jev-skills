# Launch video

`scene.html` is a timeline: `window.seek(ms)` renders the exact frame for any time, so capture is deterministic. `render.ts` steps headless Chrome through it at 30 fps and pipes PNG frames straight into ffmpeg. `stills.ts` renders single frames for review.

Every number and transcript line in the scenes comes from a real run recorded in the jev-skills repo: the `ask` CLI on the author's 23-skill library, the synthetic 624 and 3,024-skill scale tests, the 60-answer Jev versus Haiku triage eval, and the end-to-end suite against Claude Code and Codex.

```
npm install
npm run stills -- 1500 33000 65000   # review frames in out/stills
npm run render                        # out/jev-skills.mp4, 1920x1080, 72 s
```

Requires Chrome at the path in `render.ts` and ffmpeg on PATH. Open `scene.html` in a browser to watch it loop live.
