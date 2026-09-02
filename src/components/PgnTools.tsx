import { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Chess } from 'chess.js';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

interface Props {
  pgn: string;
  onImport: (pgn: string) => void;
}

export function PgnTools({ pgn, onImport }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState('');

  const copy = async () => {
    await Clipboard.setStringAsync(pgn || '*');
    setMsg('Copied PGN');
    setTimeout(() => setMsg(''), 1500);
  };

  const paste = async () => {
    const t = await Clipboard.getStringAsync();
    setDraft(t);
  };

  const doImport = () => {
    if (!draft.trim()) { setMsg('Paste a PGN first'); return; }
    try {
      const c = new Chess();
      c.loadPgn(draft);
      onImport(c.pgn());
      setMsg('Imported');
      setTimeout(() => { setOpen(false); setMsg(''); }, 600);
    } catch (e) {
      setMsg('Invalid PGN');
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={copy} style={styles.btn} activeOpacity={0.8}><Text style={styles.btnText}>{msg ? msg : 'Copy PGN'}</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.btn} activeOpacity={0.8}><Text style={styles.btnText}>Import PGN</Text></TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.title}>Import PGN</Text>
            <Text style={styles.hint}>Paste PGN text or FEN + moves. The board will load the game.</Text>
            <TextInput value={draft} onChangeText={setDraft} multiline placeholder="Paste PGN here…" placeholderTextColor={colors.textFaint} style={styles.input} />
            <View style={styles.actions}>
              <TouchableOpacity onPress={paste} style={styles.smallBtn}><Text style={styles.smallText}>Paste</Text></TouchableOpacity>
              <TouchableOpacity onPress={doImport} style={[styles.smallBtn, styles.primary]}><Text style={[styles.smallText, styles.primaryText]}>Load</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.smallBtn}><Text style={styles.smallText}>Close</Text></TouchableOpacity>
            </View>
            {!!msg && <Text style={styles.msg}>{msg}</Text>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: c.cardAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  btnText: { color: c.text, fontSize: 11, fontWeight: '600' },
  scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: c.borderStrong },
  title: { color: c.text, fontSize: 14, fontWeight: '700' },
  hint: { color: c.textMuted, fontSize: 11 },
  input: { minHeight: 120, maxHeight: 200, backgroundColor: c.sunken, borderRadius: 8, padding: 10, color: c.text, fontSize: 12, textAlignVertical: 'top', borderWidth: 1, borderColor: c.border },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  smallBtn: { backgroundColor: c.cardAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallText: { color: c.text, fontSize: 12, fontWeight: '600' },
  primary: { backgroundColor: c.accent },
  primaryText: { color: c.onAccent },
  msg: { color: c.accentText, fontSize: 11, textAlign: 'center' },
});
