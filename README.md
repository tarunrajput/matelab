# MateLab

A chess app for iOS and Android: play against a Stockfish engine, analyze games, solve puzzles, and track stats — all offline, on-device.

> **Note:** requires a **dev-client build, not Expo Go**.

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
