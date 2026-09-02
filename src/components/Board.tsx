import { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type TextStyle } from 'react-native';
import type { Square } from 'chess.js';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

const GLYPHS: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const PIECE_NAMES: Record<string, string> = {
  k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn',
};

// Board squares, pieces, and move overlays are the game surface — they keep
// the same colors in both themes (lichess/chess.com behavior). Only the frame
// follows the theme via borderStrong.
const LIGHT = '#f0d9b5';
const DARK = '#b58863';
const SELECTED = 'rgba(130, 202, 249, 0.8)';
const LAST_MOVE = 'rgba(130, 202, 249, 0.35)';
const TARGET = 'rgba(20, 20, 20, 0.28)';
const RING = 'rgba(20, 20, 20, 0.45)';
const ARROW_COLOR = 'rgba(74, 222, 128, 0.6)';

interface BoardProps {
  board: (string | null)[][];
  flipped: boolean;
  selected: Square | null;
  targets: Square[];
  lastMove: { from: Square; to: Square } | null;
  /** Coach suggestion drawn as an arrow (squares like 'e2' -> 'e4') */
  arrow: { from: string; to: string } | null;
  size: number;
  onSquarePress: (square: Square) => void;
}

/**
 * Stateless 8x8 board. Rows arrive from the FEN (rank 8 first); `flipped`
 * reverses rendering for the black player. Pieces use filled Unicode glyphs
 * for both colors — color + text shadow distinguish sides without font risk.
 * Rows and cells get explicit dimensions: empty ranks must keep their height.
 * Each square renders coordinate labels (rank top-left, file bottom-right),
 * move hints (dot on empty squares, ring on captures) and an accessibility
 * label. The coach arrow is a shaft + border-triangle head that stops short
 * of the target square's center.
 */
export const Board = memo(function Board({ board, flipped, selected, targets, lastMove, arrow, size, onSquarePress }: BoardProps) {
  const { colors } = useTheme();
  const gridStyles = useMemo(() => makeStyles(colors), [colors]);
  const cell = size / 8;
  const glyphStyle: StyleProp<TextStyle> = { fontSize: cell * 0.72 };
  const coordFontSize = Math.max(7, Math.round(cell * 0.2));
  const rows = flipped ? [...board].reverse().map((r) => [...r].reverse()) : board;

  const center = (sq: string): { x: number; y: number } => {
    const file = flipped ? 7 - (sq.charCodeAt(0) - 97) : sq.charCodeAt(0) - 97;
    const rank = flipped ? Number(sq[1]) - 1 : 8 - Number(sq[1]);
    return { x: file * cell + cell / 2, y: rank * cell + cell / 2 };
  };

  const arrowParts = (() => {
    if (!arrow) return null;
    const a = center(arrow.from);
    const b = center(arrow.to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;
    const angle = Math.atan2(dy, dx);
    const ux = dx / len;
    const uy = dy / len;
    const headLen = Math.max(10, cell * 0.4);
    const headHalf = headLen * 0.32;
    const tipX = b.x - ux * cell * 0.18;
    const tipY = b.y - uy * cell * 0.18;
    // End the shaft at the head's base: with a translucent arrow any
    // shaft-under-head overlap would double up and show as a darker band.
    const shaftLen = Math.max(0, Math.hypot(tipX - a.x, tipY - a.y) - headLen);
    const headCx = (tipX - ux * headLen / 2);
    const headCy = (tipY - uy * headLen / 2);
    return {
      shaft: {
        position: 'absolute' as const,
        left: a.x,
        top: a.y - 3,
        width: shaftLen,
        height: 6,
        borderRadius: 3,
        backgroundColor: ARROW_COLOR,
        transform: [{ rotate: `${angle}rad` }],
        transformOrigin: 'left center',
      },
      head: {
        position: 'absolute' as const,
        left: headCx - headHalf,
        top: headCy - headLen / 2,
        width: 0,
        height: 0,
        borderLeftWidth: headHalf,
        borderRightWidth: headHalf,
        borderBottomWidth: headLen,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: ARROW_COLOR,
        transform: [{ rotate: `${angle + Math.PI / 2}rad` }],
      },
    };
  })();

  return (
    <View style={[gridStyles.grid, { width: size, height: size }]}>
      {rows.map((row, rIdx) => (
        <View key={`r${rIdx}`} style={[styles.row, { height: cell }]}>
          {row.map((piece, cIdx) => {
            const fileChar = String.fromCharCode(97 + (flipped ? 7 - cIdx : cIdx));
            const rankNum = flipped ? rIdx + 1 : 8 - rIdx;
            const square = `${fileChar}${rankNum}` as Square;
            const isDark = (rIdx + cIdx) % 2 === 1;
            const isSelected = square === selected;
            const isTarget = targets.includes(square);
            const isLast = !!lastMove && (lastMove.from === square || lastMove.to === square);
            const white = piece !== null && piece === piece.toUpperCase();
            const coordColor = isDark ? styles.coordOnDark : styles.coordOnLight;

            return (
              <TouchableOpacity
                key={square}
                style={[styles.cell, { width: cell, height: cell, backgroundColor: isSelected ? SELECTED : isLast ? LAST_MOVE : isDark ? DARK : LIGHT }]}
                onPress={() => onSquarePress(square)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${square}, ${piece ? `${white ? 'white' : 'black'} ${PIECE_NAMES[piece.toLowerCase()]}` : 'empty'}${isTarget ? ', move here' : ''}`}
              >
                {piece !== null && (
                  <Text style={[glyphStyle, styles.piece, white ? styles.whitePiece : styles.blackPiece]}>{GLYPHS[piece.toLowerCase()]}</Text>
                )}
                {isTarget && piece === null && <View style={[styles.targetDot, { backgroundColor: TARGET }]} />}
                {isTarget && piece !== null && <View style={styles.targetRing} />}
                {cIdx === 0 && <Text style={[styles.coord, coordColor, { top: 1, left: 2, fontSize: coordFontSize }]}>{rankNum}</Text>}
                {rIdx === 7 && <Text style={[styles.coord, coordColor, { bottom: 1, right: 2, fontSize: coordFontSize }]}>{fileChar}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {arrowParts && <View style={arrowParts.shaft} pointerEvents="none" />}
      {arrowParts && <View style={arrowParts.head} pointerEvents="none" />}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: {
    fontWeight: '600',
  },
  whitePiece: {
    color: '#fafafa',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: '#1c1c1e',
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  targetDot: {
    position: 'absolute',
    width: '30%',
    height: '30%',
    borderRadius: 999,
  },
  targetRing: {
    position: 'absolute',
    width: '82%',
    height: '82%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: RING,
  },
  coord: {
    position: 'absolute',
    fontWeight: '700',
  },
  // Coordinate labels sit on the fixed board surface, so they derive from the
  // square colors rather than theme text tokens.
  coordOnLight: {
    color: DARK,
  },
  coordOnDark: {
    color: LIGHT,
  },
});

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  grid: {
    flexDirection: 'column',
    borderWidth: 2,
    borderColor: c.borderStrong,
  },
});
