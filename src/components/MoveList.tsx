import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Classification, MoveRecord } from '../game/useChessGame';
import { classificationColor, type ThemeColors } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

interface MoveListProps {
  records: MoveRecord[];
  /** Called with the tapped record (only classified moves are tappable) */
  onSelect: (record: MoveRecord) => void;
}

/** Numbered move pairs; classified player moves get a colored badge and are tappable. */
export function MoveList({ records, onSelect }: MoveListProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pairs: Array<{ number: number; white?: MoveRecord; black?: MoveRecord }> = [];
  records.forEach((r) => {
    if (r.mover === 'w') pairs.push({ number: pairs.length + 1, white: r });
    else if (pairs.length > 0 && !pairs[pairs.length - 1].black) pairs[pairs.length - 1].black = r;
    else pairs.push({ number: pairs.length + 1, black: r });
  });

  return (
    <View style={styles.wrap}>
      {pairs.map((pair) => (
        <View key={`m${pair.number}`} style={styles.pair}>
          <Text style={styles.number}>{pair.number}.</Text>
          {pair.white ? <MoveCell record={pair.white} onSelect={onSelect} /> : <Text style={styles.empty}>…</Text>}
          {pair.black ? <MoveCell record={pair.black} onSelect={onSelect} /> : null}
        </View>
      ))}
      {records.length === 0 && <Text style={styles.placeholder}>Moves will appear here</Text>}
    </View>
  );
}

function MoveCell({ record, onSelect }: { record: MoveRecord; onSelect: (r: MoveRecord) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tappable = record.classification !== null;
  return (
    <TouchableOpacity
      disabled={!tappable}
      onPress={() => onSelect(record)}
      style={styles.cell}
      activeOpacity={tappable ? 0.7 : 1}
    >
      <Text style={[styles.san, tappable && styles.flaggedSan]}>{record.san}</Text>
      {record.classification && <View style={[styles.dot, { backgroundColor: classificationColor(record.classification, colors) }]} />}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 34,
    maxHeight: 68,
    overflow: 'hidden',
    width: '92%',
    gap: 2,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  number: {
    color: c.textFaint,
    fontSize: 12,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  san: {
    color: c.textDim,
    fontSize: 13,
  },
  flaggedSan: {
    fontWeight: '700',
    color: c.text,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  empty: {
    color: c.textFaint,
    fontSize: 13,
  },
  placeholder: {
    color: c.textGhost,
    fontSize: 12,
  },
});
