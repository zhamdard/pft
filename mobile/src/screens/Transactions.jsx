import { useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { thisMonthKey, shiftMonth, formatMonthKey, formatShortDate } from '../../../src/utils/date'
import { formatMoney } from '../../../src/utils/money'
import { monthTotals } from '../../../src/utils/stats'
import { useTransactions } from '../../../src/hooks/useTransactions'
import { colors, numerals, spacing, type } from '../theme'
import { Body, Card, EmptyState, Heading, Muted, Pill, Screen, Spinner } from '../ui'
import { useUser } from '../UserContext'

/**
 * Transactions — every entry in the selected month, newest first.
 *
 * The month filter runs on the shared `utils/date` helpers, so stepping back
 * a month here lands on exactly the range the web app and the exports use.
 * Reads still come from the full listener rather than a query filter: the
 * Firestore rules allow one `orderBy`, and a second clause would need a
 * composite index that shows up to users as "my data vanished".
 */
export default function Transactions() {
  const { currency, user, hiddenAmounts } = useUser()
  const { loading, transactions, error } = useTransactions(user?.uid)
  const [monthKey, setMonthKey] = useState(thisMonthKey())

  const inMonth = useMemo(
    () => transactions.filter((t) => (t.date || '').slice(0, 7) === monthKey),
    [transactions, monthKey],
  )
  const totals = monthTotals(transactions, monthKey)
  const money = (v) => (hiddenAmounts ? '••••••' : formatMoney(v, currency))

  // Group rows under a date heading without pulling in another dependency.
  const groups = useMemo(() => {
    const byDate = {}
    for (const t of inMonth) {
      const key = t.date || 'undated'
      ;(byDate[key] ||= []).push(t)
    }
    return Object.entries(byDate).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [inMonth])

  return (
    <Screen>
      <View style={styles.head}>
        <View>
          <Muted>Transactions</Muted>
          <Text style={styles.title}>{formatMonthKey(monthKey)}</Text>
        </View>
        <View style={styles.switcher}>
          <Pressable
            accessibilityLabel="Previous month"
            hitSlop={8}
            onPress={() => setMonthKey((k) => shiftMonth(k, -1))}
            style={styles.arrow}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityLabel="Next month"
            hitSlop={8}
            onPress={() => setMonthKey((k) => shiftMonth(k, 1))}
            style={styles.arrow}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <Card style={styles.totals}>
        <View style={styles.totalCol}>
          <Muted>In</Muted>
          <Text style={[styles.totalValue, numerals, { color: colors.income }]}>
            {money(totals.income)}
          </Text>
        </View>
        <View style={styles.totalCol}>
          <Muted>Out</Muted>
          <Text style={[styles.totalValue, numerals, { color: colors.expense }]}>
            {money(totals.expense)}
          </Text>
        </View>
        <View style={styles.totalCol}>
          <Muted>Net</Muted>
          <Text style={[styles.totalValue, numerals]}>{money(totals.net)}</Text>
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.sectionHead}>
          <Heading>{inMonth.length} entries</Heading>
          {inMonth.length > 0 ? <Pill tone="neutral">{formatMonthKey(monthKey)}</Pill> : null}
        </View>

        {loading ? (
          <View style={styles.center}>
            <Spinner />
          </View>
        ) : error ? (
          <EmptyState
            title="Couldn't load your entries"
            description={error.message || 'Firestore rejected the read.'}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title="No entries this month"
            description="Tap the + button below to record income or an expense."
          />
        ) : (
          groups.map(([date, items]) => (
            <View key={date}>
              <Muted style={styles.dateHead}>{formatShortDate(date)}</Muted>
              {items.map((t) => (
                <View key={t.id} style={styles.row}>
                  <View style={styles.dotWrap}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            t.type === 'income' ? colors.successSoft : colors.dangerSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name={t.type === 'income' ? 'arrow-down' : 'arrow-up'}
                        size={13}
                        color={t.type === 'income' ? colors.income : colors.expense}
                      />
                    </View>
                  </View>
                  <View style={styles.rowMain}>
                    <Body numberOfLines={1} style={styles.rowTitle}>
                      {t.description || t.category}
                    </Body>
                    <Muted>{t.category}</Muted>
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
              ))}
            </View>
          ))
        )}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: { ...type.title, color: colors.text, marginTop: 2 },
  switcher: { flexDirection: 'row', gap: spacing.xs },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totals: { flexDirection: 'row', padding: spacing.lg, gap: spacing.sm },
  totalCol: { flex: 1 },
  totalValue: { ...type.heading, marginTop: 3 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  dateHead: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dotWrap: { width: 30 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: { flex: 1 },
  rowTitle: { fontWeight: '600' },
  amount: { ...type.body, fontWeight: '700' },
})
