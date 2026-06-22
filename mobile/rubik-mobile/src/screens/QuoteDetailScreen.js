import React from 'react'
import { Alert, Text } from 'react-native'
import { apiClient } from '../services/apiClient'
import Card from '../components/Card'
import PrimaryButton from '../components/PrimaryButton'
import Screen from '../components/Screen'

const clp = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value) || 0)

export default function QuoteDetailScreen({ quote, hasPermission, onBack }) {
  if (!quote) {
    return (
      <Screen title="Cotizacion">
        <PrimaryButton title="Volver" onPress={onBack} />
      </Screen>
    )
  }

  const generateReceivable = async () => {
    try {
      await apiClient.generateReceivable(quote.id)
      Alert.alert('Cuenta por cobrar generada', 'El total de la cotizacion quedo bloqueado en finanzas.')
    } catch (error) {
      Alert.alert('No se pudo generar', error.message)
    }
  }

  return (
    <Screen title={`Cotizacion ${quote.quoteNumber}`} subtitle={quote.company || quote.client}>
      <Card title="Datos">
        <Text>Cliente: {quote.client}</Text>
        <Text>Vendedor: {quote.seller || '-'}</Text>
        <Text>Estado: {quote.status}</Text>
        <Text>Neto: {clp(quote.netAmount)}</Text>
        <Text>IVA: {clp(quote.taxAmount)}</Text>
        <Text>Total: {clp(quote.totalAmount)}</Text>
      </Card>
      {hasPermission('finance.manage') ? (
        <PrimaryButton title="Generar cuenta por cobrar" onPress={generateReceivable} />
      ) : null}
      <PrimaryButton title="Volver" onPress={onBack} variant="secondary" />
    </Screen>
  )
}
