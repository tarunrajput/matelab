import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listGames, type StoredGame } from '../storage/db';
import { computeStats } from '../stats/compute';
import { buildCoachTips } from '../coach/insights';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

export function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [games, setGames] = useState<StoredGame[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    listGames(200).then(setGames);
  }, []);

  const stats = computeStats(games);
  const tips = buildCoachTips(games);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, gap: 14, paddingBottom: insets.bottom + 16 }}>
      <Text style={styles.title}>Stats & Rating</Text>

      <View style={styles.grid}>
        <Card label="Rating" value={`${stats.rating}`} sub={`${stats.rating >= 1200 ? '+' : ''}${stats.rating - 1200} vs start`} />
        <Card label="Win rate" value={`${stats.winRate}%`} sub={`${stats.wins}W ${stats.losses}L ${stats.draws}D`} />
        <Card label="Played" value={`${stats.played}`} sub={`streak ${stats.streak} · best ${stats.bestStreak}`} />
        <Card label="Accuracy" value={stats.avgAccuracy != null ? `${stats.avgAccuracy}%` : '—'} sub="avg of rated games" />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Progress</Text>
        {stats.ratingHistory.length < 2 ? (
          <Text style={styles.empty}>Play a rated game to see your rating trend.</Text>
        ) : (
          <View style={styles.barRow}>
            {stats.ratingHistory.slice(-20).map((r, i, all) => {
              const min = Math.min(...all);
              const range = Math.max(...all) - min;
              const h = range === 0 ? 24 : 8 + ((r - min) / range) * 36;
              const active = i === all.length - 1;
              return <View key={i} style={[styles.bar, { height: h }, active && styles.barActive]} />;
            })}
          </View>
        )}
        <Text style={styles.hint}>Rating over time — Glicko-lite: ±32 per game vs opponent Elo.</Text>
        {!!stats.recentForm.length && <Text style={styles.form}>Form: {stats.recentForm.join(' ')}</Text>}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>By mode</Text>
        {Object.entries(stats.byMode).length ? Object.entries(stats.byMode).map(([k, v]) => (
          <Text key={k} style={styles.line}>{k}: {v}</Text>
        )) : <Text style={styles.empty}>No games yet</Text>}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>AI Coach — Personalized Feedback</Text>
        <Text style={styles.coachSub}>Rule-based engine analysis of your history — offline, no LLM.</Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          {tips.map(t => (
            <View key={t.id} style={[styles.tip, t.severity === 'critical' && styles.tipCrit, t.severity === 'warn' && styles.tipWarn]}>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipBody}>{t.detail}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <View style={styles.card}><Text style={styles.cardLabel}>{label}</Text><Text style={styles.cardVal}>{value}</Text><Text style={styles.cardSub}>{sub}</Text></View>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  title: { color: c.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '48%', backgroundColor: c.card, borderRadius: 12, padding: 12, gap: 2, borderWidth: 1, borderColor: c.border },
  cardLabel: { color: c.textMuted, fontSize: 10, letterSpacing: 0.6 },
  cardVal: { color: c.text, fontSize: 20, fontWeight: '800' },
  cardSub: { color: c.textFaint, fontSize: 10 },
  panel: { backgroundColor: c.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border, gap: 6 },
  panelTitle: { color: c.text, fontSize: 13, fontWeight: '700' },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 44, marginTop: 4 },
  bar: { flex: 1, backgroundColor: c.track, borderRadius: 3 },
  barActive: { backgroundColor: c.accent },
  hint: { color: c.textFaint, fontSize: 10 },
  form: { color: c.textDim, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  line: { color: c.textDim, fontSize: 12 },
  empty: { color: c.textFaint, fontSize: 12 },
  coachSub: { color: c.textMuted, fontSize: 11 },
  tip: { backgroundColor: c.sunken, borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: c.borderStrong, gap: 2 },
  tipWarn: { borderLeftColor: c.warn },
  tipCrit: { borderLeftColor: c.danger },
  tipTitle: { color: c.text, fontSize: 12, fontWeight: '700' },
  tipBody: { color: c.textMuted, fontSize: 11, lineHeight: 14 },
});
