import React from 'react'
import { Text } from 'react-native'
import { apiClient } from '../services/apiClient'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import Screen from '../components/Screen'
import useApiResource from '../components/useApiResource'

export default function SuppliersScreen() {
  const { data, loading, refreshing, error, reload } = useApiResource(apiClient.suppliers, [])

  return (
    <Screen title="Proveedores" subtitle="Consulta de proveedores" refreshing={refreshing} onRefresh={reload}>
      {error ? <Text>{error}</Text> : null}
      {loading && data.length === 0 ? <LoadingState message="Cargando proveedores..." /> : null}
      {!loading && data.length === 0 ? (
        <EmptyState
          title="Sin registros todavia"
          message="Los proveedores creados en Finanzas apareceran aqui."
        />
      ) : null}
      {data.map((supplier) => (
        <Card key={supplier.id} title={supplier.name} subtitle={supplier.category || supplier.rut}>
          <Text>{supplier.contactName || 'Sin contacto'}</Text>
          <Text>{supplier.email || ''}</Text>
          <Text>{supplier.status}</Text>
        </Card>
      ))}
    </Screen>
  )
}
