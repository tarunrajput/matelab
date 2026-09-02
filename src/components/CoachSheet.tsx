import { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Classification, MoveRecord } from '../game/useChessGame';
import { classificationColor, type ThemeColors } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

const LABELS: Record<Classification, string> = {
  blunder: 'Blunder',
  mistake: 'Mistake',
  inaccuracy: 'Inaccuracy',
};

function fmtEval(cp: number | null): string {
  if (cp === null) return '?';
  if (Math.abs(cp) >= 10000) return cp > 0 ? '+M' : '−M';
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : pawns < 0 ? '−' : ''}${Math.abs(pawns).toFixed(1)}`;
}

interface CoachSheetProps {
  record: MoveRecord | null;
  onClose: () => void;
}

/** Explanation sheet for a flagged move — generated from engine data, no LLM. */
export function CoachSheet({ record, onClose }: CoachSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={record !== null} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
        {record && (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={[styles.badge, { color: record.classification ? classificationColor(record.classification, colors) : colors.textDim }]}>
                {record.classification ? LABELS[record.classification] : 'Move review'}
              </Text>
              <Text style={styles.san}>{record.san}</Text>
            </View>
            <Text style={styles.body}>
              {record.classification
                ? `This move swings the game against you.`
                : 'Solid continuation.'}
            </Text>
            {record.bestSan && (
              <Text style={styles.body}>
                Better was <Text style={styles.best}>{record.bestSan}</Text>.
              </Text>
            )}
            <Text style={styles.evalLine}>
              Eval after: {fmtEval(record.evalAfter)} (White POV)
            </Text>
            <TouchableOpacity style={styles.close} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeText}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.scrim,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: c.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    fontSize: 18,
    fontWeight: '800',
  },
  san: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    color: c.textDim,
    fontSize: 14,
  },
  best: {
    color: c.success,
    fontWeight: '700',
  },
  evalLine: {
    color: c.textFaint,
    fontSize: 12,
  },
  close: {
    backgroundColor: c.cardAlt,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  closeText: {
    color: c.text,
    fontWeight: '600',
  },
});
