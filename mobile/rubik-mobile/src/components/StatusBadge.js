import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { getStatusColors } from '../theme/colors'
import { radius, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export default function StatusBadge({ label, tone }) {
  const palette = tone ? getStatusColors(tone) : getStatusColors(label)

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.text, { color: palette.color }]}>{label || 'Sin estado'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
  },
})
