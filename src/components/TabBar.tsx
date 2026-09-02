import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/palette';

export type TabId = 'play' | 'analysis' | 'puzzles' | 'history' | 'stats';

const TABS: Array<{ id: TabId; label: string; icon: ComponentProps<typeof MaterialCommunityIcons>['name'] }> = [
  { id: 'play', label: 'Play', icon: 'chess-knight' },
  { id: 'analysis', label: 'Analyze', icon: 'magnify' },
  { id: 'puzzles', label: 'Puzzles', icon: 'puzzle' },
  { id: 'history', label: 'History', icon: 'book-open-variant' },
  { id: 'stats', label: 'Stats', icon: 'chart-line' },
];

export function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.bar, { paddingBottom: 6 + insets.bottom }]}>
      {TABS.map((t) => (
        <TouchableOpacity
          key={t.id}
          onPress={() => onChange(t.id)}
          style={[styles.item, active === t.id && styles.active]}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === t.id }}
          accessibilityLabel={t.label}
        >
          <MaterialCommunityIcons
            name={t.icon}
            size={20}
            color={active === t.id ? colors.accentText : colors.textMuted}
          />
          <Text style={[styles.label, active === t.id && styles.labelActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 1, borderColor: c.border, paddingVertical: 6, paddingHorizontal: 4 },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6, borderRadius: 10 },
  active: { backgroundColor: c.cardAlt },
  label: { fontSize: 11, color: c.textMuted, fontWeight: '600', letterSpacing: 0.4 },
  labelActive: { color: c.text },
});
