import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { PromotionPiece } from '../game/useChessGame';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

const GLYPHS: Record<PromotionPiece, string> = { q: '♛', r: '♜', b: '♝', n: '♞' };

interface PromotionDialogProps {
  color: 'w' | 'b';
  onPick: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

export function PromotionDialog({ color, onPick, onCancel }: PromotionDialogProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onCancel}>
      <View style={styles.card}>
        <Text style={styles.title}>Promote to</Text>
        <View style={styles.row}>
          {(['q', 'r', 'b', 'n'] as PromotionPiece[]).map((piece) => (
            <TouchableOpacity key={piece} style={styles.option} onPress={() => onPick(piece)} activeOpacity={0.7}>
              <Text style={[styles.glyph, { color: color === 'w' ? '#fafafa' : '#1c1c1e' }]}>{GLYPHS[piece]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  title: {
    color: c.textDim,
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: c.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 42,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
