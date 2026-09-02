import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Chess, type Square } from 'chess.js';
import type { EngineService } from '../engine/EngineService';
import type { EngineHistory } from '../engine/protocol';
import { Board } from '../components/Board';
import { EvalBar } from '../components/EvalBar';
import { PromotionDialog } from '../components/PromotionDialog';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';
import type { PromotionPiece } from '../game/useChessGame';

function fenToBoard(fen: string): (string | null)[][] {
  const placement = fen.split(' ')[0];
  const rows = placement.split('/');
  return rows.map((rowStr) => {
    const row: (string | null)[] = [];
    for (const ch of rowStr) {
      if (/\d/.test(ch)) { for (let i = 0; i < Number(ch); i++) row.push(null); }
      else row.push(ch);
    }
    return row;
  });
}

export function AnalysisScreen({ engine }: { engine: EngineService }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const boardSize = Math.min(width - 32, height * 0.45, 380);
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [evalCp, setEvalCp] = useState<number | null>(null);
  const [bestLine, setBestLine] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [arrow, setArrow] = useState<{ from: string; to: string } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const turn = chessRef.current.turn();

  /** Root FEN + leading moves so the engine can score repetitions. */
  const engineHistory = useCallback((): EngineHistory => {
    const game = chessRef.current;
    const hist = game.history({ verbose: true });
    const rootFen = hist.length > 0 ? hist[0].before : game.fen();
    return { rootFen, moves: hist.map((m) => m.lan) };
  }, []);

  const analyze = useCallback(async (fenNow: string) => {
    try {
      await engine.waitReady();
    } catch {
      return; // engine never came up; nothing to analyze with
    }
    setThinking(true);
    try {
      engine.setSkill(20);
      const r = await engine.search(fenNow, 800, engineHistory());
      // The score arrives from the side to move in fenNow; convert to white POV.
      const whiteToMove = fenNow.split(' ')[1] === 'w';
      const cp = r.mate != null ? (r.mate > 0 ? 10000 : -10000) : r.scoreCp;
      const whiteCp = r.mate != null
        ? (r.mate > 0 ? (whiteToMove ? 10000 : -10000) : (whiteToMove ? -10000 : 10000))
        : (cp != null ? (whiteToMove ? cp : -cp) : null);
      setEvalCp(whiteCp);
      // Resolve the engine's choice to SAN against the position that was analyzed.
      let san: string | null = null;
      try {
        const pos = new Chess(fenNow);
        const found = pos.moves({ verbose: true }).find(
          (v) => v.from === r.move.from && v.to === r.move.to && (!r.move.promotion || v.promotion === r.move.promotion),
        );
        san = found?.san ?? null;
      } catch {}
      setBestLine(san ?? `${r.move.from}${r.move.to}${r.move.promotion ?? ''}`);
      setArrow({ from: r.move.from, to: r.move.to });
    } catch {
      // ignore
    } finally {
      setThinking(false);
    }
  }, [engine, engineHistory]);

  useEffect(() => {
    analyze(fen);
  }, [fen, analyze]);

  const onSquarePress = useCallback((sq: Square) => {
    const game = chessRef.current;
    if (selected) {
      if (sq === selected) { setSelected(null); return; }
      const isLegal = game.moves({ square: selected, verbose: true }).some(m => m.to === sq);
      if (isLegal) {
        const piece = game.get(selected);
        const isPromo = piece?.type === 'p' && (sq[1] === '8' || sq[1] === '1');
        if (isPromo) { setPromotion({ from: selected, to: sq }); return; }
        const m = game.move({ from: selected, to: sq, promotion: 'q' });
        if (m) {
          setLastMove({ from: m.from as Square, to: m.to as Square });
          setFen(game.fen());
          setHistory(h => [...h, m.san]);
          setSelected(null);
          setArrow(null);
        }
        return;
      }
    }
    const piece = game.get(sq);
    if (piece && piece.color === game.turn()) setSelected(sq);
    else setSelected(null);
  }, [selected]);

  const applyPromo = (piece: PromotionPiece) => {
    if (!promotion) return;
    const m = chessRef.current.move({ from: promotion.from, to: promotion.to, promotion: piece });
    if (m) {
      setLastMove({ from: m.from as Square, to: m.to as Square });
      setFen(chessRef.current.fen());
      setHistory(h => [...h, m.san]);
    }
    setPromotion(null);
    setSelected(null);
    setArrow(null);
  };

  const undo = () => {
    chessRef.current.undo();
    setHistory(h => h.slice(0, -1));
    setFen(chessRef.current.fen());
    setLastMove(null);
    setArrow(null);
    setSelected(null);
  };

  const resetBoard = () => {
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    setHistory([]);
    setLastMove(null);
    setArrow(null);
    setSelected(null);
    setEvalCp(null);
    setBestLine(null);
  };

  const copyFen = async () => {
    try {
      await Clipboard.setStringAsync(fen);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const loadFen = (newFen: string) => {
    try {
      chessRef.current.load(newFen);
      setFen(chessRef.current.fen());
      setHistory([]);
      setLastMove(null);
      setArrow(null);
    } catch {}
  };

  const legalTargets = selected ? chessRef.current.moves({ square: selected, verbose: true }).map(m => m.to as Square) : [];

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Analysis Board</Text>
        <Text style={styles.subtitle}>{thinking ? 'Engine thinking…' : bestLine ? `Best: ${bestLine}  ${evalCp != null ? (Math.abs(evalCp) >= 10000 ? (evalCp > 0 ? '+M' : '-M') : `${evalCp > 0 ? '+' : ''}${(evalCp/100).toFixed(1)}`) : ''}` : 'Play a move'}</Text>
        <View style={styles.row}>
          <EvalBar cp={evalCp} flipped={flipped} height={boardSize} />
          <View>
            <Board board={fenToBoard(fen)} flipped={flipped} selected={selected} targets={legalTargets} lastMove={lastMove} arrow={arrow} size={boardSize} onSquarePress={onSquarePress} />
            <Text style={styles.turn}>{turn === 'w' ? 'White to move' : 'Black to move'}{thinking ? ' — analyzing' : ''}</Text>
          </View>
        </View>
        <View style={styles.controls}>
          <Btn label="Undo" onPress={undo} />
          <Btn label="Reset" onPress={resetBoard} />
          <Btn label="Flip" onPress={() => setFlipped(f => !f)} />
          <Btn label={copied ? 'Copied ✓' : 'Copy FEN'} onPress={copyFen} />
          <Btn label="Start pos" onPress={() => loadFen(new Chess().fen())} />
        </View>
        {thinking && <ActivityIndicator color={colors.accent} />}
        {!!history.length && (
          <ScrollView horizontal style={styles.hist} contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }}>
            {history.map((san, i) => <Text key={i} style={styles.san}>{`${Math.floor(i/2)+1}${i%2===0 ? '.' : '...'} ${san}`}</Text>)}
          </ScrollView>
        )}
      </ScrollView>
      {promotion && <PromotionDialog color={chessRef.current.turn() === 'w' ? 'w' : 'b'} onPick={applyPromo} onCancel={() => { setPromotion(null); setSelected(null); }} />}
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}><Text style={styles.btnText}>{label}</Text></TouchableOpacity>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  scroll: { flex: 1 },
  content: { alignItems: 'center', gap: 8, paddingHorizontal: 10 },
  title: { color: c.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: c.textDim, fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  turn: { color: c.textFaint, fontSize: 10, textAlign: 'center', marginTop: 4 },
  controls: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  btn: { backgroundColor: c.cardAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  btnText: { color: c.text, fontSize: 11, fontWeight: '600' },
  hist: { maxHeight: 30, width: '100%' },
  san: { color: c.textDim, fontSize: 12, backgroundColor: c.card, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
});
