/**
 * Design primitives for the native app — the RN counterparts of the web
 * app's `components/ui/Primitives.jsx`.
 *
 * Kept in one file on purpose: they are small, they always travel together,
 * and a single import keeps screen files short. Colours come from theme.js so
 * the palette has exactly one home.
 */
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, shadow, spacing, type, numerals } from './theme'

/** Full-screen container. `scroll` gives a scrolling body, otherwise plain. */
export function Screen({ children, scroll = true, style, edges = ['top'] }) {
  const body = (
    <View style={[{ paddingHorizontal: spacing.lg, paddingBottom: 120 }, style]}>{children}</View>
  )
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  )
}

export function Card({ children, style, padded = true }) {
  return <View style={[styles.card, padded && { padding: spacing.lg }, style]}>{children}</View>
}

const BTN_BASE = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderRadius: radius.md,
}

const BTN_VARIANTS = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
}

const BTN_SIZES = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 },
  md: { paddingVertical: 12, paddingHorizontal: 18, minHeight: 46 },
  lg: { paddingVertical: 15, paddingHorizontal: 22, minHeight: 54 },
}

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled,
  style,
  ...rest
}) {
  const ghostText = variant === 'ghost'
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        BTN_BASE,
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.btnLabel,
          size === 'sm' && { fontSize: 14 },
          ghostText && { color: colors.primary },
          variant === 'secondary' && { color: colors.text },
          variant === 'danger' && { color: colors.white },
          variant === 'primary' && { color: colors.white },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  )
}

export function Pill({ children, tone = 'neutral', style }) {
  const tones = {
    neutral: { bg: colors.border, fg: colors.textMuted },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    primary: { bg: colors.primarySoft, fg: colors.primary },
  }
  const t = tones[tone] || tones.neutral
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: t.bg },
        style,
      ]}
    >
      <Text style={[styles.pillText, { color: t.fg }]}>{children}</Text>
    </View>
  )
}

export const Title = ({ children, style }) => (
  <Text style={[type.title, { color: colors.text }, style]}>{children}</Text>
)

export const Heading = ({ children, style }) => (
  <Text style={[type.heading, { color: colors.text }, style]}>{children}</Text>
)

export const Body = ({ children, style }) => (
  <Text style={[type.body, { color: colors.text }, style]}>{children}</Text>
)

export const Muted = ({ children, style }) => (
  <Text style={[type.small, { color: colors.textMuted }, style]}>{children}</Text>
)

/**
 * A money figure. Always tabular so columns line up, and green/red by sign —
 * the same rule the web app applies to income and expenses.
 */
export function Money({ value, style, tone = 'auto' }) {
  const color =
    tone === 'income'
      ? colors.income
      : tone === 'expense'
        ? colors.expense
        : value > 0
          ? colors.income
          : value < 0
            ? colors.expense
            : colors.text
  return <Text style={[type.title, numerals, { color }, style]}>{value}</Text>
}

export function Spinner({ size = 'small', color = colors.primary }) {
  return <ActivityIndicator size={size} color={color} />
}

export function EmptyState({ title, description, action }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
      <Heading>{title}</Heading>
      {description ? (
        <Muted style={{ textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 }}>
          {description}
        </Muted>
      ) : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </Card>
  )
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  btnLabel: { ...type.body, fontWeight: '700', color: colors.white },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: { ...type.tiny, textTransform: 'uppercase', letterSpacing: 0.4 },
})
