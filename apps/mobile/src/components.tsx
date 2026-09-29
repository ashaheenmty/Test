import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { minTapTarget, radius, spacing, typography } from '@tb/ui';
import { useApp } from './app-context';

/** All components use start/end (not left/right) so they mirror in Arabic. */

export function Heading({ children, level = 1 }: { children: ReactNode; level?: 1 | 2 }) {
  const { c } = useApp();
  return (
    <Text accessibilityRole="header" style={[level === 1 ? s.h1 : s.h2, { color: c.text }]}>
      {children}
    </Text>
  );
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const { c } = useApp();
  return <Text style={[s.body, { color: muted ? c.textMuted : c.text }, style]}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  const { c } = useApp();
  return <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const { c } = useApp();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: primary ? (pressed ? c.primaryHover : c.primary) : variant === 'quiet' ? 'transparent' : c.surface,
          borderColor: primary ? c.primary : variant === 'quiet' ? 'transparent' : c.borderStrong,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Text style={[s.buttonText, { color: primary ? c.onPrimary : c.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { c } = useApp();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, { borderColor: selected ? c.primary : c.borderStrong, backgroundColor: selected ? c.primarySoft : c.surface }]}
    >
      <Text style={{ color: selected ? c.onPrimarySoft : c.text, fontWeight: selected ? '600' : '400', fontSize: typography.size.sm }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { c } = useApp();
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: c.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        style={[s.input, { color: c.text, borderColor: c.borderStrong, backgroundColor: c.surface }]}
        {...props}
      />
    </View>
  );
}

export function Alert({ text, kind }: { text: string | null; kind: 'error' | 'success' }) {
  const { c } = useApp();
  if (!text) return null;
  const color = kind === 'error' ? c.danger : c.success;
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[s.alert, { borderColor: color }]}>
      <Text style={{ color, fontSize: typography.size.sm }}>{text}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  h1: { fontSize: typography.size.xxl, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'auto' },
  h2: { fontSize: typography.size.lg, fontWeight: '600', marginBottom: spacing.sm },
  body: { fontSize: typography.size.md, lineHeight: typography.size.md * 1.5 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  button: {
    minHeight: minTapTarget,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: typography.size.md, fontWeight: '600' },
  chip: {
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  field: { gap: spacing.xs },
  label: { fontSize: typography.size.sm, fontWeight: '600' },
  input: {
    minHeight: minTapTarget,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.size.md,
    textAlign: 'auto',
  },
  alert: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
