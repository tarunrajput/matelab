import { Chess } from 'chess.js';

export interface PgnImportResult {
  pgn: string;
  fen: string;
  moves: string[];
  result: string;
  headers: Record<string, string>;
  error?: string;
}

export function exportPgn(fen: string, moves: string[], headers?: Record<string, string>): string {
  const chess = new Chess(fen.startsWith('rnbqkbnr') ? undefined : fen);
  // if fen is not start, load it
  if (!fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')) {
    try { chess.load(fen); } catch {}
  }
  for (const m of moves) {
    try { chess.move(m); } catch {}
  }
  if (headers) {
    for (const [k, v] of Object.entries(headers)) chess.setHeader(k, v);
  }
  return chess.pgn();
}

export function importPgn(pgnText: string): PgnImportResult {
  const chess = new Chess();
  try {
    chess.loadPgn(pgnText);
    const headers = chess.getHeaders() as Record<string, string>;
    const history = chess.history();
    const fen = chess.fen();
    const result = headers.Result ?? '*';
    return { pgn: chess.pgn(), fen, moves: history, headers, result };
  } catch (e) {
    return { pgn: '', fen: new Chess().fen(), moves: [], result: '*', headers: {}, error: String(e) };
  }
}

export function resultFromChess(chess: Chess): string {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? '0-1' : '1-0';
  if (chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial() || chess.isThreefoldRepetition()) return '1/2-1/2';
  return '*';
}

export function sanitizePgnForShare(pgn: string): string {
  return pgn.trim() || '*';
}
