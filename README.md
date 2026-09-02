# MateLab

A chess app for iOS and Android: play against a bundled Stockfish engine, analyze games, solve puzzles, and track stats — all offline, on-device.

Built with Expo SDK 54 / React Native 0.81 (New Architecture), TypeScript, chess.js, and Stockfish 18 WASM running in a hidden WebView. Persistence is expo-sqlite.

> **Note:** requires a **dev-client build, not Expo Go** — the app bundles a native WebView and the Stockfish WASM binary.

## Getting started

```bash
npm install
npm start          # expo start (dev server)
npm run ios        # build + run iOS dev client
npm run android    # build + run Android dev client
npx tsc --noEmit   # typecheck

# after changing native deps or app.json:
npx expo prebuild
```

## Architecture

- **No router.** `App.tsx` owns a `tab` state and renders one of five screens (Play, Analysis, Puzzles, History, Stats) directly.
- **Engine = hidden WebView.** One shared `EngineService` (`src/engine/`) owns the Stockfish lifecycle and is passed to Play/Analysis as a prop. `src/engine/protocol.ts` is the RN ⇄ WebView message contract — change both sides together.
- **Persistence.** All SQLite access goes through `src/storage/db.ts` (`games`, `puzzle_progress`, `stats` tables). Screens never touch SQLite directly.
- **Rules.** chess.js, wrapped by `src/game/useChessGame.ts`; `clock.ts`/`pgn.ts`/`review.ts` stay rules-adjacent.
- **Stats & coach.** `src/stats/compute.ts` and `src/coach/insights.ts` are pure functions over `StoredGame[]` — no I/O.
- **Theming.** All UI colors come from `src/theme/` via `useTheme()`. Only board/eval-bar/promotion surfaces are hardcoded (constant across themes).

## Notes

- `metro.config.js` adds `html`/`wasm`/`txt` to `assetExts` so Metro serves `assets/engine/` — don't remove those.
- `android/` and `ios/` are checked-in prebuild outputs; regenerate with `npx expo prebuild` rather than hand-editing.
- `StoredGame.result` uses PGN results (`"1-0" | "0-1" | "1/2-1/2" | "*"`, `"*"` = unfinished); accuracy fields are nullable.
