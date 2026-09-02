import type { Classification, MoveRecord } from './useChessGame';

export interface ReviewSummary {
  accuracyWhite: number | null;
  accuracyBlack: number | null;
  countsWhite: Record<Classification, number>;
  countsBlack: Record<Classification, number>;
  totalWhite: number;
  totalBlack: number;
  avgLossWhite: number | null;
  avgLossBlack: number | null;
  bestMove?: string | null;
  worstMove?: { san: string; classification: Classification } | null;
}

function avgLossFor(records: MoveRecord[], color: 'w' | 'b'): number | null {
  // Need evalBefore/After pairs; approximate via evalAfter delta
  const losses: number[] = [];
  for (let i = 1; i < records.length; i++) {
    const cur = records[i];
    const prev = records[i - 1];
    if (cur.mover !== color) continue;
    if (cur.evalAfter == null || prev.evalAfter == null) continue;
    const loss = color === 'w' ? prev.evalAfter - cur.evalAfter : cur.evalAfter - prev.evalAfter;
    if (loss > 0) losses.push(loss);
    else losses.push(0);
  }
  if (losses.length === 0) return null;
  return losses.reduce((a, b) => a + b, 0) / losses.length;
}

function accuracyFromAvgLoss(avg: number | null): number | null {
  if (avg == null) return null;
  // Chess.com-ish curve: 100 * exp(-avg/400) approx, clamp
  const acc = 100 * Math.exp(-avg / 600);
  return Math.max(0, Math.min(100, Math.round(acc * 10) / 10));
}

export function summarizeReview(records: MoveRecord[]): ReviewSummary {
  const countsWhite: Record<Classification, number> = { blunder: 0, mistake: 0, inaccuracy: 0 };
  const countsBlack: Record<Classification, number> = { blunder: 0, mistake: 0, inaccuracy: 0 };
  let totalWhite = 0, totalBlack = 0;
  let worst: { san: string; classification: Classification } | null = null;

  for (const r of records) {
    if (r.mover === 'w') {
      totalWhite++;
      if (r.classification) {
        countsWhite[r.classification]++;
        if (!worst || r.classification === 'blunder') worst = { san: r.san, classification: r.classification };
      }
    } else {
      totalBlack++;
      if (r.classification) {
        countsBlack[r.classification]++;
      }
    }
  }
  const avgW = avgLossFor(records, 'w');
  const avgB = avgLossFor(records, 'b');
  return {
    accuracyWhite: accuracyFromAvgLoss(avgW),
    accuracyBlack: accuracyFromAvgLoss(avgB),
    countsWhite, countsBlack, totalWhite, totalBlack,
    avgLossWhite: avgW, avgLossBlack: avgB,
    worstMove: worst,
  };
}

export function resultLabel(result: string): string {
  if (result === '1-0') return 'White wins';
  if (result === '0-1') return 'Black wins';
  if (result === '1/2-1/2') return 'Draw';
  return 'In progress';
}
