# ATIP Filler — Mac App

Electron + React desktop app that fills the ATIP site from a client record. Follows the
"ATIP Filler — Mac App 开发路线". **The app never clicks Submit.**

## Status

Stage 1 (skeleton) is done:

- Electron window: ATIP web page on the left, control panel on the right
- Fake client generator (`src/fakeClient.js`, seeded)
- Start / Stop; scans each page's fields and buttons and logs timing, stops on the Submit page
- Log with one-click copy

Not done yet: filling fields and clicking Continue (stage 2), speed work (3), questionnaire and
file upload (4), AIXVISA login and client search (5), `.dmg` packaging (6).

## Run (on a Mac)

```
npm install
npm start
```

Click **Start**, browse the ATIP site yourself, then press **一键复制** and send the log.
`npm test` runs the unit tests.

## Files

| File | Role |
| --- | --- |
| `main.js` | Window, ATIP view, IPC |
| `preload.js` | Safe bridge to the panel |
| `src/engine.js` | Reads page fields by label text. Stage 2 adds filling here |
| `src/runner.js` | Start/Stop loop |
| `src/fakeClient.js` | Fake client generator |
| `src/config.js` | Start URL, panel width, `TEST_MODE` |
| `renderer/` | React control panel |

## To check

- `ATIP_START_URL` in `src/config.js` is a guess. Set it to the page you actually start from.
- Turn `TEST_MODE` off in `src/config.js` before using real clients (masks personal data in logs).
- `engine.js`, `crmMap.js`, `mcp.js` from the iPhone version were not available here; stage 1 only
  needed a new fake client and a read-only scanner. Copy the originals in for stage 2/5.
