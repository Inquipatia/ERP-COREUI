import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Dimensions, StyleSheet, Text, View } from 'react-native'
import { BarChart, PieChart } from 'react-native-chart-kit'
import { apiClient } from '../services/apiClient'
import EmptyState from '../components/EmptyState'
import FormField from '../components/FormField'
import LoadingState from '../components/LoadingState'
import ModuleCard from '../components/ModuleCard'
import PrimaryButton from '../components/PrimaryButton'
import Screen from '../components/Screen'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import useApiResource from '../components/useApiResource'
import { colors } from '../theme/colors'
import { radius, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

const chartWidth = Math.max(300, Dimensions.get('window').width - 52)
const chartConfig = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  decimalPlaces: 0,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  propsForBackgroundLines: {
    stroke: colors.border,
    strokeDasharray: '4 8',
  },
}

const clp = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value) || 0)

const getNumber = (value) => Number(value) || 0

const getFriendlyFinanceError = (message, hasSession) => {
  if (!message) return ''
  if (/iniciar sesión/i.test(message)) {
    return hasSession
      ? 'No pudimos confirmar tu sesión. Usa Sincronizar datos o vuelve a iniciar sesión.'
      : 'Debes iniciar sesión para ver esta sección.'
  }
  if (/restringida|permiso/i.test(message)) {
    return 'Tu perfil no tiene acceso a información financiera.'
  }
  return message
}

