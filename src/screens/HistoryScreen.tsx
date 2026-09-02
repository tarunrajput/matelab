import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Chess } from 'chess.js';
import * as Clipboard from 'expo-clipboard';
import { deleteGame, listGames, type StoredGame } from '../storage/db';
import { resultLabel } from '../game/review';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

export function HistoryScreen({ onImportPgn }: { onImportPgn?: (pgn: string) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [games, setGames] = useState<StoredGame[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const g = await listGames(100);
    setGames(g);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const copy = async (pgn: string) => {
    await Clipboard.setStringAsync(pgn);
  };

  const remove = async (id: number) => {
    await deleteGame(id);
    await refresh();
  };

  if (!games.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.title}>Game History</Text>
        <Text style={styles.empty}>No games yet — finish a game vs AI or 2-Player to see it here. PGN is saved automatically.</Text>
        <TouchableOpacity onPress={refresh} style={styles.btn}><Text style={styles.btnText}>Refresh</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Game History</Text>
      <Text style={styles.sub}>{games.length} games · tap to expand</Text>
      <ScrollView style={styles.list} contentContainerStyle={{ gap: 8, paddingBottom: 80 }}>
        {games.map((g) => {
          const date = new Date(g.createdAt).toLocaleString();
          const isOpen = expanded === g.id;
          let opening = '';
          try {
            const c = new Chess();
            c.loadPgn(g.pgn);
            opening = c.history().slice(0, 6).join(' ');
          } catch {}
          return (
            <TouchableOpacity key={g.id} onPress={() => setExpanded(isOpen ? null : g.id)} activeOpacity={0.85} style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.result}>{g.result} · {resultLabel(g.result)}</Text>
                <Text style={styles.date}>{date}</Text>
              </View>
              <Text style={styles.meta}>{g.mode} {g.elo ? `· ${g.elo} Elo` : ''} {g.timeControl ? `· ${g.timeControl}` : ''} · {g.moveCount} ply</Text>
              {(g.whiteAccuracy != null || g.blackAccuracy != null) && (
                <Text style={styles.acc}>Acc W {g.whiteAccuracy ?? '—'}% · B {g.blackAccuracy ?? '—'}%</Text>
              )}
              <Text style={styles.pgnPreview} numberOfLines={isOpen ? 0 : 2}>{opening || g.pgn.slice(0, 120)}</Text>
              {isOpen && (
                <View style={styles.actions}>
                  <SmallBtn label="Copy PGN" onPress={() => copy(g.pgn)} />
                  <SmallBtn label="Load PGN" onPress={() => onImportPgn?.(g.pgn)} />
                  <SmallBtn label="Delete" danger onPress={() => remove(g.id)} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SmallBtn({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <TouchableOpacity onPress={onPress} style={[styles.smallBtn, danger && styles.danger]} activeOpacity={0.8}><Text style={[styles.smallText, danger && styles.dangerText]}>{label}</Text></TouchableOpacity>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingTop: 18, paddingHorizontal: 12 },
  emptyWrap: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  empty: { color: c.textMuted, fontSize: 13, textAlign: 'center' },
  title: { color: c.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sub: { color: c.textFaint, fontSize: 11, textAlign: 'center', marginBottom: 8 },
  list: { flex: 1 },
  card: { backgroundColor: c.card, borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: c.border },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  result: { color: c.text, fontSize: 13, fontWeight: '700' },
  date: { color: c.textFaint, fontSize: 10 },
  meta: { color: c.textMuted, fontSize: 11 },
  acc: { color: c.textDim, fontSize: 11, fontWeight: '600' },
  pgnPreview: { color: c.textFaint, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { backgroundColor: c.cardAlt, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnText: { color: c.text, fontSize: 12, fontWeight: '600' },
  smallBtn: { backgroundColor: c.cardAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: c.border },
  smallText: { color: c.text, fontSize: 11, fontWeight: '600' },
  danger: { backgroundColor: c.dangerBg, borderColor: c.dangerBorder },
  dangerText: { color: c.dangerText },
});
