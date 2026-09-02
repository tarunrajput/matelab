import type { StoredGame } from '../storage/db';

export interface StatsSummary {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  streak: number;
  bestStreak: number;
  avgAccuracy: number | null;
  rating: number;
  ratingHistory: number[];
  byMode: Record<string, number>;
  recentForm: Array<'W' | 'L' | 'D' | '-'>;
}

function eloDelta(player: number, opponent: number, score: number): number {
  const expected = 1 / (1 + Math.pow(10, (opponent - player) / 400));
  return Math.round(32 * (score - expected));
}

export function computeStats(games: StoredGame[], playerColorDefault: 'w' | 'b' = 'w'): StatsSummary {
  const played = games.length;
  let wins = 0, losses = 0, draws = 0;
  let rating = 1200;
  const ratingHistory: number[] = [rating];
  let streak = 0, bestStreak = 0, curStreak = 0;
  let accSum = 0, accCount = 0;
  const byMode: Record<string, number> = {};
  const recentForm: Array<'W' | 'L' | 'D' | '-'> = [];

  // chronological order for rating
  const chrono = [...games].sort((a, b) => a.createdAt - b.createdAt);

  for (const g of chrono) {
    byMode[g.mode] = (byMode[g.mode] ?? 0) + 1;
    const acc = g.whiteAccuracy ?? g.blackAccuracy ?? null;
    if (acc != null) { accSum += acc; accCount++; }
    // Determine win/loss from perspective of games's playerColor or default
    // If playerColor is null (puzzle etc), skip W/L
    let score: number | null = null;
    let char: 'W' | 'L' | 'D' | '-' = '-';
    if (g.result === '1-0' || g.result === '0-1' || g.result === '1/2-1/2') {
      if (g.playerColor === 'w') {
        if (g.result === '1-0') { wins++; score = 1; char = 'W'; curStreak = curStreak > 0 ? curStreak + 1 : 1; }
        else if (g.result === '0-1') { losses++; score = 0; char = 'L'; curStreak = curStreak < 0 ? curStreak - 1 : -1; }
        else { draws++; score = 0.5; char = 'D'; curStreak = 0; }
      } else if (g.playerColor === 'b') {
        if (g.result === '0-1') { wins++; score = 1; char = 'W'; curStreak = curStreak > 0 ? curStreak + 1 : 1; }
        else if (g.result === '1-0') { losses++; score = 0; char = 'L'; curStreak = curStreak < 0 ? curStreak - 1 : -1; }
        else { draws++; score = 0.5; char = 'D'; curStreak = 0; }
      } else {
        // no player color: treat as neutral, count draw etc not in winRate
        if (g.result === '1/2-1/2') draws++;
        char = g.result === '1/2-1/2' ? 'D' : '-';
      }
      if (score != null) {
        const oppElo = g.elo ?? 1200;
        rating += eloDelta(rating, oppElo, score);
        ratingHistory.push(rating);
      }
      bestStreak = Math.max(bestStreak, curStreak);
    }
    recentForm.push(char);
  }

  // keep only last 10 for display but compute all
  const recent = recentForm.slice(-10);
  // current streak is curStreak if positive else 0
  streak = curStreak > 0 ? curStreak : 0;

  const winRate = played ? Math.round((wins / Math.max(1, wins + losses + draws)) * 1000) / 10 : 0;
  const avgAccuracy = accCount ? Math.round((accSum / accCount) * 10) / 10 : null;

  return { played, wins, losses, draws, winRate, streak, bestStreak, avgAccuracy, rating, ratingHistory, byMode, recentForm: recent };
}
