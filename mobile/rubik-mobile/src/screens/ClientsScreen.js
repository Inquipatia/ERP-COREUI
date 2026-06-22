import React, { useState } from 'react'
import { Alert, Text } from 'react-native'
import { apiClient } from '../services/apiClient'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import FormField from '../components/FormField'
import LoadingState from '../components/LoadingState'
import PrimaryButton from '../components/PrimaryButton'
import Screen from '../components/Screen'
import useApiResource from '../components/useApiResource'

export default function ClientsScreen({ hasPermission }) {
  const { data: clients, loading, refreshing, error, reload } = useApiResource(apiClient.clients, [])
  const [form, setForm] = useState({ contactName: '', company: '', rut: '', phone: '', email: '' })
  const canCreate = hasPermission('clients.manage')

  const createClient = async () => {
    try {
      await apiClient.createClient({ ...form, status: 'Activo' })
      setForm({ contactName: '', company: '', rut: '', phone: '', email: '' })
      reload()
    } catch (createError) {
      Alert.alert('No se pudo crear cliente', createError.message)
    }
  }

  return (
    <Screen title="Clientes" subtitle="Consulta y creacion rapida" refreshing={refreshing} onRefresh={reload}>
      {error ? <Text>{error}</Text> : null}
      {canCreate ? (
        <Card title="Nuevo cliente">
          <FormField label="Contacto" value={form.contactName} onChangeText={(value) => setForm({ ...form, contactName: value })} />
          <FormField label="Empresa" value={form.company} onChangeText={(value) => setForm({ ...form, company: value })} />
          <FormField label="RUT" value={form.rut} onChangeText={(value) => setForm({ ...form, rut: value })} />
          <FormField label="Telefono" value={form.phone} onChangeText={(value) => setForm({ ...form, phone: value })} />
          <PrimaryButton title="Crear cliente" onPress={createClient} disabled={!form.contactName.trim()} />
        </Card>
      ) : null}
      {loading && clients.length === 0 ? <LoadingState message="Cargando clientes..." /> : null}
      {!loading && clients.length === 0 ? (
        <EmptyState
          title="Sin registros todavia"
          message="Los clientes creados desde web o movil apareceran aqui."
        />
      ) : null}
      {clients.map((client) => (
        <Card key={client.id} title={client.company || client.contactName} subtitle={client.contactName}>
          <Text>{client.rut || 'Sin RUT'} · {client.phone || 'Sin telefono'}</Text>
          <Text>{client.email || ''}</Text>
        </Card>
      ))}
    </Screen>
  )
}
