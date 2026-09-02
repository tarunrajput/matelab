import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export interface StoredGame {
  id: number;
  pgn: string;
  fen: string;
  result: string; // "1-0" | "0-1" | "1/2-1/2" | "*"
  mode: string; // vsAI | vsPlayer | puzzle
  playerColor: string | null;
  timeControl: string | null;
  elo: number | null;
  createdAt: number;
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  moveCount: number;
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('matelab.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS games (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pgn TEXT NOT NULL,
          fen TEXT NOT NULL,
          result TEXT NOT NULL,
          mode TEXT NOT NULL,
          playerColor TEXT,
          timeControl TEXT,
          elo INTEGER,
          createdAt INTEGER NOT NULL,
          whiteAccuracy REAL,
          blackAccuracy REAL,
          moveCount INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS puzzle_progress (
          id TEXT PRIMARY KEY NOT NULL,
          solved INTEGER NOT NULL,
          attempts INTEGER NOT NULL,
          bestTimeMs INTEGER
        );
        CREATE TABLE IF NOT EXISTS stats (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function saveGame(game: Omit<StoredGame, 'id'>): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO games (pgn, fen, result, mode, playerColor, timeControl, elo, createdAt, whiteAccuracy, blackAccuracy, moveCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    game.pgn,
    game.fen,
    game.result,
    game.mode,
    game.playerColor,
    game.timeControl,
    game.elo,
    game.createdAt,
    game.whiteAccuracy,
    game.blackAccuracy,
    game.moveCount
  );
  return res.lastInsertRowId;
}

export async function listGames(limit = 100): Promise<StoredGame[]> {
  const db = await getDb();
  return db.getAllAsync<StoredGame>('SELECT * FROM games ORDER BY createdAt DESC LIMIT ?', limit);
}

export async function getGame(id: number): Promise<StoredGame | null> {
  const db = await getDb();
  return db.getFirstAsync<StoredGame>('SELECT * FROM games WHERE id = ?', id);
}

export async function deleteGame(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM games WHERE id = ?', id);
}

export async function clearGames(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM games');
}

export async function getPuzzleProgress(id: string): Promise<{ solved: number; attempts: number; bestTimeMs: number | null } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ solved: number; attempts: number; bestTimeMs: number | null }>('SELECT * FROM puzzle_progress WHERE id = ?', id);
  return row ?? null;
}

export async function upsertPuzzleProgress(id: string, solved: boolean, timeMs?: number): Promise<void> {
  const db = await getDb();
  const existing = await getPuzzleProgress(id);
  if (!existing) {
    await db.runAsync('INSERT INTO puzzle_progress (id, solved, attempts, bestTimeMs) VALUES (?, ?, ?, ?)', id, solved ? 1 : 0, 1, timeMs ?? null);
  } else {
    const attempts = existing.attempts + 1;
    const solvedVal = existing.solved || (solved ? 1 : 0);
    let best = existing.bestTimeMs;
    if (solved && timeMs != null) best = best == null ? timeMs : Math.min(best, timeMs);
    await db.runAsync('UPDATE puzzle_progress SET solved = ?, attempts = ?, bestTimeMs = ? WHERE id = ?', solvedVal, attempts, best, id);
  }
}

export async function listPuzzleProgress(): Promise<Array<{ id: string; solved: number; attempts: number; bestTimeMs: number | null }>> {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM puzzle_progress');
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM stats WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO stats (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}
