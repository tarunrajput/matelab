/**
 * Contract between the RN app and the Stockfish engine host (hidden WebView).
 * Both sides serialize these over postMessage; keep payloads flat strings.
 */

export type EngineRequest =
  | { type: 'uci' }
  | { type: 'ucinewgame' }
  | { type: 'isready' }
  | { type: 'setoption'; name: string; value: string }
  | { type: 'position'; fen: string; moves?: string[] }
  | { type: 'go'; depth?: number; movetime?: number }
  | { type: 'stop' }
  | { type: 'quit' };

/**
 * Moves leading from a game's root position to the position being searched.
 * Sent as `position fen <rootFen> moves <...>` so the engine sees repetition
 * history (threefold awareness in endgames and defensive shuffling).
 */
export interface EngineHistory {
  /** FEN the game started from (before the first move). */
  rootFen: string;
  /** UCI long-algebraic moves (e2e4, e7e5, …) applied to rootFen. */
  moves: string[];
}

export type EngineEventType = 'uci-ok' | 'readyok' | 'bestmove' | 'info' | 'error';

export interface EngineEvent {
  type: EngineEventType;
  /**
   * Raw UCI line, error message, or (for 'info') one or more UCI info
   * lines separated by \n — the host batches score-bearing lines so a
   * search crosses the bridge in a handful of messages.
   */
  payload: string;
}
