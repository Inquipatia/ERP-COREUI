import React, { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { apiClient } from '../services/apiClient'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import FormField from '../components/FormField'
import LoadingState from '../components/LoadingState'
import ModuleCard from '../components/ModuleCard'
import PrimaryButton from '../components/PrimaryButton'
import Screen from '../components/Screen'
import StatusBadge from '../components/StatusBadge'
import useApiResource from '../components/useApiResource'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'

export default function WorkOrdersScreen({ hasPermission, onOpenWorkOrder }) {
  const { data, loading, refreshing, error, reload } = useApiResource(apiClient.workOrders, [])
  const [form, setForm] = useState({ title: '', type: 'Administrativo', sourceArea: 'Ventas', targetArea: 'Diseno', description: '' })
  const canCreate = hasPermission('workorders.create')

  const createWorkOrder = async () => {
    try {
      await apiClient.createWorkOrder({ ...form, priority: 'Media', status: 'Pendiente' })
      setForm({ title: '', type: 'Administrativo', sourceArea: 'Ventas', targetArea: 'Diseno', description: '' })
      reload()
    } catch (createError) {
      Alert.alert('No se pudo crear orden', createError.message)
    }
  }

  return (
    <Screen title="Ordenes de trabajo" subtitle="Coordinacion interna entre areas" refreshing={refreshing} onRefresh={reload}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {canCreate ? (
        <Card title="Nueva orden" subtitle="Solicitud rapida para equipos internos">
          <FormField label="Titulo" value={form.title} onChangeText={(value) => setForm({ ...form, title: value })} />
          <FormField label="Tipo" value={form.type} onChangeText={(value) => setForm({ ...form, type: value })} />
          <View style={styles.twoColumns}>
            <FormField label="Area origen" value={form.sourceArea} onChangeText={(value) => setForm({ ...form, sourceArea: value })} />
            <FormField label="Area responsable" value={form.targetArea} onChangeText={(value) => setForm({ ...form, targetArea: value })} />
          </View>
          <FormField label="Descripcion" value={form.description} onChangeText={(value) => setForm({ ...form, description: value })} multiline />
          <PrimaryButton title="Crear orden" onPress={createWorkOrder} disabled={!form.title.trim()} />
        </Card>
      ) : null}

      {loading && data.length === 0 ? <LoadingState /> : null}
      {!loading && data.length === 0 ? <EmptyState title="Sin ordenes" message="Las tareas internas apareceran aqui segun tus permisos." /> : null}

      {data.map((order) => (
        <ModuleCard
          key={order.id}
          title={order.title}
          subtitle={`${order.sourceArea || 'Origen'} -> ${order.targetArea || 'Responsable'}`}
          onPress={() => onOpenWorkOrder(order)}
        >
          <View style={styles.row}>
            <StatusBadge label={order.status || 'Pendiente'} />
            <StatusBadge label={order.priority || 'Media'} tone={order.priority === 'Urgente' ? 'Urgente' : order.priority} />
          </View>
          <Text style={styles.meta}>{order.type || 'Sin tipo'}</Text>
          <PrimaryButton title="Ver orden" onPress={() => onOpenWorkOrder(order)} variant="secondary" compact />
        </ModuleCard>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  twoColumns: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  meta: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
})
