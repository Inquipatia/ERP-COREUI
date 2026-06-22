import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { apiClient } from '../services/apiClient'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import ModuleCard from '../components/ModuleCard'
import Screen from '../components/Screen'
import StatusBadge from '../components/StatusBadge'
import useApiResource from '../components/useApiResource'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export default function UsersScreen() {
  const { data: users, loading, refreshing, error, reload } = useApiResource(apiClient.users, [])

  return (
    <Screen title="Usuarios" subtitle="Equipo interno Rubik" refreshing={refreshing} onRefresh={reload}>
      {error ? <Text style={styles.error}>No se pudo conectar con la API</Text> : null}
      {loading && users.length === 0 ? <LoadingState message="Cargando usuarios..." /> : null}
      {!loading && users.length === 0 ? (
        <EmptyState
          title="Sin usuarios visibles"
          message="Los perfiles autorizados apareceran aqui cuando la API entregue datos."
        />
      ) : null}

      {users.map((user) => (
        <ModuleCard key={user.id || user.email} title={user.name || 'Usuario Rubik'} subtitle={user.email || 'Sin correo'}>
          <View style={styles.row}>
            <StatusBadge label={user.status || 'Activo'} />
            <Text style={styles.role}>{user.role || user.position || 'Perfil Rubik'}</Text>
          </View>
          <Text style={styles.meta}>{user.area || 'Area no definida'}</Text>
        </ModuleCard>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  role: {
    color: colors.text,
    flex: 1,
    fontWeight: typography.weights.bold,
  },
  meta: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    fontWeight: typography.weights.bold,
  },
})
