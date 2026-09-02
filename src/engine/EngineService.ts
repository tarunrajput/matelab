import { Image } from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { EngineEvent, EngineHistory, EngineRequest } from './protocol';

export interface EngineMove {
  from: string;
  to: string;
  promotion?: string;
}

export interface EngineSearchResult {
  move: EngineMove;
  /** Centipawn score from the side-to-move's perspective at search time; null if unknown */
  scoreCp: number | null;
  /** Positive: side to move delivers mate in N; negative: side to move is mated in N */
  mate: number | null;
}

interface PendingSearch {
  resolve: (r: EngineSearchResult) => void;
  timer: ReturnType<typeof setTimeout>;
  scoreCp: number | null;
  mate: number | null;
}

/** WASM memory grows lazily; the engine searches slowly until it has run once. */
const WARMUP_MOVETIME_MS = 600;
const HASH_MB = 64;
/** This build rejects `position fen startpos`; the full FEN is required. */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Owns the RN <-> WebView <-> Stockfish protocol. The hidden WebView is
 * rendered by the screen; this class only speaks the message contract.
 *
 * Lifecycle: attach() at mount -> page boots worker -> "engine-booted" info
 * triggers the uci/isready handshake, then a throwaway warm-up search (JIT +
 * NNUE + hash allocation) -> ready fires on its bestmove. search() allows
 * exactly one in-flight search; a watchdog sends UCI "stop" (which prompts an
 * immediate bestmove) if the engine overruns its movetime budget. Info lines
 * are parsed for eval scores so every search also yields an evaluation.
 */
export class EngineService {
  private webview: WebView | null = null;
  private booted = false;
  private ready = false;
  private warmedUp = false;
  private readyWaiter: { resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private searchWaiter: PendingSearch | null = null;
  private onInfo: ((line: string) => void) | null = null;

  attach(webview: WebView, onInfo?: (line: string) => void) {
    this.webview = webview;
    this.onInfo = onInfo ?? null;
  }

  detach() {
    this.post({ type: 'quit' });
    this.webview = null;
    this.booted = false;
    this.ready = false;
    // The page (and its engine) die with the webview; if a new one attaches,
    // the handshake and warm-up must run again on the fresh instance.
    this.warmedUp = false;
    this.searchWaiter = null;
  }

  handleEvent = (e: WebViewMessageEvent) => {
    let event: EngineEvent;
    try {
      event = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    switch (event.type) {
      case 'info': {
        const lines = event.payload.split('\n');
        for (const line of lines) {
          if (line.indexOf('engine-booted') >= 0) {
            this.booted = true;
            this.post({ type: 'uci' });
            continue;
          }
          this.onInfo?.(line);
          if (this.searchWaiter) {
            const cp = /score cp (-?\d+)/.exec(line);
            const mate = /score mate (-?\d+)/.exec(line);
            if (cp) this.searchWaiter.scoreCp = Number(cp[1]);
            if (mate) this.searchWaiter.mate = Number(mate[1]);
          }
        }
        break;
      }
      case 'uci-ok':
        this.post({ type: 'setoption', name: 'Hash', value: String(HASH_MB) });
        this.post({ type: 'isready' });
        break;
      case 'readyok':
        if (!this.warmedUp) {
          // First readyok: hash is still cold. Run a short fixed search;
          // its bestmove is handled by the normal searchWaiter path and
          // flips warmedUp, at which point waitReady() resolvers fire.
          this.warmedUp = true;
          const timer = setTimeout(() => this.post({ type: 'stop' }), WARMUP_MOVETIME_MS + 8000);
          this.searchWaiter = { resolve: () => this.signalReady(), timer, scoreCp: null, mate: null };
          this.post({ type: 'position', fen: START_FEN });
          this.post({ type: 'go', movetime: WARMUP_MOVETIME_MS });
        } else {
          this.signalReady();
        }
        break;
      case 'bestmove': {
        if (!this.searchWaiter) break;
        clearTimeout(this.searchWaiter.timer);
        const { resolve, scoreCp, mate } = this.searchWaiter;
        this.searchWaiter = null;
        resolve({ move: parseBestmove(event.payload), scoreCp, mate });
        break;
      }
      case 'error':
        if (this.readyWaiter) {
          clearTimeout(this.readyWaiter.timer);
          this.readyWaiter.reject(new Error(event.payload));
          this.readyWaiter = null;
        }
        break;
    }
  };

  get isReady() {
    return this.ready;
  }

  async waitReady(timeoutMs = 30000): Promise<void> {
    if (this.ready) return;
    if (!this.webview) throw new Error('engine webview not attached');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readyWaiter = null;
        reject(new Error('engine warm-up timed out'));
      }, timeoutMs);
      this.readyWaiter = {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        timer,
      };
    });
  }

  /**
   * One search at a time. Resolves with the chosen move and the search's eval.
   * `history` feeds the engine the game's leading moves so it scores
   * repetitions; without it the engine happily shuffles into threefold draws
   * (its side) or misses saving repetition draws (yours).
   */
  search(fen: string, movetimeMs: number, history?: EngineHistory): Promise<EngineSearchResult> {
    if (!this.ready) return Promise.reject(new Error('engine not ready'));
    if (this.searchWaiter) return Promise.reject(new Error('search already in flight'));
    return new Promise((resolve) => {
      // Watchdog: UCI "stop" makes the engine emit bestmove promptly.
      const timer = setTimeout(() => this.post({ type: 'stop' }), movetimeMs + 8000);
      this.searchWaiter = { resolve, timer, scoreCp: null, mate: null };
      if (history && history.moves.length > 0) {
        this.post({ type: 'position', fen: history.rootFen, moves: history.moves });
      } else {
        this.post({ type: 'position', fen });
      }
      this.post({ type: 'go', movetime: movetimeMs });
    });
  }

  newGame() {
    this.post({ type: 'ucinewgame' });
  }

  setSkill(level: number) {
    this.post({ type: 'setoption', name: 'Skill Level', value: String(level) });
  }

  cancelSearch() {
    if (this.searchWaiter) this.post({ type: 'stop' });
  }

  private signalReady() {
    this.ready = true;
    if (this.readyWaiter) {
      clearTimeout(this.readyWaiter.timer);
      this.readyWaiter.resolve();
      this.readyWaiter = null;
    }
  }

  private post(req: EngineRequest) {
    this.webview?.postMessage(JSON.stringify(req));
  }
}

function parseBestmove(line: string): EngineMove {
  const uci = line.split(/\s+/)[1] ?? '';
  if (uci.length < 4) throw new Error(`unusable bestmove: ${line}`);
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

// Register the wasm binary and engine glue with Metro's asset registry. The
// glue is renamed .txt so Metro serves it as a static asset instead of parsing
// it as a module (its Node-only `fs` import would fail resolution). The page
// passes the wasm URL to the worker explicitly via the URL hash.
void Image.resolveAssetSource(require('../../assets/engine/stockfish-18-lite-single.wasm'));
void Image.resolveAssetSource(require('../../assets/engine/engine-glue.txt'));
