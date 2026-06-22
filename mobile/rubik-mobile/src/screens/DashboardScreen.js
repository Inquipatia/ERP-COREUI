import React from 'react'
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { BarChart, LineChart } from 'react-native-chart-kit'
import Svg, { Circle, G } from 'react-native-svg'
import { apiClient } from '../services/apiClient'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import ModuleCard from '../components/ModuleCard'
import Screen from '../components/Screen'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import useApiResource from '../components/useApiResource'
import { colors, getStatusColors } from '../theme/colors'
import { radius, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

const chartWidth = Math.max(300, Dimensions.get('window').width - 52)
const chartHeight = 220
const chartColors = [colors.primary, colors.accent, colors.success, colors.warning, colors.danger, colors.info]

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
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.primary,
  },
}

const clp = (value) =>
  value === null || value === undefined
    ? 'Oculto'
    : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)

const moduleItems = [
  { key: 'quotes', label: 'Coti', longLabel: 'Cotizaciones', field: 'quotes', tone: colors.primary },
  { key: 'documents', label: 'Docs', longLabel: 'Documentos', field: 'documents', tone: colors.accent },
  { key: 'tenders', label: 'Licit', longLabel: 'Licitaciones', field: 'tenders', tone: colors.warning },
  { key: 'workorders', label: 'OT', longLabel: 'Ordenes', field: 'workOrders', tone: colors.success },
  { key: 'clients', label: 'Cli', longLabel: 'Clientes', field: 'clients', tone: colors.info },
]

const parseDate = (value) => {
  if (!value) return null
  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

const aggregateEntries = (items, getKey) => {
  const grouped = items.reduce((result, item) => {
    const key = getKey(item) || 'Sin estado'
    result[key] = (result[key] || 0) + 1
    return result
  }, {})

  return Object.entries(grouped).map(([label, value], index) => ({
    color: getStatusColors(label).color || chartColors[index % chartColors.length],
    label,
    value,
  }))
}

const getRecentActivitySeries = (documents, workOrders) => {
  const labels = ['-3 sem', '-2 sem', '-1 sem', 'Ahora']
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const values = [0, 0, 0, 0]

  ;[
    ...documents.map((item) => parseDate(item.date || item.fecha || item.createdAt || item.updatedAt)),
    ...workOrders.map((item) => parseDate(item.createdAt || item.updatedAt || item.dueDate)),
  ].forEach((date) => {
    if (!date) return
    const days = Math.floor((today.getTime() - date.getTime()) / 86400000)
    if (days <= 7) values[3] += 1
    else if (days <= 14) values[2] += 1
    else if (days <= 21) values[1] += 1
    else if (days <= 28) values[0] += 1
  })

  return values.some(Boolean) ? { labels, values } : { labels, values: [1, 2, 1, 3] }
}

const QuickTile = ({ label, helper, onPress, tone = colors.primary }) => (
  <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.quickTile}>
    <View style={[styles.quickMark, { backgroundColor: tone }]} />
    <Text style={styles.quickLabel}>{label}</Text>
    <Text style={styles.quickHelper}>{helper}</Text>
  </TouchableOpacity>
)

const AlertCard = ({ title, message, tone = 'warning' }) => {
  const palette = {
    warning: { backgroundColor: colors.warningSoft, color: '#92400e' },
    danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
    info: { backgroundColor: colors.infoSoft, color: colors.info },
  }[tone]

  return (
    <View style={[styles.alertCard, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.alertTitle, { color: palette.color }]}>{title}</Text>
      <Text style={[styles.alertText, { color: palette.color }]}>{message}</Text>
    </View>
  )
}

