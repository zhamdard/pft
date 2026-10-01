import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { thisMonthKey, formatMonthKey, formatShortDate } from '../../../src/utils/date'
import { formatMoney } from '../../../src/utils/money'
import { monthTotals } from '../../../src/utils/stats'
import { useTransactions } from '../hooks'
import { colors, numerals, spacing, type } from '../theme'
import { Body, Card, EmptyState, Heading, Muted, Pill, Screen, Spinner } from '../ui'
import { useUser } from '../UserContext'

/**
 * Dashboard — the banking-style summary the web app opens on.
 *
 * Every number here comes from the shared `utils/stats` module, so a figure
 * computed on the phone is identical to the same figure on the web. That is
 * the whole point of keeping the logic layer outside the UI.
 */
export default function Dashboard({ onNavigate }) {
  const { currency, user, hiddenAmounts } = useUser()
  const { loading, transactions, error } = useTransactions(user?.uid)
  const monthKey = thisMonthKey()
  const totals = monthTotals(transactions, monthKey)
  const recent = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)

  const money = (v) => (hiddenAmounts ? '••••••' : formatMoney(v, currency))

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Muted>{formatMonthKey(monthKey)}</Muted>
          <Text style={styles.hello}>
            {user?.displayName ? `Hi, ${user.displayName.split(' ')[0]}` : 'Overview'}
          </Text>
        </View>
        <Pill tone="primary">This month</Pill>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Muted style={styles.heroLabel}>Net this month</Muted>
        <Text style={[styles.heroValue, numerals]}>{money(totals.net)}</Text>

        <View style={styles.heroRow}>
          <View style={styles.heroCol}>
            <Muted style={styles.heroSubLabel}>In</Muted>
            <Text style={[styles.heroSub, numerals]}>{money(totals.income)}</Text>
          </View>
          <View style={styles.heroCol}>
            <Muted style={styles.heroSubLabel}>Out</Muted>
            <Text style={[styles.heroSub, numerals]}>{money(totals.expense)}</Text>
          </View>
          <View style={styles.heroCol}>
            <Muted style={styles.heroSubLabel}>Entries</Muted>
            <Text style={[styles.heroSub, numerals]}>{transactions.length}</Text>
          </View>
        </View>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.sectionHead}>
          <Heading>Recent activity</Heading>
          {transactions.length > 6 ? (
            <Pill tone="neutral">{transactions.length}</Pill>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.center}>
            <Spinner />
          </View>
        ) : error ? (
          <EmptyState
            title="Couldn't reach your data"
            description={
              error.message ||
              'Firestore rejected the read. Check your connection and security rules.'
            }
          />
        ) : recent.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="Add your first income or expense and this dashboard fills in."
            action={
              <Body style={{ color: colors.primary }} onPress={() => onNavigate?.('transactions')}>
                Go to Transactions →
              </Body>
            }
          />
        ) : (
          recent.map((t) => (
            <View key={t.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Body numberOfLines={1} style={styles.rowTitle}>
                  {t.description || t.category}
                </Body>
                <Muted>{formatShortDate(t.date)}</Muted>
              </View>
              <Text
                style={[
                  styles.amount,
                  numerals,
                  { color: t.type === 'income' ? colors.income : colors.expense },
                ]}
              >
                {t.type === 'income' ? '+' : '−'}
                {money(Math.abs(Number(t.amount) || 0))}
              </Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  hello: { ...type.title, color: colors.text, marginTop: 2 },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: spacing.xl,
  },
  heroLabel: { color: '#c7d2fe' },
  heroValue: { fontSize: 38, fontWeight: '800', color: colors.white, marginTop: 4 },
  heroRow: { flexDirection: 'row', marginTop: spacing.xl, gap: spacing.md },
  heroCol: { flex: 1 },
  heroSubLabel: { color: '#c7d2fe' },
  heroSub: { fontSize: 16, fontWeight: '700', color: colors.white, marginTop: 2 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  rowMain: { flex: 1 },
  rowTitle: { fontWeight: '600' },
  amount: { ...type.body, fontWeight: '700' },
})
