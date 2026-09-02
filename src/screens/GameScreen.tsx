import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import * as Clipboard from 'expo-clipboard';
import { WebView } from 'react-native-webview';
import type { Square } from 'chess.js';
import { EngineService } from '../engine/EngineService';
import { LEVELS, useChessGame, type PromotionPiece } from '../game/useChessGame';
import { Board } from '../components/Board';
import { EvalBar } from '../components/EvalBar';
import { MoveList } from '../components/MoveList';
import { PromotionDialog } from '../components/PromotionDialog';
import { CoachSheet } from '../components/CoachSheet';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

const engineHtml = require('../../assets/engine/engine.html');

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function GameScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 60, 360);
  const engineRef = useRef<EngineService | null>(null);
  if (engineRef.current === null) engineRef.current = new EngineService();
  const engine = engineRef.current;

  const game = useChessGame(engine);
  const [warmup, setWarmup] = useState(true);
  const [levelIndex, setLevelIndexState] = useState(3);
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const htmlSource = useMemo(() => Image.resolveAssetSource(engineHtml), []);

  useEffect(() => {
    engine.waitReady().then(() => {
      setWarmup(false);
      game.newGame('w');
    }).catch((err: unknown) => {
      console.log('ENGINE_WARMUP_FAIL', String(err));
      setWarmup(false);
    });
    return () => engine.detach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeLevel = (index: number) => {
    setLevelIndexState(index);
    game.setLevelIndex(index);
  };

  const copyPgn = async () => {
    await Clipboard.setStringAsync(game.pgn());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const evalCp = game.lastEvalCp();
  // Eval bar follows the board view orientation.
  const barFlipped = game.playerColor === 'b' ? !flipped : flipped;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>MateLab</Text>

      <View style={styles.statusRow}>
        {game.thinking || warmup ? <ActivityIndicator size="small" color={colors.accent} /> : <View style={styles.statusDot} />}
        <Text style={styles.statusText}>{warmup ? 'Warming up engine…' : game.status}</Text>
      </View>

      <View style={styles.boardRow}>
        <EvalBar cp={evalCp} flipped={barFlipped} height={boardSize} />
        <View style={styles.boardWrap}>
          <Board
            board={game.board}
            flipped={barFlipped}
            selected={game.selected}
            targets={game.selected ? game.legalTargets(game.selected as Square) : []}
            lastMove={game.lastMove}
            arrow={game.arrow}
            size={boardSize}
            onSquarePress={game.onSquarePress}
          />
          <Text style={styles.files}>{FILES.join('   ')}</Text>
        </View>
      </View>

      <MoveList
        records={game.records}
        onSelect={(record) => game.setCoachMove(record)}
      />

      <View style={styles.controls}>
        <ControlButton label="New · W" onPress={() => game.newGame('w')} />
        <ControlButton label="New · B" onPress={() => game.newGame('b')} />
        <ControlButton label="Undo" onPress={game.takeback} />
        <ControlButton label="Flip" onPress={() => setFlipped((f) => !f)} />
        <ControlButton label={copied ? 'Copied!' : 'PGN'} onPress={copyPgn} />
      </View>

      <View style={styles.dial}>
        <Text style={styles.dialLabel}>Opponent strength · {LEVELS[levelIndex].elo}</Text>
        <Slider
          minimumValue={0}
          maximumValue={LEVELS.length - 1}
          step={1}
          value={levelIndex}
          onValueChange={changeLevel}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.track}
          thumbTintColor={colors.accent}
          style={styles.slider}
        />
      </View>

      {game.pendingPromotion && (
        <PromotionDialog
          color={game.playerColor}
          onPick={(piece: PromotionPiece) => game.applyPlayerMove(game.pendingPromotion!.from, game.pendingPromotion!.to, piece)}
          onCancel={game.cancelPromotion}
        />
      )}

      <CoachSheet record={game.coachMove} onClose={() => game.setCoachMove(null)} />

      <WebView
        ref={(w) => {
          if (w) engine.attach(w);
        }}
        source={htmlSource}
        style={styles.hidden}
        onMessage={engine.handleEvent}
        onError={({ nativeEvent }) => console.warn('engine webview error:', nativeEvent.description)}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}

function ControlButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.bg,
    alignItems: 'center',
    paddingTop: 44,
    gap: 10,
  },
  title: {
    color: c.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 22,
  },
  statusDot: {
    width: 18,
  },
  statusText: {
    color: c.textDim,
    fontSize: 14,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  boardWrap: {
    alignItems: 'center',
    gap: 2,
  },
  files: {
    color: c.textFaint,
    fontSize: 10,
    width: '100%',
    textAlign: 'center',
    letterSpacing: 8,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: c.cardAlt,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: c.text,
    fontSize: 12,
    fontWeight: '600',
  },
  dial: {
    width: '88%',
    alignItems: 'stretch',
  },
  dialLabel: {
    color: c.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 2,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 30,
  },
  hidden: {
    display: 'none',
  },
});
