import { useCallback, useRef, useState } from 'react';
import { Chess, type Move, type Square } from 'chess.js';
import { type EngineSearchResult, type EngineService } from '../engine/EngineService';
import type { EngineHistory } from '../engine/protocol';

export type Color = 'w' | 'b';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';
export type Classification = 'blunder' | 'mistake' | 'inaccuracy';

export interface Level {
  elo: number;
  skill: number;
  movetime: number;
}

/** Dial buckets: UCI Skill Level + a movetime cap (depth is unbounded on top end). */
export const LEVELS: Level[] = [
  { elo: 400, skill: 0, movetime: 150 },
  { elo: 800, skill: 1, movetime: 200 },
  { elo: 1200, skill: 3, movetime: 300 },
  { elo: 1600, skill: 8, movetime: 500 },
  { elo: 2000, skill: 12, movetime: 800 },
  { elo: 2400, skill: 16, movetime: 1200 },
  { elo: 2800, skill: 19, movetime: 1800 },
  { elo: 3200, skill: 20, movetime: 2500 },
];

/** Centipawn losses (mover POV) that flag a player move, chess.com-style. */
const THRESHOLDS: Array<{ kind: Classification; cp: number }> = [
  { kind: 'blunder', cp: 200 },
  { kind: 'mistake', cp: 100 },
  { kind: 'inaccuracy', cp: 50 },
];

/** Background sweep budget for the position after each engine reply. */
const ANALYSIS_MOVETIME = 350;

export interface MoveRecord {
  san: string;
  mover: Color;
  /** White-POV eval (cp) of the position after this move; null while pending */
  evalAfter: number | null;
  classification: Classification | null;
  /** What the mover should have played instead (player moves only) */
  bestUci: { from: string; to: string } | null;
  bestSan: string | null;
}

interface Suggestion {
  from: string;
  to: string;
  san: string;
}

