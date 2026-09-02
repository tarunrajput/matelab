import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { TIME_CONTROLS, type TimeControl } from '../game/clock';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

interface Props { value: TimeControl | null; onChange: (tc: TimeControl | null) => void; }

export function TimeControlPicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [customOpen, setCustomOpen] = useState(false);
  const [min, setMin] = useState('5');
  const [inc, setInc] = useState('0');
  const applyCustom = () => {
    const m = Math.max(1, Math.min(180, Number(min) || 5));
    const i = Math.max(0, Math.min(60, Number(inc) || 0));
    const tc: TimeControl = { id: `custom-${m}-${i}`, label: `Custom ${m}|${i}`, initialMs: m * 60_000, incrementMs: i * 1000, category: 'Custom' };
    onChange(tc);
    setCustomOpen(false);
  };
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Clock</Text>
      <View style={styles.grid}>
        <Chip active={value === null} label="No clock" onPress={() => onChange(null)} />
        {TIME_CONTROLS.map((tc) => (
          <Chip key={tc.id} active={value?.id === tc.id} label={tc.label} onPress={() => onChange(tc)} />
        ))}
        <Chip active={value?.category === 'Custom'} label={value?.category === 'Custom' ? value.label : 'Custom'} onPress={() => setCustomOpen(true)} />
      </View>
      <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => setCustomOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Custom clock</Text>
            <View style={styles.row}>
              <View style={styles.field}><Text style={styles.fieldLabel}>Minutes</Text><TextInput value={min} onChangeText={setMin} keyboardType="number-pad" style={styles.input} /></View>
              <View style={styles.field}><Text style={styles.fieldLabel}>Increment (sec)</Text><TextInput value={inc} onChangeText={setInc} keyboardType="number-pad" style={styles.input} /></View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setCustomOpen(false)} style={styles.smallBtn}><Text style={styles.smallText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={applyCustom} style={[styles.smallBtn, styles.primary]}><Text style={[styles.smallText, styles.primaryText]}>Apply</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]} activeOpacity={0.8}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { width: '100%', gap: 6 },
  label: { color: c.textMuted, fontSize: 11, letterSpacing: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: { backgroundColor: c.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  chipText: { color: c.textDim, fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: c.onAccent },
  scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: c.borderStrong },
  cardTitle: { color: c.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, gap: 4 },
  fieldLabel: { color: c.textMuted, fontSize: 11 },
  input: { backgroundColor: c.sunken, borderRadius: 8, padding: 10, color: c.text, borderWidth: 1, borderColor: c.border, fontSize: 14, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  smallBtn: { backgroundColor: c.cardAlt, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  smallText: { color: c.text, fontSize: 12, fontWeight: '600' },
  primary: { backgroundColor: c.accent },
  primaryText: { color: c.onAccent },
});
