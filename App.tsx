import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EngineService } from './src/engine/EngineService';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TabBar, type TabId } from './src/components/TabBar';
import { PlayScreen } from './src/screens/PlayScreen';
import { AnalysisScreen } from './src/screens/AnalysisScreen';
import { PuzzleScreen } from './src/screens/PuzzleScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { StatsScreen } from './src/screens/StatsScreen';

const engineHtml = require('./assets/engine/engine.html');

function Root() {
  const [tab, setTab] = useState<TabId>('play');
  const [warmup, setWarmup] = useState(true);
  const engineRef = useRef<EngineService | null>(null);
  if (engineRef.current === null) engineRef.current = new EngineService();
  const engine = engineRef.current;
  const htmlSource = useMemo(() => Image.resolveAssetSource(engineHtml), []);
  const [pendingPgn, setPendingPgn] = useState<string | null>(null);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    engine.waitReady().then(() => setWarmup(false)).catch(() => setWarmup(false));
    return () => engine.detach();
  }, [engine]);

  const handleImportPgn = (pgn: string) => {
    setPendingPgn(pgn);
    setTab('play');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        {tab === 'play' && <PlayScreen engine={engine} warmup={warmup} pendingPgn={pendingPgn} />}
        {tab === 'analysis' && <AnalysisScreen engine={engine} />}
        {tab === 'puzzles' && <PuzzleScreen />}
        {tab === 'history' && <HistoryScreen onImportPgn={handleImportPgn} />}
        {tab === 'stats' && <StatsScreen />}
      </View>
      <TabBar active={tab} onChange={setTab} />
      {/* 1x1 absolute host: the Fabric RNCWebViewWrapper has flex:1 baked in, so an
          unconstrained WebView would stretch and steal half the screen. display:none
          is avoided — the WASM engine must keep running inside it. */}
      <View style={styles.engineHost} pointerEvents="none">
        <WebView
          ref={(w) => { if (w) engine.attach(w); }}
          source={htmlSource}
          style={styles.engine}
          onMessage={engine.handleEvent}
          onError={({ nativeEvent }) => console.warn('engine webview error', nativeEvent.description)}
        />
      </View>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  engineHost: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
  engine: { width: 1, height: 1 },
});
