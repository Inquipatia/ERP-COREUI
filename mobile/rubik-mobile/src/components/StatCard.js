import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { radius, shadow, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

const tones = {
  primary: { color: colors.primary, backgroundColor: colors.primarySoft },
  accent: { color: colors.accent, backgroundColor: colors.accentSoft },
  success: { color: colors.success, backgroundColor: colors.successSoft },
  warning: { color: colors.warning, backgroundColor: colors.warningSoft },
  danger: { color: colors.danger, backgroundColor: colors.dangerSoft },
  neutral: { color: colors.neutral, backgroundColor: colors.neutralSoft },
}

export default function StatCard({ label, value, helper, tone = 'primary' }) {
  const palette = tones[tone] || tones.primary

  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: palette.backgroundColor }]}>
        <View style={[styles.dotInner, { backgroundColor: palette.color }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: palette.color }]}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    minWidth: '47%',
    padding: spacing.lg,
    ...shadow.card,
  },
  dot: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 28,
  },
  dotInner: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  value: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    marginTop: spacing.xs,
  },
  helper: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
})
