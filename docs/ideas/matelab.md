# MateLab *(working title)*

## Problem Statement
How might we give improving players an opponent that meets them at any level, coaches them inline while they play, and turns their own defeats into their next training material — entirely offline, forever free?

## Recommended Direction
A single offline chess app built from three fused layers. **The Strength Dial:** Stockfish opponent spanning ~400–3200 Elo with optional auto-adjustment so games stay competitive. **Coach in the Board:** blunder flags, best-move arrows, and tap-for-explanation sheets generated purely from engine data (eval swings, hanging pieces, tactic motifs) — no LLM, indistinguishable from magic to most users. **Adaptive Sparring Partner:** every finished game gets swept by the engine; blunders become a "fix your mistakes" puzzle feed, and aggregate stats (accuracy trend, blunder rate by game phase) form a lightweight player profile.

The bet: engine-derived coaching plus self-referential training creates a retention loop — lose, learn *your* weakness, beat the dial — without a single server call.

Stack: React Native + Expo SDK 54 · `chess.js` rules · Stockfish WASM in hidden WebView (`postMessage` bridge) · `expo-sqlite` persistence.

## Key Assumptions to Validate
- [ ] Stockfish WASM runs reliably inside a hidden WebView on iOS + Android (React Native WebView ↔ `postMessage` bridge) — day-one spike, both simulators
- [ ] UCI `Skill Level` + depth caps produce genuinely weak play for beginners — play 5 games at floor settings
- [ ] Engine-data explanations feel like coaching, not telemetry — show 3 people a blunder sheet, watch comprehension
- [ ] Cold start works: new users with zero games get value (seeded classic-puzzle fallback until first analyzed loss)

## MVP Scope
**In:** play-vs-engine core loop · Elo dial · inline blunder flags + best-move arrow · move-explanation sheet from engine data · post-game eval graph + key moments · analysis pipeline (game → blunder extraction → storage) · "your mistakes" puzzle feed from analyzed games · basic stats profile · local persistence (`expo-sqlite`) · PGN export
**Shape:** manual dial in v1; auto-adjust ships only if the loop feels flat in dogfooding

## Not Doing (and Why)
- **LLM coaching / BYO-key** — deliberately cut; breaks offline + $0 constraints, and engine data covers 90% of coaching value
- **Online multiplayer, accounts, cloud sync** — zero-server stance is the identity of the project
- **Openings trainer / theory repertoires** — adjacent domain, doubles content-authoring scope
- **Themes, skins, sounds polish** — portfolio reviewers judge architecture, not board textures
- **App Store release** — GPL-3.0 (Stockfish) obligates open-sourcing; ship as GitHub repo + sideload/TestFlight demo

## Open Questions
- Hidden-WebView vs Expo native module for the engine — decide via the day-one spike
- NNUE net size (~40 MB) bundled vs downloaded-on-first-run
- Puzzle difficulty ranking: reuse blunder magnitude, or re-score each position?
