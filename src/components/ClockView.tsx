import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

interface ClockViewProps {
  whiteMs: number;
  blackMs: number;
  turn: 'w' | 'b';
  running: 'w' | 'b' | null;
  flag: 'w' | 'b' | null;
  flipped?: boolean;
}

function fmt(ms: number): string {
  if (ms <= 0) return '0:00.0';
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const tenths = Math.floor((ms % 1000) / 100);
  if (m >= 1 || totalSec >= 10) return `${m}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
}

export function ClockView({ whiteMs, blackMs, turn, running, flag, flipped }: ClockViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const topMs = flipped ? whiteMs : blackMs;
  const bottomMs = flipped ? blackMs : whiteMs;
  const topColor = flipped ? 'w' : 'b';
  const bottomColor = flipped ? 'b' : 'w';

  const Card = ({ ms, color }: { ms: number; color: 'w' | 'b' }) => {
    const active = running === color;
    const flagged = flag === color;
    return (
      <View style={[styles.card, active && styles.active, flagged && styles.flagged]}>
        <Text style={[styles.time, active && styles.timeActive, flagged && styles.timeFlag]}>{fmt(ms)}</Text>
        <Text style={styles.label}>{color === 'w' ? 'White' : 'Black'}{active ? ' ●' : ''}{flagged ? ' — flag' : ''}</Text>
      </View>
    );
  };

  return (
    <View style={styles.row}>
      <Card ms={topMs} color={topColor} />
      <Card ms={bottomMs} color={bottomColor} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, width: '100%', justifyContent: 'center' },
  card: { flex: 1, backgroundColor: c.card, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  active: { borderColor: c.accent, backgroundColor: c.clockActiveBg },
  flagged: { borderColor: c.danger, backgroundColor: c.dangerBg },
  time: { color: c.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timeActive: { color: c.accentText },
  timeFlag: { color: c.dangerText },
  label: { color: c.textMuted, fontSize: 11, marginTop: 2, letterSpacing: 0.5 },
});
