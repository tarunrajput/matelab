import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chess, type Square } from 'chess.js';
import { PUZZLES, type Puzzle } from '../puzzles/catalog';
import { Board } from '../components/Board';
import { upsertPuzzleProgress } from '../storage/db';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

function fenToBoard(fen: string) {
  const placement = fen.split(' ')[0].split('/');
  return placement.map(rowStr => {
    const row: (string | null)[] = [];
    for (const ch of rowStr) {
      if (/\d/.test(ch)) { for (let i = 0; i < Number(ch); i++) row.push(null); }
      else row.push(ch);
    }
    return row;
  });
}

export function PuzzleScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const size = Math.min(width - 32, height * 0.45, 380);
  const [index, setIndex] = useState(0);
  const puzzle: Puzzle = PUZZLES[index % PUZZLES.length];
  const [chess, setChess] = useState(() => new Chess(puzzle.fen));
  const [selected, setSelected] = useState<Square | null>(null);
  const [ply, setPly] = useState(0);
  const [status, setStatus] = useState('Find the best move');
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const startRef = useMemo(() => Date.now(), [index]);

  useEffect(() => {
    const c = new Chess(puzzle.fen);
    setChess(c);
    setSelected(null);
    setPly(0);
    setSolved(false);
    setFailed(false);
    setStatus(`${puzzle.theme} · ${puzzle.description}`);
  }, [puzzle]);

  const board = fenToBoard(chess.fen());

  const onSquarePress = (sq: Square) => {
    if (solved) return;
    const game = chess;
    if (selected) {
      if (sq === selected) { setSelected(null); return; }
      const legal = game.moves({ square: selected, verbose: true }).some(m => m.to === sq);
      if (legal) {
        const piece = game.get(selected);
        const promo = piece?.type === 'p' && (sq[1] === '8' || sq[1] === '1');
        // puzzles are simple: promote to queen
        const expectedUci = puzzle.moves[ply];
        const attemptedUci = `${selected}${sq}${promo ? 'q' : ''}`;
        // check if matches expected (allow without promo suffix if not needed)
        const normalizedExpected = expectedUci;
        const match = attemptedUci === normalizedExpected || `${selected}${sq}` === normalizedExpected;
        if (!match) {
          setFailed(true);
          setStatus('Incorrect — try again or skip.');
          setSelected(null);
          return;
        }
        try { game.move({ from: selected, to: sq, promotion: 'q' }); } catch { return; }
        setSelected(null);
        const nextPly = ply + 1;
        setPly(nextPly);
        if (nextPly >= puzzle.moves.length) {
          setSolved(true);
          setStatus('Solved! ★');
          upsertPuzzleProgress(puzzle.id, true, Date.now() - startRef);
        } else {
          // opponent auto-move if puzzle has sequence
          const oppUci = puzzle.moves[nextPly];
          if (oppUci) {
            // small delay for feel
            setTimeout(() => {
              try {
                const from = oppUci.slice(0, 2) as Square;
                const to = oppUci.slice(2, 4) as Square;
                const prom = oppUci.length > 4 ? oppUci[4] as 'q' : undefined;
                game.move({ from, to, promotion: prom ?? 'q' });
                setChess(new Chess(game.fen()));
                setPly(nextPly + 1);
                if (nextPly + 1 >= puzzle.moves.length) {
                  setSolved(true);
                  setStatus('Solved! ★');
                  upsertPuzzleProgress(puzzle.id, true, Date.now() - startRef);
                } else {
                  setStatus('Continue the line');
                }
              } catch {}
            }, 400);
          }
          setChess(new Chess(game.fen()));
          if (nextPly + 1 < puzzle.moves.length) setStatus('Good — continue');
        }
        // force rerender
        setChess(new Chess(game.fen()));
        return;
      }
    }
    const piece = game.get(sq);
    if (piece && piece.color === game.turn()) setSelected(sq);
    else setSelected(null);
  };

  const legalTargets = selected ? chess.moves({ square: selected, verbose: true }).map(m => m.to as Square) : [];

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Puzzles</Text>
        <Text style={styles.meta}>⭐ {puzzle.rating} · {index + 1}/{PUZZLES.length}</Text>
        <Text style={[styles.status, solved && styles.solved, failed && styles.failed]}>{status}</Text>
        <Board board={board} flipped={false} selected={selected} targets={legalTargets} lastMove={null} arrow={null} size={size} onSquarePress={onSquarePress} />
        <View style={styles.row}>
          <Btn label="Prev" onPress={() => setIndex(i => (i - 1 + PUZZLES.length) % PUZZLES.length)} />
          <Btn label={solved ? 'Next ★' : 'Skip'} onPress={() => setIndex(i => (i + 1) % PUZZLES.length)} />
          <Btn label="Retry" onPress={() => {
            const c = new Chess(puzzle.fen);
            setChess(c);
            setPly(0);
            setSolved(false);
            setFailed(false);
            setStatus(`${puzzle.theme} · ${puzzle.description}`);
            setSelected(null);
          }} />
        </View>
        <Text style={styles.hint}>Tap a piece, then tap its destination.</Text>
      </ScrollView>
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <TouchableOpacity onPress={onPress} style={styles.btn} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}><Text style={styles.btnText}>{label}</Text></TouchableOpacity>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  scroll: { flex: 1 },
  content: { alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  title: { color: c.text, fontSize: 18, fontWeight: '700' },
  meta: { color: c.textFaint, fontSize: 11, letterSpacing: 0.5 },
  status: { color: c.textDim, fontSize: 12, textAlign: 'center', minHeight: 18 },
  solved: { color: c.success, fontWeight: '700' },
  failed: { color: c.danger },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { backgroundColor: c.cardAlt, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnText: { color: c.text, fontSize: 12, fontWeight: '600' },
  hint: { color: c.textFaint, fontSize: 10, textAlign: 'center', marginTop: 4 },
});
