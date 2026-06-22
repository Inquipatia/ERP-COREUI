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

export default function DocumentsScreen() {
  const { data, loading, refreshing, error, reload } = useApiResource(apiClient.documents, [])

  return (
    <Screen title="Documentos" subtitle="Centro documental movil" refreshing={refreshing} onRefresh={reload}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && data.length === 0 ? <LoadingState /> : null}
      {!loading && data.length === 0 ? <EmptyState title="Sin documentos" message="Aqui veras cotizaciones, licitaciones y otros documentos comerciales." /> : null}

      {data.map((document) => (
        <ModuleCard
          key={document.id}
          title={`${document.type || document.tipoDocumento || 'Documento'} ${document.documentNumber || document.numeroDocumento || ''}`}
          subtitle={document.company || document.empresa || document.client || document.cliente || 'Sin cliente'}
        >
          <View style={styles.row}>
            <StatusBadge label={document.status || document.estado || 'Borrador'} />
            <Text style={styles.muted}>{document.observations || document.observaciones || 'Sin observaciones'}</Text>
          </View>
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
  muted: {
    color: colors.textMuted,
    flex: 1,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
})
