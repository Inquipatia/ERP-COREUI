import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { colors } from '../theme/colors'
import { radius, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

const initials = (name = 'Rubik') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

export default function AppHeader({ user, title = 'Rubik ERP', onOpenMenu }) {
  const userSubtitle = [user?.role, user?.area].filter(Boolean).join(' / ')

  return (
    <View style={styles.header}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>R</Text>
      </View>
      <View style={styles.titleGroup}>
        <Text style={styles.title} numberOfLines={1}>{user?.name || title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {userSubtitle || user?.email || 'Sesion activa'}
        </Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(user?.name)}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.82} onPress={onOpenMenu} style={styles.menuButton}>
        <Text style={styles.menuText}>Mas</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomColor: colors.borderDark,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  brandMarkText: {
    color: colors.textOnDark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.textOnDark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  avatarText: {
    color: colors.textOnDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.black,
  },
  menuButton: {
    backgroundColor: colors.backgroundPanel,
    borderColor: colors.borderDark,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuText: {
    color: colors.textOnDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.black,
  },
})