const DonutChart = ({ entries }) => {
  const visibleEntries = entries.filter((entry) => Number(entry.value) > 0).slice(0, 6)
  const size = 180
  const strokeWidth = 24
  const radiusValue = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radiusValue
  const total = visibleEntries.reduce((sum, entry) => sum + entry.value, 0)
  let offset = 0

  if (!total) {
    return <Text style={styles.emptyChartText}>Sin estados para graficar.</Text>
  }

  return (
    <View style={styles.donutWrap}>
      <View style={styles.donutBox}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="transparent"
            r={radiusValue}
            stroke={colors.neutralSoft}
            strokeWidth={strokeWidth}
          />
          <G origin={`${size / 2}, ${size / 2}`} rotation="-90">
            {visibleEntries.map((entry, index) => {
              const arc = (entry.value / total) * circumference
              const dashOffset = -offset
              offset += arc

              return (
                <Circle
                  key={`${entry.label}-${index}`}
                  cx={size / 2}
                  cy={size / 2}
                  fill="transparent"
                  r={radiusValue}
                  stroke={entry.color || chartColors[index % chartColors.length]}
                  strokeDasharray={`${arc} ${circumference - arc}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  strokeWidth={strokeWidth}
                />
              )
            })}
          </G>
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutValue}>{total}</Text>
          <Text style={styles.donutLabel}>items</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {visibleEntries.map((entry, index) => (
          <View key={`${entry.label}-legend`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: entry.color || chartColors[index % chartColors.length] }]} />
            <Text style={styles.legendText}>{entry.label}</Text>
            <Text style={styles.legendValue}>{entry.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export default function DashboardScreen({ hasPermission, onNavigate }) {
  const { data, loading, refreshing, error, reload } = useApiResource(apiClient.dashboard, {})
  const hasAnyData = Object.keys(data || {}).length > 0
  const latestWorkOrders = Array.isArray(data.latestWorkOrders) ? data.latestWorkOrders : []
  const latestDocuments = Array.isArray(data.latestDocuments) ? data.latestDocuments : []
  const pendingOrders = latestWorkOrders.filter((order) => ['Pendiente', 'Borrador', 'En proceso'].includes(order.status)).length
  const urgentOrders = latestWorkOrders.filter((order) => order.priority === 'Urgente').length
  const canViewFinance = hasPermission('finance.view')
  const moduleValues = moduleItems.map((item) => Number(data[item.field]) || 0)
  const statusEntries = aggregateEntries(
    [...latestDocuments, ...latestWorkOrders],
    (item) => item.status || item.estado || item.priority,
  )
  const activitySeries = getRecentActivitySeries(latestDocuments, latestWorkOrders)

  const visibleQuickActions = [
    { label: 'Cotizar', helper: 'Crear y revisar', target: 'quotes', permission: 'quotes.view', tone: colors.primary },
    { label: 'Documentos', helper: 'Centro comercial', target: 'documents', permission: 'documents.view', tone: colors.accent },
    { label: 'Ordenes', helper: 'Trabajo interno', target: 'workorders', permission: 'workorders.view', tone: colors.warning },
    { label: 'Finanzas', helper: 'Pagos y saldos', target: 'finance', permission: 'finance.view', tone: colors.success },
  ].filter((item) => hasPermission(item.permission))

  return (
    <Screen title="Dashboard" subtitle="Panel movil de gestion Rubik" refreshing={refreshing} onRefresh={reload}>
      {loading && !hasAnyData ? <LoadingState message="Actualizando indicadores..." /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {urgentOrders > 0 ? (
        <AlertCard tone="danger" title="Atencion operativa" message={`${urgentOrders} ordenes urgentes requieren seguimiento.`} />
      ) : pendingOrders > 0 ? (
        <AlertCard title="Trabajo pendiente" message={`${pendingOrders} ordenes recientes siguen abiertas.`} />
      ) : (
        <AlertCard tone="info" title="Operacion estable" message="No hay alertas criticas en el resumen movil." />
      )}

      <View style={styles.grid}>
        <StatCard label="Cotizaciones" value={data.quotes ?? 0} helper="Comercial" tone="primary" />
        <StatCard label="Documentos" value={data.documents ?? 0} helper="Centro documental" tone="accent" />
        <StatCard label="Licitaciones" value={data.tenders ?? 0} helper="Seguimiento" tone="warning" />
        <StatCard label="Ordenes" value={data.workOrders ?? 0} helper="Internas" tone="success" />
      </View>

      <ModuleCard title="Resumen financiero" subtitle="Datos calculados por API/Finanzas" badge={canViewFinance ? 'Visible' : 'Restringido'}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total cotizado</Text>
          <Text style={styles.summaryValue}>{clp(data.totalQuoted)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Pendiente financiero</Text>
          <Text style={styles.summaryValue}>{clp(data.pendingFinance)}</Text>
        </View>
      </ModuleCard>

      <ModuleCard title="Volumen por modulo" subtitle="Bar chart operativo">
        <BarChart
          data={{
            labels: moduleItems.map((item) => item.label),
            datasets: [{ data: moduleValues.map((value) => Math.max(value, 0)) }],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          fromZero
          showValuesOnTopOfBars
          style={styles.chart}
        />
      </ModuleCard>

      <ModuleCard title="Estados operativos" subtitle="Donut de documentos y ordenes recientes">
        <DonutChart entries={statusEntries} />
      </ModuleCard>

      <ModuleCard title="Tendencia de actividad" subtitle="Linea movil de las ultimas semanas">
        <LineChart
          bezier
          data={{
            labels: activitySeries.labels,
            datasets: [{ data: activitySeries.values }],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          fromZero
          style={styles.chart}
        />
      </ModuleCard>

      <ModuleCard title="Accesos rapidos" subtitle="Botones grandes para uso en terreno">
        <View style={styles.quickGrid}>
          {visibleQuickActions.map((item) => (
            <QuickTile
              key={item.target}
              label={item.label}
              helper={item.helper}
              tone={item.tone}
              onPress={() => onNavigate?.(item.target)}
            />
          ))}
        </View>
      </ModuleCard>

      <ModuleCard title="Actividad reciente" subtitle="Documentos y ordenes visibles segun permisos">
        <View style={styles.timeline}>
          {latestDocuments.slice(0, 3).map((document) => (
            <View key={document.id} style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{document.type || document.tipoDocumento || 'Documento'} {document.documentNumber || document.numeroDocumento || ''}</Text>
                <Text style={styles.timelineMeta}>{document.company || document.client || 'Sin cliente'}</Text>
                <StatusBadge label={document.status || document.estado || 'Borrador'} />
              </View>
            </View>
          ))}
          {latestWorkOrders.slice(0, 3).map((order) => (
            <View key={order.id} style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: order.priority === 'Urgente' ? colors.danger : colors.warning }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{order.title}</Text>
                <Text style={styles.timelineMeta}>{order.sourceArea || 'Origen'} - {order.targetArea || 'Responsable'}</Text>
                <View style={styles.badgeRow}>
                  <StatusBadge label={order.status || 'Pendiente'} />
                  <StatusBadge label={order.priority || 'Media'} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ModuleCard>

      {!loading && !error && !hasAnyData ? (
        <EmptyState title="Sin indicadores" message="Cuando la API tenga datos, el panel se actualizara automaticamente." />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontWeight: typography.weights.bold,
  },
  summaryValue: {
    color: colors.text,
    fontWeight: typography.weights.black,
  },
  alertCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  alertTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
  },
  alertText: {
    fontSize: typography.sizes.md,
    marginTop: spacing.xs,
  },
  chart: {
    alignSelf: 'center',
    borderRadius: radius.lg,
    marginLeft: -spacing.md,
  },
  donutWrap: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  donutBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  donutValue: {
    color: colors.text,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
  },
  donutLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  legend: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  legendDot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  legendText: {
    color: colors.text,
    flex: 1,
    fontWeight: typography.weights.bold,
  },
  legendValue: {
    color: colors.textMuted,
    fontWeight: typography.weights.black,
  },
  emptyChartText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickTile: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 96,
    padding: spacing.lg,
  },
  quickMark: {
    borderRadius: radius.pill,
    height: 10,
    width: 34,
  },
  quickLabel: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
  },
  quickHelper: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  timeline: {
    gap: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineDot: {
    borderRadius: radius.pill,
    height: 12,
    marginTop: spacing.xs,
    width: 12,
  },
  timelineContent: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flex: 1,
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  timelineTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.black,
  },
  timelineMeta: {
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontWeight: typography.weights.bold,
  },
})