export function useChessGame(engine: EngineService) {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [status, setStatus] = useState('New game — you play White');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [thinking, setThinking] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [records, setRecords] = useState<MoveRecord[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [arrow, setArrow] = useState<{ from: string; to: string } | null>(null);
  const [coachMove, setCoachMove] = useState<MoveRecord | null>(null);

  const searchId = useRef(0);
  const levelIndexRef = useRef(0);
  const playerColorRef = useRef<Color>('w');
  const recordsRef = useRef<MoveRecord[]>([]);
  recordsRef.current = records;
  const suggestionRef = useRef<Suggestion | null>(null);
  const analysisRef = useRef<{ id: number; done: Promise<unknown> } | null>(null);

  const setLevelIndex = useCallback((index: number) => {
    levelIndexRef.current = index;
  }, []);

  const refresh = useCallback((message: string) => {
    setFen(gameRef.current.fen());
    setStatus(message);
  }, []);

  const describe = useCallback(() => {
    const game = gameRef.current;
    if (game.isCheckmate()) return game.turn() === 'w' ? 'Checkmate — Black wins' : 'Checkmate — White wins';
    if (game.isStalemate()) return 'Draw — stalemate';
    if (game.isInsufficientMaterial()) return 'Draw — insufficient material';
    if (game.isThreefoldRepetition()) return 'Draw — repetition';
    if (game.isDraw()) return 'Draw';
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    return game.inCheck() ? `${turn} to move — check!` : `${turn} to move`;
  }, []);

  const toWhiteCp = (r: EngineSearchResult, sideToMove: Color): number | null => {
    if (r.mate !== null) return r.mate > 0 ? 10000 : -10000;
    if (r.scoreCp === null) return null;
    return sideToMove === 'w' ? r.scoreCp : -r.scoreCp;
  };

  /** Root FEN + leading moves so the engine can score repetitions. */
  const engineHistory = useCallback((): EngineHistory => {
    const game = gameRef.current;
    const hist = game.history({ verbose: true });
    const rootFen = hist.length > 0 ? hist[0].before : game.fen();
    return { rootFen, moves: hist.map((m: Move) => m.lan) };
  }, []);

  const classify = (lossCp: number): Classification | null => {
    for (const t of THRESHOLDS) if (lossCp >= t.cp) return t.kind;
    return null;
  };

  const runAnalysis = useCallback(
    (id: number) => {
      engine.setSkill(20);
      const fenNow = gameRef.current.fen();
      const done = engine
        .search(fenNow, ANALYSIS_MOVETIME, engineHistory())
        .then((r) => {
          if (id !== searchId.current) return;
          const whiteCp = toWhiteCp(r, playerColorRef.current);
          suggestionRef.current =
            whiteCp === null
              ? null
              : { from: r.move.from, to: r.move.to, san: sanFor(fenNow, r.move) ?? r.move.from + r.move.to };
          setRecords((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            const last = next[next.length - 1];
            if (last.mover === playerColorRef.current) return prev;
            next[next.length - 1] = { ...last, evalAfter: whiteCp };
            return next;
          });
        })
        .catch(() => undefined)
        .finally(() => {
          if (analysisRef.current?.id === id) analysisRef.current = null;
        });
      analysisRef.current = { id, done };
    },
    [engine, engineHistory],
  );

  /** Flag the player's previous move once its eval has landed. */
  const settleClassification = useCallback(() => {
    setRecords((prev) => {
      if (prev.length < 2) return prev;
      const next = [...prev];
      const playerMove = next[next.length - 2];
      if (playerMove.mover !== playerColorRef.current) return prev;
      const evalBefore = next.length >= 3 ? next[next.length - 3].evalAfter : null;
      const evalAfter = playerMove.evalAfter;
      if (evalBefore === null || evalAfter === null) return prev;
      const loss = playerMove.mover === 'w' ? evalBefore - evalAfter : evalAfter - evalBefore;
      const kind = classify(loss);
      if (!kind || !playerMove.bestUci) return prev;
      next[next.length - 2] = { ...playerMove, classification: kind };
      setArrow(playerMove.bestUci);
      return next;
    });
  }, []);

  const requestEngineMove = useCallback(() => {
    searchId.current += 1;
    const id = searchId.current;
    const lvl = LEVELS[levelIndexRef.current];
    const go = () => {
      if (id !== searchId.current) return;
      engine.setSkill(lvl.skill);
      setThinking(true);
      engine
        .search(gameRef.current.fen(), lvl.movetime, engineHistory())
        .then((r) => {
          if (id !== searchId.current) return;
          const move = gameRef.current.move({
            from: r.move.from,
            to: r.move.to,
            promotion: r.move.promotion ?? 'q',
          });
          if (!move) return;
          setLastMove({ from: move.from as Square, to: move.to as Square });
          // Eval of the position after the PLAYER's previous move: the engine
          // just searched exactly that position.
          const playerEvalAfter = toWhiteCp(r, move.color as Color);
          setRecords((prev) => {
            const next = [...prev];
            if (next.length > 0 && next[next.length - 1].mover === playerColorRef.current) {
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, evalAfter: playerEvalAfter };
            }
            next.push({
              san: move.san,
              mover: move.color as Color,
              evalAfter: null, // filled by runAnalysis below
              classification: null,
              bestUci: null,
              bestSan: null,
            });
            return next;
          });
          settleClassification();
          refresh(describe());
          if (!gameRef.current.isGameOver()) runAnalysis(id);
        })
        .catch((err: unknown) => {
          console.log('ENGINE_MOVE_ERROR', String(err));
          refresh(`${describe()} (engine error)`);
        })
        .finally(() => {
          if (id === searchId.current) setThinking(false);
        });
    };
    // A background analysis may still hold the engine; chain behind it.
    if (analysisRef.current) {
      analysisRef.current.done.finally(go);
    } else {
      go();
    }
    }, [engine, engineHistory, refresh, describe, runAnalysis, settleClassification]);

  const applyPlayerMove = useCallback(
    (from: Square, to: Square, promotion: PromotionPiece) => {
      const game = gameRef.current;
      let move: Move | null = null;
      try {
        move = game.move({ from, to, promotion });
      } catch {
        move = null;
      }
      if (!move) return false;

      // Compare against the suggestion the last analysis produced.
      const suggested = suggestionRef.current;
      const playedBest = suggested !== null && suggested.from === from && suggested.to === to;
      suggestionRef.current = null;

      setLastMove({ from: move.from as Square, to: move.to as Square });
      setSelected(null);
      setPendingPromotion(null);
      setArrow(null);
      setRecords((prev) => [
        ...prev,
        {
          san: move.san,
          mover: move.color as Color,
          evalAfter: null, // engine's reply search fills this
          classification: null,
          bestUci: playedBest || !suggested ? null : { from: suggested.from, to: suggested.to },
          bestSan: playedBest || !suggested ? null : suggested.san,
        },
      ]);
      refresh(describe());
      if (!game.isGameOver()) requestEngineMove();
      return true;
    },
    [refresh, describe, requestEngineMove],
  );

  const legalTargets = useCallback(
    (square: Square): Square[] => {
      return gameRef.current.moves({ square, verbose: true }).map((m: Move) => m.to as Square);
    },
    [],
  );

  const onSquarePress = useCallback(
    (square: Square) => {
      const game = gameRef.current;
      if (game.isGameOver() || game.turn() !== playerColorRef.current || thinking) return;

      if (selected) {
        if (square === selected) {
          setSelected(null);
          return;
        }
        const isLegal = game.moves({ square: selected, verbose: true }).some((m: Move) => m.to === square);
        if (isLegal) {
          const piece = game.get(selected);
          const toRank = square[1];
          const isPromotion = piece?.type === 'p' && (toRank === '8' || toRank === '1');
          if (isPromotion) {
            setPendingPromotion({ from: selected, to: square });
            return;
          }
          applyPlayerMove(selected, square, 'q');
          return;
        }
      }
      const piece = game.get(square);
      if (piece && piece.color === playerColorRef.current) setSelected(square);
      else setSelected(null);
    },
    [selected, thinking, applyPlayerMove],
  );

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setSelected(null);
  }, []);

  const newGame = useCallback(
    (color: Color) => {
      searchId.current += 1; // invalidates any in-flight search/analysis
      engine.cancelSearch();
      gameRef.current = new Chess();
      engine.newGame();
      suggestionRef.current = null;
      playerColorRef.current = color;
      setPlayerColor(color);
      setSelected(null);
      setPendingPromotion(null);
      setLastMove(null);
      setThinking(false);
      setRecords([]);
      setArrow(null);
      setCoachMove(null);
      refresh(color === 'w' ? 'New game — you play White' : 'New game — you play Black');
      if (color === 'b') requestEngineMove();
    },
    [engine, refresh, requestEngineMove],
  );

  /** Undo the last move pair (or the engine's single ply when player is Black). */
  const takeback = useCallback(() => {
    const game = gameRef.current;
    if (game.isGameOver() || game.history().length === 0) return;
    if (thinking || game.turn() !== playerColorRef.current) return;
    searchId.current += 1;
    engine.cancelSearch();
    game.undo();
    if (game.turn() !== playerColorRef.current && game.history().length > 0) game.undo();
    const drop = game.turn() === playerColorRef.current ? 2 : 1;
    setRecords((prev) => prev.slice(0, Math.max(0, prev.length - drop)));
    suggestionRef.current = null;
    setSelected(null);
    setArrow(null);
    setCoachMove(null);
    setLastMove(null);
    refresh(describe());
  }, [engine, thinking, refresh, describe]);

  const resign = useCallback(() => {
    searchId.current += 1;
    engine.cancelSearch();
    setThinking(false);
    setSelected(null);
    setStatus(playerColorRef.current === 'w' ? 'Resigned — Black wins' : 'Resigned — White wins');
  }, [engine]);

  const pgn = useCallback(() => gameRef.current.pgn(), []);

  /** Latest known white-POV eval for the bar. */
  const lastEvalCp = useCallback((): number | null => {
    for (let i = recordsRef.current.length - 1; i >= 0; i--) {
      const e = recordsRef.current[i];
      if (e.evalAfter !== null) return e.evalAfter;
    }
    return null;
  }, []);

  return {
    fen,
    status,
    thinking,
    playerColor,
    selected,
    lastMove,
    records,
    pendingPromotion,
    arrow,
    coachMove,
    legalTargets,
    onSquarePress,
    applyPlayerMove,
    cancelPromotion,
    newGame,
    takeback,
    resign,
    pgn,
    setLevelIndex,
    setCoachMove,
    lastEvalCp,
    board: fenToBoard(fen),
  };
}

function sanFor(fen: string, move: { from: string; to: string; promotion?: string }): string | null {
  try {
    const probe = new Chess(fen);
    const applied = probe.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    return applied.san;
  } catch {
    return null;
  }
}

type Piece = string | null;

function fenToBoard(fen: string): Piece[][] {
  const placement = fen.split(' ')[0];
  const rows = placement.split('/');
  return rows.map((row) => {
    const cells: Piece[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}
