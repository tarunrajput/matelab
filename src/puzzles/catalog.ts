export interface Puzzle {
  id: string;
  fen: string;
  moves: string[]; // UCI moves in order, player to move first; even indices = solution, odd = opponent auto-reply (if any)
  rating: number;
  theme: string;
  description: string;
}

// Every entry is machine-validated with chess.js: FEN loads, each UCI move is
// legal in sequence, mate-themed puzzles end in checkmate, and mate-in-2 keys
// refute every opponent reply. Re-run such a script if you edit this list.
export const PUZZLES: Puzzle[] = [
  { id: 'p01', fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', moves: ['e1e8'], rating: 600, theme: 'Mate in 1', description: 'Back-rank mate — the king is boxed in by its own pawns' },
  { id: 'p02', fen: 'rnb1kbnr/pppp1ppp/8/4p3/4q1P1/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 3', moves: ['f3e4'], rating: 600, theme: 'Hanging piece', description: 'The bold queen has stepped onto a pawn capture' },
  { id: 'p03', fen: 'r3k3/8/8/4n3/8/5N2/8/4R1K1 w - - 0 1', moves: ['f3e5'], rating: 650, theme: 'Hanging piece', description: 'The enemy knight has no defenders — take it' },
  { id: 'p04', fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', moves: ['h1h8'], rating: 650, theme: 'Mate in 1', description: 'Cut off the king, then deliver the rook mate' },
  { id: 'p05', fen: '7k/8/6K1/8/8/8/8/3Q4 w - - 0 1', moves: ['d1d8'], rating: 650, theme: 'Mate in 1', description: 'Walk the king up and let the queen deliver' },
  { id: 'p06', fen: 'k7/8/1K6/8/3Q4/8/8/8 w - - 0 1', moves: ['d4h8'], rating: 700, theme: 'Mate in 1', description: 'The queen finishes from the long diagonal' },
  { id: 'p07', fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', moves: ['d1d8'], rating: 700, theme: 'Mate in 1', description: 'Take the rook and mate on the back rank in one' },
  { id: 'p08', fen: '6rk/6pp/8/6N1/8/8/8/K7 w - - 0 1', moves: ['g5f7'], rating: 750, theme: 'Mate in 1', description: 'Smothered mate — the king is buried by its own army' },
  { id: 'p09', fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', moves: ['d5c7', 'e8d7', 'c7a8'], rating: 800, theme: 'Fork', description: 'A knight check that also hits the rook' },
  { id: 'p10', fen: '2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', moves: ['d5e7', 'g8f8', 'e7c8'], rating: 900, theme: 'Fork', description: 'Check the king, then scoop up the rook' },
  { id: 'p11', fen: '7k/8/5K2/8/8/8/8/R7 w - - 0 1', moves: ['f6g6', 'h8g8', 'a1a8'], rating: 850, theme: 'Mate in 2', description: 'Bring the king up first — the rook finishes' },
  { id: 'p12', fen: '6k1/8/6K1/8/8/8/8/7R w - - 0 1', moves: ['h1f1', 'g8h8', 'f1f8'], rating: 900, theme: 'Mate in 2', description: 'A quiet rook move traps the king in the corner' },
  { id: 'p13', fen: '6q1/8/8/6k1/8/8/8/5R1K w - - 0 1', moves: ['f1g1', 'g5f6', 'g1g8'], rating: 950, theme: 'Skewer', description: 'Check first, then collect the queen behind it' },
];

// helper to get next expected UCI
export function puzzleProgress(puzzle: Puzzle, ply: number): string | null {
  return puzzle.moves[ply] ?? null;
}
