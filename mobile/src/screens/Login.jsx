import { Ionicons } from '@expo/vector-icons'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, spacing, type } from '../theme'
import { Btn, Card, Muted } from '../ui'
import { useUser } from '../UserContext'

/**
 * Sign-in screen.
 *
 * The web version carries a lot of diagnostic surface for people whose
 * Firebase project isn't wired up yet. On a phone the only failure anyone
 * realistically hits is a missing OAuth client ID, so that one case gets a
 * specific, actionable message and everything else stays quiet.
 */
export default function Login() {
  const { signInWithGoogle, signingIn, authError, clearAuthError } = useUser()

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brand}>
        <View style={styles.badge}>
          <Ionicons name="wallet" size={30} color={colors.white} />
        </View>
        <Text style={styles.title}>PFT</Text>
        <Muted style={styles.tagline}>
          Track your income and expenses anywhere, anytime. Your data stays in your own Google
          account — never on this device alone.
        </Muted>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Sign in to continue</Text>
        <Muted style={{ marginTop: spacing.xs, lineHeight: 19 }}>
          Use the same Google account as the web app and every transaction, budget and pay source
          appears here instantly.
        </Muted>

        <Btn size="lg" onPress={signInWithGoogle} disabled={signingIn} style={{ marginTop: 18 }}>
          {signingIn ? 'Opening Google…' : 'Continue with Google'}
        </Btn>

        {authError ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText} onPress={clearAuthError}>
              {String(authError.message || authError)}
            </Text>
          </View>
        ) : null}
      </Card>

      <Muted style={styles.footnote}>
        PFT never sees your Google password — authentication is handled entirely by Google.
      </Muted>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  brand: { alignItems: 'center', marginBottom: spacing.xxl },
  badge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...type.hero, color: colors.text },
  tagline: { textAlign: 'center', marginTop: spacing.sm, lineHeight: 21, maxWidth: 320 },
  cardTitle: { ...type.heading, color: colors.text },
  error: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
  },
  errorText: { ...type.small, color: colors.danger, flex: 1, lineHeight: 18 },
  footnote: { textAlign: 'center', marginTop: spacing.xl, lineHeight: 18 },
})
