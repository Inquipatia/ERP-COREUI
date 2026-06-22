import React from 'react'
import { Text } from 'react-native'
import { apiClient } from '../services/apiClient'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import Screen from '../components/Screen'
import useApiResource from '../components/useApiResource'

export default function TendersScreen() {
  const { data, loading, refreshing, error, reload } = useApiResource(apiClient.tenders, [])

  return (
    <Screen title="Licitaciones" subtitle="Analisis y seguimiento" refreshing={refreshing} onRefresh={reload}>
      {error ? <Text>{error}</Text> : null}
      {loading && data.length === 0 ? <LoadingState message="Cargando licitaciones..." /> : null}
      {!loading && data.length === 0 ? (
        <EmptyState
          title="Sin registros todavia"
          message="Las licitaciones analizadas apareceran aqui."
        />
      ) : null}
      {data.map((tender) => (
        <Card key={tender.id} title={tender.title} subtitle={tender.tenderId || tender.buyer}>
          <Text>Comprador: {tender.buyer || '-'}</Text>
          <Text>Cierre: {tender.closingDate || '-'}</Text>
          <Text>Riesgo: {tender.riskLevel}</Text>
          <Text>{tender.summary || ''}</Text>
        </Card>
      ))}
    </Screen>
  )
}
