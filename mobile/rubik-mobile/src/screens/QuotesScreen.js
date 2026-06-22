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

const clp = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value) || 0)

export default function QuotesScreen({ hasPermission, onOpenQuote }) {
  const { data: quotes, loading, refreshing, error, reload } = useApiResource(apiClient.quotes, [])
  const [form, setForm] = useState({ client: '', company: '', subject: '', totalAmount: '' })
  const canCreate = hasPermission('quotes.create')

  const createQuote = async () => {
    try {
      const total = Number(form.totalAmount) || 0
      await apiClient.createQuote({
        ...form,
        quoteNumber: String(Date.now()).slice(-6),
        status: 'Borrador',
        netAmount: Math.round(total / 1.19),
        taxAmount: total - Math.round(total / 1.19),
        totalAmount: total,
        date: new Date().toISOString().slice(0, 10),
      })
      setForm({ client: '', company: '', subject: '', totalAmount: '' })
      reload()
    } catch (createError) {
      Alert.alert('No se pudo crear cotizacion', createError.message)
    }
  }

  return (
    <Screen title="Cotizaciones" subtitle="Crear y revisar cotizaciones desde el telefono" refreshing={refreshing} onRefresh={reload}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {canCreate ? (
        <Card title="Nueva cotizacion" subtitle="Registro rapido conectado a la API">
          <FormField label="Cliente" value={form.client} onChangeText={(value) => setForm({ ...form, client: value })} />
          <FormField label="Empresa" value={form.company} onChangeText={(value) => setForm({ ...form, company: value })} />
          <FormField label="Tema" value={form.subject} onChangeText={(value) => setForm({ ...form, subject: value })} />
          <FormField label="Total" value={form.totalAmount} onChangeText={(value) => setForm({ ...form, totalAmount: value })} keyboardType="numeric" />
          <PrimaryButton title="Crear cotizacion" onPress={createQuote} disabled={!form.client.trim()} />
        </Card>
      ) : null}

      {loading && quotes.length === 0 ? <LoadingState /> : null}
      {!loading && quotes.length === 0 ? <EmptyState title="Sin cotizaciones" message="Las cotizaciones creadas desde web o movil apareceran aqui." /> : null}

      {quotes.map((quote) => (
        <ModuleCard
          key={quote.id}
          title={`Cotizacion ${quote.quoteNumber}`}
          subtitle={quote.company || quote.client || 'Cliente sin nombre'}
          rightText={clp(quote.totalAmount)}
          onPress={() => onOpenQuote(quote)}
        >
          <View style={styles.row}>
            <StatusBadge label={quote.status || 'Borrador'} />
            <Text style={styles.muted}>{quote.subject || 'Sin tema'}</Text>
          </View>
          <PrimaryButton title="Ver detalle" onPress={() => onOpenQuote(quote)} variant="secondary" compact />
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
