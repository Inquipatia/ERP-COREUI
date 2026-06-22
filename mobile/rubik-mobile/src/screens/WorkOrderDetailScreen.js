import React, { useState } from 'react'
import { Alert, Text } from 'react-native'
import { apiClient } from '../services/apiClient'
import Card from '../components/Card'
import FormField from '../components/FormField'
import PrimaryButton from '../components/PrimaryButton'
import Screen from '../components/Screen'

export default function WorkOrderDetailScreen({ workOrder, onBack }) {
  const [localOrder, setLocalOrder] = useState(workOrder)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState(workOrder?.status || 'Pendiente')

  if (!localOrder) {
    return (
      <Screen title="Orden">
        <PrimaryButton title="Volver" onPress={onBack} />
      </Screen>
    )
  }

  const updateStatus = async () => {
    try {
      const updated = await apiClient.updateWorkOrder(localOrder.id, { status })
      setLocalOrder(updated)
      Alert.alert('Orden actualizada')
    } catch (error) {
      Alert.alert('No se pudo actualizar', error.message)
    }
  }

  const addComment = async () => {
    try {
      const updated = await apiClient.addWorkOrderComment(localOrder.id, comment)
      setComment('')
      setLocalOrder(updated)
    } catch (error) {
      Alert.alert('No se pudo comentar', error.message)
    }
  }

  return (
    <Screen title={localOrder.title} subtitle={`${localOrder.sourceArea} -> ${localOrder.targetArea}`}>
      <Card title="Detalle">
        <Text>Tipo: {localOrder.type}</Text>
        <Text>Prioridad: {localOrder.priority}</Text>
        <Text>Estado actual: {localOrder.status}</Text>
        <Text>{localOrder.description}</Text>
      </Card>
      <Card title="Cambiar estado">
        <FormField label="Estado" value={status} onChangeText={setStatus} />
        <PrimaryButton title="Guardar estado" onPress={updateStatus} />
      </Card>
      <Card title="Comentario">
        <FormField label="Nuevo comentario" value={comment} onChangeText={setComment} multiline />
        <PrimaryButton title="Agregar comentario" onPress={addComment} disabled={!comment.trim()} />
      </Card>
      {(localOrder.comments || []).map((item) => (
        <Card key={item.id} title={item.userName || 'Comentario'}>
          <Text>{item.body}</Text>
          <Text>{item.createdAt}</Text>
        </Card>
      ))}
      <PrimaryButton title="Volver" onPress={onBack} variant="secondary" />
    </Screen>
  )
}
