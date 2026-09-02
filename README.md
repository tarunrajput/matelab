# MateLab

MateLab is a chess app for iOS and Android: play against a bundled Stockfish engine, analyze your games with engine evaluation, solve puzzles, and track your stats — all offline, on-device.

## Features

- **Play** — full chess rules via [chess.js](https://github.com/jhlywa/chess.js), with adjustable time controls and engine difficulty
- **Analysis** — engine evaluation bar, best lines, and post-game accuracy review
- **Puzzles** — tactics training with per-puzzle progress
- **History** — every finished game stored locally with PGN export
- **Stats & coach** — win/loss breakdowns, accuracy trends, and insights computed from your game history
- **Light & dark themes** — follows the OS by default, with an in-app override

## Tech stack

- [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) / React Native 0.81 with the New Architecture enabled
- TypeScript throughout
- [Stockfish 18 (WASM, lite single-thread build)](https://www.npmjs.com/package/stockfish) running inside a hidden WebView
- [expo-sqlite](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/) for local persistence

> **Note:** MateLab requires a **dev-client build, not Expo Go** — it bundles a native WebView and the Stockfish WASM binary.

## Getting started

```bash
npm install
npm start          # expo start (dev server)
npm run ios        # build + run iOS dev client
npm run android    # build + run Android dev client
```

Typecheck with:

```bash
npx tsc --noEmit
```

After changing native dependencies or `app.json`, regenerate the native projects and rebuild:

```bash
npx expo prebuild
```

## Architecture

There is **no router**: `App.tsx` owns a `tab` state and renders one of five screens (Play, Analysis, Puzzles, History, Stats) directly.

**The engine is a hidden WebView.** `App.tsx` renders one hidden `<WebView>` at the root running `assets/engine/engine.html` + Stockfish WASM, and a single shared `EngineService` instance passed to Play and Analysis as a prop (never construct a second one). `src/engine/EngineService.ts` owns the lifecycle (attach → boot → UCI handshake → `waitReady()`), allows exactly one in-flight search, and enforces a movetime watchdog. `src/engine/protocol.ts` is the serialized RN ⇄ WebView message contract — payloads are flat strings, and both sides must change together.

**All persistence goes through `src/storage/db.ts`**, which opens `matelab.db` (WAL mode) with three tables: `games`, `puzzle_progress`, and `stats`. Screens never touch SQLite directly.

**Rules come from chess.js.** `src/game/useChessGame.ts` wraps it as the stateful hook for play/analysis; `clock.ts`, `pgn.ts`, and `review.ts` stay rules-adjacent.

**Stats and coach are pure functions.** `src/stats/compute.ts` and `src/coach/insights.ts` take `StoredGame[]` and return summaries — no I/O inside.

**All UI colors come from `src/theme/`.** `useTheme()` returns semantic tokens for the active light/dark palette. The only hardcoded colors are fixed game surfaces (board squares/pieces, eval-bar fills, promotion glyphs), which are constant across themes.

```
src/
├── components/   # Board, ClockView, EvalBar, MoveList, TabBar, ...
├── screens/      # Play, Analysis, Puzzles, History, Stats screens
├── engine/       # EngineService + RN ⇄ WebView protocol
├── game/         # chess.js wrapper: useChessGame, clock, pgn, review
├── storage/      # expo-sqlite access (db.ts)
├── stats/        # pure stat computation
├── coach/        # pure insight/tip generation
├── puzzles/      # puzzle data & selection
├── theme/        # light/dark palettes + useTheme()
└── types/        # shared TypeScript types
```

## Project notes

- `assets/engine/` (engine HTML/JS glue + WASM) must be served by Metro, which is why `metro.config.js` adds `html`, `wasm`, and `txt` to `assetExts` — don't remove those.
- `android/` and `ios/` are checked-in prebuild outputs; regenerate with `npx expo prebuild` rather than hand-editing.
- `StoredGame.result` uses PGN results (`"1-0" | "0-1" | "1/2-1/2" | "*"`, where `"*"` means unfinished), and accuracy fields are nullable.
- Product intent and feature ideas live in `docs/ideas/matelab.md`.
