import { StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const ICONS: Record<ThemeMode, ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  system: 'theme-light-dark',
  light: 'white-balance-sunny',
  dark: 'moon-waning-crescent',
};

/**
 * Cycles appearance system -> light -> dark and persists the pick.
 * Sits at the right edge of the Play header; absolute positioning keeps
 * the "MateLab" title optically centered.
 */
export function ThemeToggle() {
  const { mode, setMode, colors } = useTheme();
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => setMode(next)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`Appearance: ${mode}. Switch to ${next}.`}
    >
      <MaterialCommunityIcons name={ICONS[mode]} size={22} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
