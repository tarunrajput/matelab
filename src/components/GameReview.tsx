import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MoveRecord } from '../game/useChessGame';
import { summarizeReview } from '../game/review';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

export function GameReview({ records }: { records: MoveRecord[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const s = summarizeReview(records);
  // eval graph data: map evalAfter to points
  const evals = records.map(r => r.evalAfter).filter((v): v is number => v != null);
  const max = evals.length ? Math.max(...evals.map(e => Math.min(800, Math.max(-800, e)))) : 0;
  const min = evals.length ? Math.min(...evals.map(e => Math.min(800, Math.max(-800, e)))) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Game Review</Text>
      <View style={styles.row}>
        <Stat label="White acc." value={s.accuracyWhite != null ? `${s.accuracyWhite}%` : '—'} />
        <Stat label="Black acc." value={s.accuracyBlack != null ? `${s.accuracyBlack}%` : '—'} />
        <Stat label="Moves" value={`${records.length}`} />
      </View>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.colTitle}>White</Text>
          <Text style={styles.line}>Blunders {s.countsWhite.blunder} · Mistakes {s.countsWhite.mistake} · Inacc {s.countsWhite.inaccuracy}</Text>
          {s.avgLossWhite != null && <Text style={styles.sub}>avg loss {Math.round(s.avgLossWhite)} cp</Text>}
        </View>
        <View style={styles.col}>
          <Text style={styles.colTitle}>Black</Text>
          <Text style={styles.line}>Blunders {s.countsBlack.blunder} · Mistakes {s.countsBlack.mistake} · Inacc {s.countsBlack.inaccuracy}</Text>
          {s.avgLossBlack != null && <Text style={styles.sub}>avg loss {Math.round(s.avgLossBlack)} cp</Text>}
        </View>
      </View>
      {/* simple eval bar graph */}
      <View style={styles.graphWrap}>
        {evals.length ? (
          <View style={styles.graph}>
            {evals.map((cp, i) => {
              const clamped = Math.max(-800, Math.min(800, cp));
              const norm = (clamped + 800) / 1600; // 0 black winning, 1 white winning, 0.5 even
              return <View key={i} style={[styles.dot, { left: `${(i / Math.max(1, evals.length - 1)) * 100}%`, bottom: `${norm * 100}%` }]} />;
            })}
            <View style={styles.midLine} />
          </View>
        ) : <Text style={styles.empty}>Play moves to see accuracy</Text>}
      </View>
      {s.worstMove && <Text style={styles.worst}>Worst: {s.worstMove.san} — {s.worstMove.classification}</Text>}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statVal}>{value}</Text></View>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: c.card, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: c.border, width: '100%' },
  title: { color: c.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 2 },
  colTitle: { color: c.textDim, fontSize: 12, fontWeight: '700' },
  line: { color: c.textMuted, fontSize: 11 },
  sub: { color: c.textFaint, fontSize: 10 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: c.cardAlt, borderRadius: 8, paddingVertical: 8 },
  statLabel: { color: c.textMuted, fontSize: 10, letterSpacing: 0.6 },
  statVal: { color: c.text, fontSize: 16, fontWeight: '700' },
  graphWrap: { height: 56, backgroundColor: c.sunken, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  graph: { position: 'relative', width: '100%', height: '100%' },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginLeft: -3, marginBottom: -3 },
  midLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: c.borderStrong },
  empty: { color: c.textFaint, fontSize: 11 },
  worst: { color: c.warn, fontSize: 11, fontWeight: '600' },
});
