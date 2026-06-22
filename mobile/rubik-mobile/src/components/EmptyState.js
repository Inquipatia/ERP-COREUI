import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { radius, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import ActionButton from './ActionButton'

export default function EmptyState({ title = 'Sin datos', message = 'Aun no hay informacion disponible.', actionTitle, onAction }) {
  return (
    <View style={styles.empty}>
      <View style={styles.mark}>
        <Text style={styles.markText}>R</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionTitle && onAction ? <ActionButton title={actionTitle} onPress={onAction} variant="secondary" compact /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.surfaceTint,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  markText: {
    color: colors.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
})
