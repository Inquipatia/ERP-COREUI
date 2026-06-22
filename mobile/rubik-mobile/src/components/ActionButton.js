import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { colors } from '../theme/colors'
import { radius, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

const variants = {
  primary: { backgroundColor: colors.primary, color: colors.textOnDark, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceMuted, color: colors.text, borderColor: colors.border },
  success: { backgroundColor: colors.success, color: colors.textOnDark, borderColor: colors.success },
  danger: { backgroundColor: colors.danger, color: colors.textOnDark, borderColor: colors.danger },
  warning: { backgroundColor: colors.warning, color: colors.text, borderColor: colors.warning },
  ghost: { backgroundColor: 'transparent', color: colors.primary, borderColor: colors.primarySoft },
}

export default function ActionButton({ title, onPress, variant = 'primary', disabled = false, loading = false, compact = false }) {
  const palette = variants[variant] || variants.primary

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        compact && styles.compact,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.color} /> : <Text style={[styles.text, { color: palette.color }]}>{title}</Text>}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  compact: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.black,
  },
})
