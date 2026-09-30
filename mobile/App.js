import { useEffect, useState } from 'react'
import { BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { DataHealthProvider } from '../src/context/DataHealthContext'
import { UserProvider, useUser } from './src/UserContext'
import { MOBILE_TABS, MORE_NAV_ITEMS, tabColor } from './src/nav'
import { colors, shadow, spacing, type } from './src/theme'
import { Body, Muted, Pill, Spinner } from './src/ui'
import Login from './src/screens/Login'
import Dashboard from './src/screens/Dashboard'
import Transactions from './src/screens/Transactions'

/**
 * Views the web app has but native doesn't yet. An explicit card beats an
 * empty screen: with no explanation, "not ported" is indistinguishable from
 * "crashed" — which is exactly the bug class the web audit harness catches.
 */
function NotYet({ label }) {
  return (
    <View style={styles.todo}>
      <Pill tone="warning">Coming next</Pill>
      <Text style={styles.todoTitle}>{label}</Text>
      <Muted style={{ textAlign: 'center', lineHeight: 20, marginTop: spacing.sm }}>
        This screen is still web-only. It is queued for the next native build — the data layer
        behind it is already shared, so nothing needs migrating.
      </Muted>
    </View>
  )
}

const SCREENS = {
  dashboard: Dashboard,
  transactions: Transactions,
  history: () => <NotYet label="History" />,
  earnings: () => <NotYet label="Pay & income" />,
  budgets: () => <NotYet label="Budgets" />,
  data: () => <NotYet label="Data studio" />,
  settings: () => <NotYet label="Settings" />,
}

const LABELS = Object.fromEntries(
  [...MOBILE_TABS, ...MORE_NAV_ITEMS].map((n) => [n.key, n.label]),
)

/** Bottom bar: four tabs, the raised add button, and the overflow menu. */
function TabBar({ view, onNavigate, onMore }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {MOBILE_TABS.map((tab) => {
        const active = view === tab.key
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => onNavigate(tab.key)}
            style={styles.tab}
            hitSlop={6}
          >
            <Ionicons name={tab.icon} size={21} color={tabColor(active)} />
            <Text style={[styles.tabLabel, { color: tabColor(active) }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}

      <Pressable
        accessibilityLabel="Add transaction"
        accessibilityRole="button"
        onPress={() => onNavigate('transactions', { add: true })}
        style={[styles.fab, shadow.raised]}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>

      <Pressable
        accessibilityLabel="More sections"
        accessibilityRole="button"
        onPress={onMore}
        style={styles.tab}
        hitSlop={6}
      >
        <Ionicons name="ellipsis-horizontal" size={21} color={colors.textFaint} />
        <Text style={[styles.tabLabel, { color: colors.textFaint }]}>More</Text>
      </Pressable>
    </View>
  )
}

/** Overflow menu for the three destinations that don't fit the thumb zone. */
function MoreSheet({ visible, onClose, onPick }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close menu">
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grabber} />
          {MORE_NAV_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => onPick(item.key)}
              style={({ pressed }) => [styles.sheetItem, pressed && { backgroundColor: colors.bg }]}
            >
              <Ionicons name={item.icon} size={19} color={colors.primary} />
              <Body style={{ fontWeight: '600', flex: 1 }}>{item.label}</Body>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  )
}

function Shell() {
  const { user, loading } = useUser()
  const [view, setView] = useState('dashboard')
  const [sheet, setSheet] = useState(false)

  const navigate = (key) => {
    setSheet(false)
    setView(key)
  }

  // Android hardware back: leave the app from the dashboard, otherwise go home.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) {
        setSheet(false)
        return true
      }
      if (view !== 'dashboard') {
        setView('dashboard')
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [view, sheet])

  if (loading) {
    return (
      <View style={styles.splash}>
        <Spinner size="large" />
      </View>
    )
  }

  if (!user) return <Login />

  const Screen = SCREENS[view] || Dashboard

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen key={view} onNavigate={navigate} />
      <TabBar view={view} onNavigate={navigate} onMore={() => setSheet(true)} />
      <MoreSheet visible={sheet} onClose={() => setSheet(false)} onPick={navigate} />
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DataHealthProvider>
        <UserProvider>
          <StatusBar style="dark" />
          <Shell />
        </UserProvider>
      </DataHealthProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  todo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  todoTitle: { ...type.title, color: colors.text, marginTop: spacing.md },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    paddingHorizontal: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 44 },
  tabLabel: { fontSize: 10.5, fontWeight: '700' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    marginHorizontal: spacing.xs,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
  },
})

