import type { StoredGame } from '../storage/db';
import { Chess } from 'chess.js';

export interface CoachTip {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'warn' | 'critical';
}

export function buildCoachTips(games: StoredGame[]): CoachTip[] {
  const tips: CoachTip[] = [];
  if (games.length === 0) {
    tips.push({ id: 'welcome', title: 'Welcome to MateLab', detail: 'Play your first game vs the engine. Every blunder will become a personalized puzzle and your coach will learn from your games.', severity: 'info' });
    return tips;
  }

  // Analyze results
  const losses = games.filter(g => {
    if (g.playerColor === 'w' && g.result === '0-1') return true;
    if (g.playerColor === 'b' && g.result === '1-0') return true;
    return false;
  }).length;

  const totalRated = games.filter(g => g.result !== '*').length;
  const lossRate = totalRated ? losses / totalRated : 0;

  if (lossRate > 0.5) {
    tips.push({ id: 'loss-rate', title: 'Tough stretch', detail: `You lost ${Math.round(lossRate * 100)}% of rated games. Try lowering the Dial to 800–1200 and focus on not hanging pieces.`, severity: 'warn' });
  } else if (lossRate < 0.2 && totalRated >= 5) {
    tips.push({ id: 'raise', title: 'Ready to level up', detail: 'Win rate >80% over last games — bump the Dial by 400 Elo to keep learning.', severity: 'info' });
  }

  // Accuracy trend
  const accs = games.map(g => g.whiteAccuracy ?? g.blackAccuracy).filter((v): v is number => v != null);
  if (accs.length >= 3) {
    const last3 = accs.slice(-3);
    const avgLast3 = last3.reduce((a, b) => a + b, 0) / last3.length;
    const prevAvg = accs.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, accs.length - 3);
    if (avgLast3 < prevAvg - 3) {
      tips.push({ id: 'acc-down', title: 'Accuracy dipping', detail: `Recent accuracy ${avgLast3.toFixed(1)}% vs earlier ${prevAvg.toFixed(1)}% — review your last two losses in Game History with the engine arrows.`, severity: 'warn' });
    } else if (avgLast3 > 85) {
      tips.push({ id: 'acc-high', title: 'Sharp play', detail: `Accuracy ${avgLast3.toFixed(1)}% — excellent! Keep challenging yourself with puzzles.`, severity: 'info' });
    }
  }

  // Time pressure: look for bullet games with low move counts (flagged quickly)
  const bulletShort = games.filter(g => g.timeControl?.includes('Bullet') && g.moveCount < 20).length;
  if (bulletShort >= 2) {
    tips.push({ id: 'time', title: 'Time trouble', detail: 'Several bullet games ended early — try 3|2 or 5|0 to practice calculation without flagging.', severity: 'warn' });
  }

  // Blunder phase detection via PGN sampling (cheap heuristic: which ply blundered)
  // We use stored PGN to estimate opening vs endgame: if game ended <30 moves likely opening/middlegame loss
  const shortLosses = games.filter(g => g.moveCount < 30 && ( (g.playerColor === 'w' && g.result === '0-1') || (g.playerColor === 'b' && g.result === '1-0'))).length;
  if (shortLosses >= 2) {
    tips.push({ id: 'opening', title: 'Opening stability', detail: 'Multiple losses under 30 moves — spend 15 minutes in Analysis Board checking your first 8 moves with engine eval before playing.', severity: 'warn' });
  }

  // Endgame: many draws or long games
  const longDraws = games.filter(g => g.result === '1/2-1/2' && g.moveCount > 60).length;
  if (longDraws >= 1) {
    tips.push({ id: 'endgame', title: 'Endgame grind', detail: 'Long draws suggest endgame technique — practice rook and pawn puzzles to convert advantages.', severity: 'info' });
  }

  // Personalized opener: inspect last game's opening (first 4 ply)
  const last = games[0];
  if (last?.pgn) {
    try {
      const c = new Chess();
      c.loadPgn(last.pgn);
      const hist = c.history();
      if (hist.length >= 4) {
        tips.push({ id: 'last-opening', title: 'Last game focus', detail: `Your last opening: ${hist.slice(0, 4).join(' ')} — analyze it on the Analysis Board to see where eval shifted.`, severity: 'info' });
      }
    } catch {}
  }

  if (tips.length === 0) {
    tips.push({ id: 'steady', title: 'Steady progress', detail: 'Keep playing — your coach gets sharper as you log more games.', severity: 'info' });
  }
  return tips.slice(0, 5);
}