export default function FinanceScreen({ hasPermission, session, onNavigate }) {
  const [paymentAmounts, setPaymentAmounts] = useState({})
  const canPay = hasPermission('finance.payments')
  const canViewFinance = hasPermission('finance.view')
  const hasSession = Boolean(session?.token && session?.user)
  const summaryResource = useApiResource(apiClient.financeSummary, {})
  const movementsResource = useApiResource(useCallback(() => apiClient.financeMovements(), []), [])

  const reload = () => {
    summaryResource.reload()
    movementsResource.reload()
  }

  const registerPayment = async (movement) => {
    const amount = Number(paymentAmounts[movement.id]) || 0
    try {
      await apiClient.registerPayment(movement.id, {
        amount,
        paymentMethod: 'Transferencia',
        paymentDate: new Date().toISOString().slice(0, 10),
      })
      setPaymentAmounts({ ...paymentAmounts, [movement.id]: '' })
      reload()
    } catch (error) {
      Alert.alert('No se pudo registrar pago', error.message)
    }
  }

  const movements = Array.isArray(movementsResource.data) ? movementsResource.data : []
  const summary = summaryResource.data || {}
  const incomeTotal = useMemo(
    () => movements.filter((movement) => movement.type === 'Ingreso').reduce((total, movement) => total + getNumber(movement.totalAmount), 0),
    [movements],
  )
  const expenseTotal = useMemo(
    () => movements.filter((movement) => movement.type === 'Egreso').reduce((total, movement) => total + getNumber(movement.totalAmount), 0),
    [movements],
  )
  const paid = getNumber(summary.totalPaid)
  const pending = getNumber(summary.totalPending)
  const overdue = movements
    .filter((movement) => movement.status === 'Vencido')
    .reduce((total, movement) => total + getNumber(movement.pendingAmount), 0)
  const flowTotal = Math.max(1, paid + pending)
  const paidPercent = Math.round((paid / flowTotal) * 100)
  const visibleError = getFriendlyFinanceError(summaryResource.error || movementsResource.error, hasSession)

  const pieData = [
    {
      color: colors.success,
      legendFontColor: colors.textMuted,
      legendFontSize: 12,
      name: 'Cobrado',
      population: Math.max(paid, 0),
    },
    {
      color: colors.warning,
      legendFontColor: colors.textMuted,
      legendFontSize: 12,
      name: 'Pendiente',
      population: Math.max(pending - overdue, 0),
    },
    {
      color: colors.danger,
      legendFontColor: colors.textMuted,
      legendFontSize: 12,
      name: 'Vencido',
      population: Math.max(overdue || summary.overdue || 0, 0),
    },
  ].filter((item) => item.population > 0)

  if (!hasSession) {
    return (
      <Screen title="Finanzas" subtitle="Resumen privado y pagos por API">
        <EmptyState
          title="Debes iniciar sesión para ver esta sección."
          message="Inicia sesión con tu usuario Rubik para consultar información financiera."
        />
      </Screen>
    )
  }

  if (!canViewFinance) {
    return (
      <Screen title="Finanzas" subtitle="Resumen privado y pagos por API">
        <EmptyState
          title="Esta sección está restringida para perfiles autorizados."
          message="Tu perfil no tiene acceso a información financiera."
        />
      </Screen>
    )
  }

  return (
    <Screen
      title="Finanzas"
      subtitle="Resumen privado y pagos por API"
      refreshing={summaryResource.refreshing || movementsResource.refreshing}
      onRefresh={reload}
    >
      {visibleError ? <Text style={styles.error}>{visibleError}</Text> : null}

      <View style={styles.grid}>
        <StatCard label="Por cobrar" value={clp(summary.receivable)} tone="primary" />
        <StatCard label="Por pagar" value={clp(summary.payable)} tone="warning" />
        <StatCard label="Pendiente" value={clp(summary.totalPending)} tone="accent" />
        <StatCard label="Vencidos" value={summary.overdue ?? 0} tone="danger" />
      </View>

      <ModuleCard title="Ingresos vs egresos" subtitle="Datos recibidos desde Finanzas/API">
        <BarChart
          data={{
            labels: ['Ingresos', 'Egresos'],
            datasets: [{ data: [incomeTotal, expenseTotal].map((value) => Math.max(value, 0)) }],
          }}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          fromZero
          showValuesOnTopOfBars
          style={styles.chart}
        />
      </ModuleCard>

      <ModuleCard title="Cobrado / pendiente / vencido" subtitle="Distribución visual de saldos">
        {pieData.length > 0 ? (
          <PieChart
            accessor="population"
            backgroundColor="transparent"
            data={pieData}
            hasLegend
            height={210}
            paddingLeft="8"
            width={chartWidth}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        ) : (
          <Text style={styles.muted}>Aún no hay saldos para graficar.</Text>
        )}
      </ModuleCard>

      <ModuleCard title="Flujo de caja" subtitle="Avance de cobro sobre total visible">
        <View style={styles.flowHeader}>
          <Text style={styles.flowValue}>{paidPercent}%</Text>
          <Text style={styles.muted}>cobrado</Text>
        </View>
        <View style={styles.flowTrack}>
          <View style={[styles.flowFill, { width: `${paidPercent}%` }]} />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Cobrado {clp(paid)}</Text>
          <Text style={styles.muted}>Pendiente {clp(pending)}</Text>
        </View>
      </ModuleCard>

      {movementsResource.loading && movements.length === 0 ? <LoadingState /> : null}
      {!movementsResource.loading && movements.length === 0 ? (
        <EmptyState
          title="Sin movimientos financieros todavía"
          message="Cuando registres pagos o cuentas por cobrar aparecerán aquí."
          actionTitle={canPay ? 'Actualizar' : undefined}
          onAction={canPay ? reload : undefined}
        />
      ) : null}

      {movements.map((movement) => (
        <ModuleCard
          key={movement.id}
          title={movement.description || movement.documentNumber || 'Movimiento financiero'}
          subtitle={movement.client || movement.company || movement.supplierName || movement.type}
          rightText={clp(movement.pendingAmount)}
        >
          <View style={styles.row}>
            <StatusBadge label={movement.status || 'Sin pagar'} />
            <Text style={styles.muted}>{movement.type || 'Movimiento'} - Total {clp(movement.totalAmount)}</Text>
          </View>
          <Text style={styles.muted}>
            {movement.quoteSourceLocked ? 'Monto bloqueado desde cotización' : 'Movimiento financiero desde API'}
          </Text>
          {canPay && movement.pendingAmount > 0 ? (
            <View style={styles.paymentBox}>
              <FormField
                label="Monto a pagar"
                value={paymentAmounts[movement.id] || ''}
                onChangeText={(value) => setPaymentAmounts({ ...paymentAmounts, [movement.id]: value })}
                keyboardType="numeric"
              />
              <PrimaryButton title="Registrar pago" onPress={() => registerPayment(movement)} />
            </View>
          ) : null}
        </ModuleCard>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  muted: {
    color: colors.textMuted,
    flex: 1,
  },
  chart: {
    alignSelf: 'center',
    borderRadius: radius.lg,
    marginLeft: -spacing.md,
  },
  flowHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flowValue: {
    color: colors.success,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
  },
  flowTrack: {
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.pill,
    height: 14,
    overflow: 'hidden',
  },
  flowFill: {
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    height: '100%',
  },
  paymentBox: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontWeight: typography.weights.bold,
  },
})
