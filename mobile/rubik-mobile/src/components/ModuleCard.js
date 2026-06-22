import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { colors } from '../theme/colors'
import { radius, shadow, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import StatusBadge from './StatusBadge'

export default function ModuleCard({ title, subtitle, meta, badge, onPress, children, rightText }) {
  return (
    <TouchableOpacity activeOpacity={0.84} disabled={!onPress} onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {rightText ? <Text style={styles.rightText}>{rightText}</Text> : null}
        {badge ? <StatusBadge label={badge} /> : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadow.card,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xxs,
  },
  rightText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.black,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: spacing.md,
  },
  body: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
})
