import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Chess, type Square } from 'chess.js';
import type { EngineService } from '../engine/EngineService';
import { LEVELS, useChessGame } from '../game/useChessGame';
import { Board } from '../components/Board';
import { EvalBar } from '../components/EvalBar';
import { MoveList } from '../components/MoveList';
import { PromotionDialog } from '../components/PromotionDialog';
import { CoachSheet } from '../components/CoachSheet';
import { GameReview } from '../components/GameReview';
import { ClockView } from '../components/ClockView';
import { TimeControlPicker } from '../components/TimeControlPicker';
import { PgnTools } from '../components/PgnTools';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';
import { useChessClock, type TimeControl } from '../game/clock';
import { saveGame } from '../storage/db';
import { summarizeReview } from '../game/review';
import type { PromotionPiece } from '../game/useChessGame';
type PlayMode = 'vsAI' | 'vsPlayer';
export function PlayScreen({ engine, warmup, pendingPgn }: { engine: EngineService; warmup: boolean; pendingPgn?: string | null }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const boardSize = Math.min(width - 16, 320);
  const [mode, setMode] = useState<PlayMode>('vsAI');
  const [levelIndex, setLevelIndexState] = useState(3);
  const [flipped, setFlipped] = useState(false);
  const [timeControl, setTimeControl] = useState<TimeControl | null>(null);
  const [twoPlayerChess] = useState(() => new Chess());
  const [twoFen, setTwoFen] = useState(twoPlayerChess.fen());
  const [twoSelected, setTwoSelected] = useState<Square | null>(null);
  const [twoLastMove, setTwoLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [twoPending, setTwoPending] = useState<{ from: Square; to: Square } | null>(null);
  const [twoRecords, setTwoRecords] = useState<Array<{ san: string; mover: 'w' | 'b' }>>([]);
  const [gameOverMsg, setGameOverMsg] = useState<string | null>(null);
  const clock = useChessClock(timeControl?.initialMs ?? 300_000, timeControl?.incrementMs ?? 0);
  const aiGame = useChessGame(engine);
  const hasStartedRef = useRef(false);
  useEffect(() => { if (!warmup && !hasStartedRef.current) { hasStartedRef.current = true; aiGame.newGame('w'); } }, [warmup]);
  const changeLevel = (index: number) => { setLevelIndexState(index); aiGame.setLevelIndex(index); };
  const handleTimeChange = (tc: TimeControl | null) => { setTimeControl(tc); if (tc) clock.reconfigure(tc.initialMs, tc.incrementMs); else clock.pause(); };
  const vsAITurn = useMemo(() => { try { const c = new Chess(aiGame.fen); return c.turn() as 'w' | 'b'; } catch { return 'w' as const; } }, [aiGame.fen]);
  const currentTurn = mode === 'vsAI' ? vsAITurn : (twoPlayerChess.turn() as 'w' | 'b');
  useEffect(() => { if (!pendingPgn) return; try { const c = new Chess(); c.loadPgn(pendingPgn); setMode('vsPlayer'); twoPlayerChess.loadPgn(pendingPgn); setTwoFen(twoPlayerChess.fen()); setTwoRecords(c.history().map((san, i) => ({ san, mover: i % 2 === 0 ? 'w' : 'b' }))); setTwoLastMove(null); setGameOverMsg(null); } catch {} }, [pendingPgn, twoPlayerChess]);
  useEffect(() => { if (!timeControl) { clock.pause(); return; } if (mode === 'vsAI') { if (aiGame.records.length === 1 && !clock.running) clock.start(currentTurn); else if (aiGame.records.length > 0 && clock.running !== currentTurn) { if (!clock.flag) clock.resume(currentTurn); } if (aiGame.records.length === 0) clock.reconfigure(timeControl.initialMs, timeControl.incrementMs); } else { if (twoRecords.length === 1 && !clock.running) clock.start(currentTurn); else if (twoRecords.length > 0 && clock.running !== currentTurn) { if (!clock.flag) clock.switchTurn(currentTurn); } if (twoRecords.length === 0) clock.reconfigure(timeControl.initialMs, timeControl.incrementMs); } }, [mode, aiGame.records.length, twoRecords.length, currentTurn, timeControl]);
  useEffect(() => { if (clock.flag) { setGameOverMsg(clock.flag === 'w' ? 'White flagged — Black wins' : 'Black flagged — White wins'); clock.pause(); } }, [clock.flag]);
  const prevOverRef = useRef(false);
  useEffect(() => { const c = new Chess(); try { c.loadPgn(aiGame.pgn()); } catch {} const msg = (() => { if (c.isCheckmate()) return c.turn() === 'w' ? 'Checkmate — Black wins' : 'Checkmate — White wins'; if (c.isStalemate()) return 'Draw — stalemate'; if (c.isDraw()) return 'Draw'; return null; })(); if (msg && !prevOverRef.current && aiGame.records.length >= 2 && mode === 'vsAI') { const review = summarizeReview(aiGame.records); saveGame({ pgn: aiGame.pgn(), fen: aiGame.fen, result: c.isCheckmate() ? (c.turn() === 'w' ? '0-1' : '1-0') : c.isDraw() ? '1/2-1/2' : '*', mode: 'vsAI', playerColor: aiGame.playerColor, timeControl: timeControl?.label ?? null, elo: LEVELS[levelIndex].elo, createdAt: Date.now(), whiteAccuracy: review.accuracyWhite, blackAccuracy: review.accuracyBlack, moveCount: aiGame.records.length, }); setGameOverMsg(msg); } prevOverRef.current = !!msg; }, [aiGame.records, aiGame.fen, aiGame.pgn, mode, timeControl, levelIndex, aiGame.playerColor]);
  const twoLegalTargets = (sq: Square) => twoPlayerChess.moves({ square: sq, verbose: true }).map(m => m.to as Square);
  const onTwoSquarePress = (sq: Square) => { if (twoPlayerChess.isGameOver() || clock.flag) return; if (twoSelected) { if (sq === twoSelected) { setTwoSelected(null); return; } const isLegal = twoPlayerChess.moves({ square: twoSelected, verbose: true }).some(m => m.to === sq); if (isLegal) { const piece = twoPlayerChess.get(twoSelected); const toRank = sq[1]; const isPromo = piece?.type === 'p' && (toRank === '8' || toRank === '1'); if (isPromo) { setTwoPending({ from: twoSelected, to: sq }); return; } const m = twoPlayerChess.move({ from: twoSelected, to: sq, promotion: 'q' }); if (m) { setTwoLastMove({ from: m.from as Square, to: m.to as Square }); setTwoFen(twoPlayerChess.fen()); setTwoRecords(r => [...r, { san: m.san, mover: m.color as 'w'|'b' }]); setTwoSelected(null); if (timeControl) { if (clock.running) clock.switchTurn(twoPlayerChess.turn() as 'w'|'b'); else clock.start(twoPlayerChess.turn() as 'w'|'b'); } const over = twoPlayerChess.isGameOver(); if (over) { const res = twoPlayerChess.isCheckmate() ? (twoPlayerChess.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2'; saveGame({ pgn: twoPlayerChess.pgn(), fen: twoPlayerChess.fen(), result: res, mode: 'vsPlayer', playerColor: null, timeControl: timeControl?.label ?? null, elo: null, createdAt: Date.now(), whiteAccuracy: null, blackAccuracy: null, moveCount: twoRecords.length + 1, }); setGameOverMsg(twoPlayerChess.isCheckmate() ? (twoPlayerChess.turn() === 'w' ? 'Checkmate — Black wins' : 'Checkmate — White wins') : 'Draw'); } } return; } } const piece = twoPlayerChess.get(sq); if (piece && piece.color === twoPlayerChess.turn()) setTwoSelected(sq); else setTwoSelected(null); };
  const applyTwoPromo = (piece: PromotionPiece) => { if (!twoPending) return; const m = twoPlayerChess.move({ from: twoPending.from, to: twoPending.to, promotion: piece }); if (m) { setTwoLastMove({ from: m.from as Square, to: m.to as Square }); setTwoFen(twoPlayerChess.fen()); setTwoRecords(r => [...r, { san: m.san, mover: m.color as 'w'|'b' }]); if (timeControl) clock.switchTurn(twoPlayerChess.turn() as 'w'|'b'); } setTwoPending(null); setTwoSelected(null); };
  const newTwoPlayerGame = () => { twoPlayerChess.reset(); setTwoFen(twoPlayerChess.fen()); setTwoRecords([]); setTwoSelected(null); setTwoLastMove(null); setTwoPending(null); setGameOverMsg(null); if (timeControl) clock.reconfigure(timeControl.initialMs, timeControl.incrementMs); else clock.reset(0, 0); };
  const handleImport = (pgn: string) => { try { const c = new Chess(); c.loadPgn(pgn); setMode('vsPlayer'); twoPlayerChess.loadPgn(pgn); setTwoFen(twoPlayerChess.fen()); setTwoRecords(c.history().map((san, i) => ({ san, mover: i % 2 === 0 ? 'w' : 'b' }))); setTwoLastMove(null); setGameOverMsg(null); } catch {} };
  const evalCp = mode === 'vsAI' ? aiGame.lastEvalCp() : null;
  const barFlipped = mode === 'vsAI' ? (aiGame.playerColor === 'b' ? !flipped : flipped) : flipped;
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleSide} />
          <Text style={styles.title}>MateLab</Text>
          <View style={styles.titleSide}>
            <ThemeToggle />
          </View>
        </View>
        <View style={styles.modeRow}>
          <ModeChip label="vs AI" active={mode === 'vsAI'} onPress={() => { setMode('vsAI'); setGameOverMsg(null); }} />
          <ModeChip label="2-Player" active={mode === 'vsPlayer'} onPress={() => { setMode('vsPlayer'); setGameOverMsg(null); }} />
        </View>
        <View style={styles.statusRow}>
          { (aiGame.thinking && mode === 'vsAI') || warmup ? <ActivityIndicator size="small" color={colors.accent} /> : <View style={styles.dot} />}
          <Text style={styles.statusText}>{warmup ? 'Warming up engine…' : gameOverMsg ?? (mode === 'vsAI' ? aiGame.status : (twoPlayerChess.isGameOver() ? (twoPlayerChess.isCheckmate() ? 'Checkmate' : 'Draw') : `${twoPlayerChess.turn() === 'w' ? 'White' : 'Black'} to move`))}</Text>
        </View>
        {timeControl && <ClockView whiteMs={clock.whiteMs} blackMs={clock.blackMs} turn={currentTurn} running={clock.running} flag={clock.flag} flipped={flipped} />}
      </View>
      <View style={styles.boardRow}>
        <EvalBar cp={evalCp} flipped={barFlipped} height={boardSize} />
        <View style={styles.boardWrap}>
          {mode === 'vsAI' ? (
            <Board board={aiGame.board} flipped={barFlipped} selected={aiGame.selected} targets={aiGame.selected ? aiGame.legalTargets(aiGame.selected as Square) : []} lastMove={aiGame.lastMove} arrow={aiGame.arrow} size={boardSize} onSquarePress={aiGame.onSquarePress} />
          ) : (
            <Board board={fenToBoard(twoFen)} flipped={flipped} selected={twoSelected} targets={twoSelected ? twoLegalTargets(twoSelected) : []} lastMove={twoLastMove} arrow={null} size={boardSize} onSquarePress={onTwoSquarePress} />
          )}
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        {mode === 'vsAI' ? <MoveList records={aiGame.records} onSelect={(r) => aiGame.setCoachMove(r)} /> : (
          <View style={styles.moveBox}>
            <Text style={styles.moveBoxTitle}>Moves</Text>
            <Text style={styles.moveBoxText}>{twoRecords.length ? twoRecords.map((r, i) => `${Math.floor(i/2)+1}${i%2===0?'.':'...'} ${r.san}`).join(' ') : 'No moves yet'}</Text>
          </View>
        )}
        <View style={styles.controls}>
          {mode === 'vsAI' ? (
            <>
              <Ctrl label="New · W" onPress={() => { aiGame.newGame('w'); setGameOverMsg(null); if (timeControl) clock.reconfigure(timeControl.initialMs, timeControl.incrementMs); }} />
              <Ctrl label="New · B" onPress={() => { aiGame.newGame('b'); setGameOverMsg(null); if (timeControl) clock.reconfigure(timeControl.initialMs, timeControl.incrementMs); }} />
              <Ctrl label="Undo" onPress={() => aiGame.takeback()} />
            </>
          ) : (
            <>
              <Ctrl label="New Game" onPress={newTwoPlayerGame} />
              <Ctrl label="Undo" onPress={() => { twoPlayerChess.undo(); setTwoRecords(r => r.slice(0, -1)); setTwoFen(twoPlayerChess.fen()); setTwoLastMove(null); }} />
            </>
          )}
          <Ctrl label="Flip" onPress={() => setFlipped(f => !f)} />
        </View>
        <PgnTools pgn={mode === 'vsAI' ? aiGame.pgn() : twoPlayerChess.pgn()} onImport={handleImport} />
        <TimeControlPicker value={timeControl} onChange={handleTimeChange} />
        {mode === 'vsAI' && <View style={styles.dial}><Text style={styles.dialLabel}>Opponent strength · {LEVELS[levelIndex].elo}</Text><Slider minimumValue={0} maximumValue={LEVELS.length - 1} step={1} value={levelIndex} onValueChange={changeLevel} minimumTrackTintColor={colors.accent} maximumTrackTintColor={colors.track} thumbTintColor={colors.accent} style={styles.slider} /></View>}
        {mode === 'vsAI' && <GameReview records={aiGame.records} />}
      </ScrollView>
      {mode === 'vsAI' && aiGame.pendingPromotion && <PromotionDialog color={aiGame.playerColor} onPick={(p) => aiGame.applyPlayerMove(aiGame.pendingPromotion!.from, aiGame.pendingPromotion!.to, p)} onCancel={aiGame.cancelPromotion} />}
      {mode === 'vsPlayer' && twoPending && <PromotionDialog color={twoPlayerChess.turn() as 'w'|'b'} onPick={applyTwoPromo} onCancel={() => { setTwoPending(null); setTwoSelected(null); }} />}
      {mode === 'vsAI' && <CoachSheet record={aiGame.coachMove} onClose={() => aiGame.setCoachMove(null)} />}
    </View>
  );
}
function ModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { const { colors } = useTheme(); const styles = useMemo(() => makeStyles(colors), [colors]); return <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: active }}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>; }
function Ctrl({ label, onPress }: { label: string; onPress: () => void }) { const { colors } = useTheme(); const styles = useMemo(() => makeStyles(colors), [colors]); return <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>; }
function fenToBoard(fen: string): (string | null)[][] { const placement = fen.split(' ')[0].split('/'); return placement.map(rowStr => { const row: (string | null)[] = []; for (const ch of rowStr) { if (/\d/.test(ch)) { for (let i = 0; i < Number(ch); i++) row.push(null); } else row.push(ch); } return row; }); }
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { alignItems: 'center', gap: 4, paddingHorizontal: 12 },
  titleRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  titleSide: { width: 44, alignItems: 'center' },
  title: { color: c.text, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  modeRow: { flexDirection: 'row', gap: 6 },
  chip: { backgroundColor: c.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  chipText: { color: c.textMuted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: c.onAccent },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 16 },
  dot: { width: 18 },
  statusText: { color: c.textDim, fontSize: 13 },
  boardRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', justifyContent: 'center', paddingVertical: 4 },
  boardWrap: { alignItems: 'center', gap: 2 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, paddingTop: 4, minHeight: '100%' },
  controls: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  button: { backgroundColor: c.cardAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  buttonText: { color: c.text, fontSize: 13, fontWeight: '600' },
  dial: { width: '92%', alignItems: 'stretch' },
  dialLabel: { color: c.textMuted, fontSize: 11, letterSpacing: 1, marginBottom: 1, textAlign: 'center' },
  slider: { width: '100%', height: 24 },
  moveBox: { width: '100%', backgroundColor: c.card, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: c.border },
  moveBoxTitle: { color: c.text, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  moveBoxText: { color: c.textDim, fontSize: 12, lineHeight: 16 },
});
