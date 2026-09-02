import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

interface EvalBarProps {
  /** White-POV centipawns; null = unknown (bar at even) */
  cp: number | null;
  /** When the board is flipped, White's share renders from the top */
  flipped: boolean;
  height: number;
}

// The two fills represent the players (white/black), not the theme —
// they stay constant across light and dark like the board itself.
const WHITE_FILL = '#f4f4f5';
const BLACK_FILL = '#26262b';

/** Sigmoid mapping cp -> white win share, lichess/chess.com-style. */
function whiteShare(cp: number): number {
  const clamped = Math.max(-1500, Math.min(1500, cp));
  return 1 / (1 + Math.exp(-clamped / 400));
}

export function EvalBar({ cp, flipped, height }: EvalBarProps) {
  const { colors } = useTheme();
  const share = cp === null ? 0.5 : whiteShare(cp);
  const whiteHeight = height * share;
  // Unflipped: White fills from the bottom. Flipped: from the top.
  const whiteBlock = { height: whiteHeight, backgroundColor: WHITE_FILL };
  const blackBlock = { height: height - whiteHeight, backgroundColor: BLACK_FILL };

  return (
    <View style={[barStyles(colors).bar, { height }]}>
      {flipped ? (
        <>
          <View style={whiteBlock} />
          <View style={blackBlock} />
        </>
      ) : (
        <>
          <View style={blackBlock} />
          <View style={whiteBlock} />
        </>
      )}
    </View>
  );
}

const barStyles = (c: ThemeColors) => StyleSheet.create({
  bar: {
    width: 12,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
});
