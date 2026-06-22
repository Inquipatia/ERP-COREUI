import React, { useMemo } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CProgress,
  CRow,
} from '@coreui/react'
import { CChartBar, CChartDoughnut, CChartLine } from '@coreui/react-chartjs'

import { useAuth } from '../../../context/AuthContext'
import { mockClients } from '../../../data/mockClients'
import { mockDocuments } from '../../../data/mockDocuments'
import { mockMarketingMetrics } from '../../../data/mockMarketingMetrics'
import { mockMaterials } from '../../../data/mockMaterials'
import { mockProducts } from '../../../data/mockProducts'
import { mockQuotes } from '../../../data/mockQuotes'
import { mockUsers } from '../../../data/mockUsers'
import { STORAGE_KEYS, useLocalStorageState } from '../../../utils/storage'
import { normalizeDocument, parseDocumentDate, useDocumentStorage } from '../../../utils/documentStorage'
import { summarizeMovements } from '../../../utils/financeCalculations'
import { useFinanceMovements } from '../../../utils/financeStorage'
import { mockTenders, normalizeTender, TENDER_STORAGE_KEY } from '../../../utils/tenderStorage'
import { mockWorkOrders, normalizeWorkOrder, WORK_ORDER_STORAGE_KEY } from '../../../utils/workOrderStorage'

const USERS_STORAGE_KEY = STORAGE_KEYS.users || 'rubik.erp.users'

const CHART_COLORS = ['#3b82f6', '#7c3aed', '#16a34a', '#f59e0b', '#dc2626', '#0891b2', '#64748b']

const styles = {
  page: {
    background: '#0f172a',
    borderRadius: 24,
    margin: '-1rem',
    minHeight: 'calc(100vh - 2rem)',
    padding: '1rem',
  },
  hero: {
    background:
      'linear-gradient(135deg, rgba(17,24,39,0.98), rgba(30,41,59,0.96) 52%, rgba(29,78,216,0.72))',
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: 28,
    boxShadow: '0 24px 70px rgba(2,6,23,0.34)',
    color: '#f8fafc',
    overflow: 'hidden',
  },
  darkCard: {
    background: '#111827',
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: 22,
    boxShadow: '0 18px 44px rgba(2,6,23,0.28)',
    color: '#f8fafc',
  },
  lightCard: {
    border: '1px solid rgba(226,232,240,0.86)',
    borderRadius: 22,
    boxShadow: '0 16px 38px rgba(15,23,42,0.08)',
  },
  muted: { color: '#94a3b8' },
  timelineDot: {
    borderRadius: 999,
    flex: '0 0 12px',
    height: 12,
    marginTop: 5,
    width: 12,
  },
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const hiddenMoney = (canViewFinance, value) => (canViewFinance ? formatCurrency(value) : 'Oculto')

const formatDate = (date) => {
  if (!date) return '-'
  const parsedDate = parseDocumentDate(date)
  if (!parsedDate) return String(date)
  return new Intl.DateTimeFormat('es-CL').format(parsedDate)
}

const normalizeText = (value = '') =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const getNumberValue = (value) => Number(value) || 0

const normalizeClient = (client) => ({
  id: client.id || '',
  contact: client.contact || client.client || client.contactName || '',
  company: client.company || '',
  status: client.status || 'Activo',
})

const normalizeMaterial = (material) => ({
  id: material.id || '',
  name: material.name || '',
  status: material.status || 'Activo',
})

const normalizeProduct = (product) => ({
  id: product.id || '',
  name: product.name || '',
  status: product.status || 'Activo',
})

const normalizeQuote = (quote) => ({
  id: quote.id || '',
  quoteNumber: String(quote.quoteNumber || quote.number || ''),
  date: quote.date || quote.fecha || '',
  client: quote.client || quote.clientName || quote.cliente || '',
  company: quote.company || quote.empresa || '',
  seller: quote.seller || quote.vendedor || '',
  subject: quote.subject || quote.tema || '',
  net: getNumberValue(quote.net ?? quote.montoNeto ?? quote.netAmount ?? quote.amounts?.net),
  iva: getNumberValue(quote.iva ?? quote.taxAmount ?? quote.amounts?.iva),
  total: getNumberValue(quote.total ?? quote.totalAmount ?? quote.amounts?.total),
  status: quote.status || quote.estado || 'Borrador',
  createdAt: quote.createdAt || quote.date || quote.fecha || '',
})

const normalizeUser = (user) => ({
  id: user.id || '',
  name: user.name || '',
  email: user.email || '',
  role: user.role || '',
  status: user.status || 'Activo',
})

const aggregateBy = (collection, getKey, getValue = () => 1) =>
  collection.reduce((result, item) => {
    const key = getKey(item) || 'Sin clasificar'
    result[key] = (result[key] || 0) + getValue(item)
    return result
  }, {})

const getRecentMonths = (count = 6) => {
  const now = new Date()

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1)
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(date),
    }
  })
}

const getMonthKey = (date) =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : ''

const getDateFromValue = (value) => {
  const parsedDate = parseDocumentDate(value)
  if (parsedDate) return parsedDate

  const fallbackDate = new Date(value)
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate
}

const getStatusColor = (status = '') => {
  const normalizedStatus = normalizeText(status)
  if (
    ['activo', 'emitida', 'enviada', 'adjudicada', 'aprobada', 'finalizada', 'pagado', 'pagada'].some((item) =>
      normalizedStatus.includes(item),
    )
  ) {
    return 'success'
  }
  if (['borrador', 'pendiente', 'pausada', 'sin pagar', 'pago parcial'].some((item) => normalizedStatus.includes(item))) {
    return 'warning'
  }
  if (['proceso', 'revision', 'analisis', 'consultas', 'cotizando'].some((item) => normalizedStatus.includes(item))) {
    return 'info'
  }
  if (['rechazada', 'anulada', 'perdida', 'descartada', 'vencido'].some((item) => normalizedStatus.includes(item))) {
    return 'danger'
  }
  return 'secondary'
}

const getRiskColor = (risk = '') => {
  const normalizedRisk = normalizeText(risk)
  if (normalizedRisk.includes('critico')) return 'danger'
  if (normalizedRisk.includes('alto')) return 'warning'
  if (normalizedRisk.includes('medio')) return 'info'
  return 'success'
}

const getPriorityColor = (priority = '') => {
  const normalizedPriority = normalizeText(priority)
  if (normalizedPriority.includes('urgente')) return 'danger'
  if (normalizedPriority.includes('alta')) return 'warning'
  if (normalizedPriority.includes('media')) return 'info'
  return 'secondary'
}

const isWorkOrderOverdue = (order) => {
  if (!order.dueDate || ['Finalizada', 'Aprobada', 'Rechazada'].includes(order.status)) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(order.dueDate)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

const isTenderClosingSoon = (tender) => {
  const closingDate = getDateFromValue(tender.closingDate)
  if (!closingDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limitDate = new Date(today)
  limitDate.setDate(limitDate.getDate() + 10)
  return closingDate >= today && closingDate <= limitDate
}

const toDoughnutData = (entries, label) => ({
  labels: entries.map(([key]) => key),
  datasets: [
    {
      backgroundColor: entries.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
      borderColor: '#0f172a',
      data: entries.map(([, value]) => value),
      label,
    },
  ],
})

const KpiCard = ({ label, value, helper, color = '#3b82f6', dark = false }) => (
  <CCard className="h-100" style={dark ? styles.darkCard : styles.lightCard}>
    <CCardBody>
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div className={dark ? 'small text-white-50' : 'small text-body-secondary'}>{label}</div>
          <div className="fs-3 fw-bold mt-1" style={{ color: dark ? '#f8fafc' : '#0f172a' }}>
            {value}
          </div>
          {helper && <div className={dark ? 'small text-white-50' : 'small text-body-secondary'}>{helper}</div>}
        </div>
        <span
          aria-hidden="true"
          style={{
            background: color,
            borderRadius: 999,
            boxShadow: `0 0 0 8px ${color}22`,
            display: 'inline-block',
            height: 14,
            width: 14,
          }}
        />
      </div>
    </CCardBody>
  </CCard>
)

const QuickAction = ({ label, href, color = 'primary' }) => (
  <CButton color={color} className="rounded-pill px-4 py-2 fw-semibold" href={href}>
    {label}
  </CButton>
)

const TimelineItem = ({ title, subtitle, badge, color = 'primary', meta }) => (
  <div className="d-flex gap-3">
    <span style={{ ...styles.timelineDot, background: `var(--cui-${color})` }} />
    <div className="flex-grow-1 pb-3 border-bottom border-opacity-10">
      <div className="d-flex justify-content-between gap-3 flex-wrap">
        <div>
          <div className="fw-semibold">{title}</div>
          <div className="small text-body-secondary">{subtitle}</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {meta && <span className="small text-body-secondary">{meta}</span>}
          {badge && <CBadge color={color}>{badge}</CBadge>}
        </div>
      </div>
    </div>
  </div>
)

const DashboardERP = () => {
  const { hasPermission } = useAuth()
  const canViewFinance = hasPermission('finance.view')

  const [clients] = useLocalStorageState(STORAGE_KEYS.clients, mockClients.map(normalizeClient))
  const [materials] = useLocalStorageState(STORAGE_KEYS.materials, mockMaterials.map(normalizeMaterial))
  const [products] = useLocalStorageState(STORAGE_KEYS.products, mockProducts.map(normalizeProduct))
  const [quotes] = useLocalStorageState(STORAGE_KEYS.quotes, mockQuotes.map(normalizeQuote))
  const [users] = useLocalStorageState(USERS_STORAGE_KEY, mockUsers.map(normalizeUser))
  const [workOrders] = useLocalStorageState(WORK_ORDER_STORAGE_KEY, mockWorkOrders.map(normalizeWorkOrder))
  const [tenders] = useLocalStorageState(TENDER_STORAGE_KEY, mockTenders.map(normalizeTender))
  const [financeMovements] = useFinanceMovements()
  const [storedDocuments] = useDocumentStorage()

  const normalizedQuotes = useMemo(() => quotes.map(normalizeQuote), [quotes])
  const normalizedWorkOrders = useMemo(() => workOrders.map(normalizeWorkOrder), [workOrders])
  const normalizedTenders = useMemo(() => tenders.map(normalizeTender), [tenders])
  const documents = useMemo(() => {
    const normalizedStoredDocuments = storedDocuments.map(normalizeDocument)
    return normalizedStoredDocuments.length > 0 ? normalizedStoredDocuments : mockDocuments.map(normalizeDocument)
  }, [storedDocuments])

  const dashboardData = useMemo(() => {
    const recentMonths = getRecentMonths(6)
    const financeSummary = summarizeMovements(financeMovements)
    const normalizedFinanceMovements = Array.isArray(financeMovements) ? financeMovements : []
    const monthlyQuoteTotals = recentMonths.map((month) =>
      normalizedQuotes
        .filter((quote) => getMonthKey(parseDocumentDate(quote.date)) === month.key)
        .reduce((total, quote) => total + quote.total, 0),
    )
    const monthlyQuoteCounts = recentMonths.map(
      (month) => normalizedQuotes.filter((quote) => getMonthKey(parseDocumentDate(quote.date)) === month.key).length,
    )
    const totalQuoted = normalizedQuotes.reduce((total, quote) => total + quote.total, 0)
    const averageQuote = normalizedQuotes.length ? totalQuoted / normalizedQuotes.length : 0
    const activeQuotes = normalizedQuotes.filter(
      (quote) => !['Rechazada', 'Anulada', 'Cerrada'].includes(quote.status),
    )
    const documentsByStatus = Object.entries(aggregateBy(documents, (document) => document.estado))
    const documentsByType = Object.entries(aggregateBy(documents, (document) => document.tipoDocumento))
    const quotesByStatus = Object.entries(aggregateBy(normalizedQuotes, (quote) => quote.status))
    const workOrdersByStatus = Object.entries(aggregateBy(normalizedWorkOrders, (order) => order.status))
    const workOrdersByArea = Object.entries(aggregateBy(normalizedWorkOrders, (order) => order.targetArea))
    const ordersInReview = normalizedWorkOrders.filter((order) => normalizeText(order.status).includes('revision'))
    const pendingOrders = normalizedWorkOrders.filter((order) =>
      ['Borrador', 'Pendiente', 'Recibida', 'En proceso', 'Solicita antecedentes', 'En revision'].some((status) =>
        normalizeText(order.status).includes(normalizeText(status)),
      ),
    )
    const urgentOrders = normalizedWorkOrders.filter((order) => order.priority === 'Urgente')
    const overdueOrders = normalizedWorkOrders.filter(isWorkOrderOverdue)
    const tendersByRisk = Object.entries(aggregateBy(normalizedTenders, (tender) => tender.riskLevel))
    const activeTenders = normalizedTenders.filter(
      (tender) => !['Perdida', 'Descartada', 'Adjudicada'].includes(tender.status),
    )
    const closingSoonTenders = normalizedTenders.filter(isTenderClosingSoon)
    const upcomingTenders = [...normalizedTenders]
      .filter((tender) => {
        const closingDate = getDateFromValue(tender.closingDate)
        return closingDate && closingDate >= new Date()
      })
      .sort((firstTender, secondTender) => getDateFromValue(firstTender.closingDate) - getDateFromValue(secondTender.closingDate))
      .slice(0, 4)
    const documentsWithoutFiles = documents.filter((document) => !document.archivoPdfUrl && !document.archivoExcelUrl)
    const latestDocuments = [...documents]
      .sort((firstDocument, secondDocument) => {
        const firstDate = new Date(firstDocument.createdAt || firstDocument.updatedAt || firstDocument.fecha || 0).getTime()
        const secondDate = new Date(secondDocument.createdAt || secondDocument.updatedAt || secondDocument.fecha || 0).getTime()
        return secondDate - firstDate
      })
      .slice(0, 6)
    const latestWorkOrders = [...normalizedWorkOrders]
      .sort((firstOrder, secondOrder) => new Date(secondOrder.updatedAt || 0) - new Date(firstOrder.updatedAt || 0))
      .slice(0, 6)
    const topClients = Object.entries(
      aggregateBy(normalizedQuotes, (quote) => quote.company || quote.client, (quote) => quote.total),
    )
      .sort(([, firstValue], [, secondValue]) => secondValue - firstValue)
      .slice(0, 5)
    const topSellers = Object.entries(
      aggregateBy(normalizedQuotes, (quote) => quote.seller, (quote) => quote.total),
    )
      .sort(([, firstValue], [, secondValue]) => secondValue - firstValue)
      .slice(0, 5)
    const marketingChannels = mockMarketingMetrics.channels || []
    const monthlyIncome = recentMonths.map((month) =>
      normalizedFinanceMovements
        .filter((movement) => movement.type === 'Ingreso' && getMonthKey(getDateFromValue(movement.issueDate || movement.createdAt)) === month.key)
        .reduce((total, movement) => total + getNumberValue(movement.totalAmount), 0),
    )
    const monthlyExpenses = recentMonths.map((month) =>
      normalizedFinanceMovements
        .filter((movement) => movement.type === 'Egreso' && getMonthKey(getDateFromValue(movement.issueDate || movement.createdAt)) === month.key)
        .reduce((total, movement) => total + getNumberValue(movement.totalAmount), 0),
    )
    const monthlyActivity = recentMonths.map((month) => {
      const quoteCount = normalizedQuotes.filter((quote) => getMonthKey(parseDocumentDate(quote.date || quote.createdAt)) === month.key).length
      const documentCount = documents.filter((document) => getMonthKey(getDateFromValue(document.fecha || document.createdAt)) === month.key).length
      const orderCount = normalizedWorkOrders.filter((order) => getMonthKey(getDateFromValue(order.createdAt || order.updatedAt)) === month.key).length
      return quoteCount + documentCount + orderCount
    })

    return {
      activeQuotes,
      activeTenders,
      averageQuote,
      closingSoonTenders,
      documentsByStatus,
      documentsByType,
      documentsWithoutFiles,
      financeSummary,
      latestDocuments,
      latestWorkOrders,
      marketingChannels,
      monthlyActivity,
      monthlyExpenses,
      monthlyIncome,
      monthlyQuoteCounts,
      monthlyQuoteTotals,
      ordersInReview,
      overdueOrders,
      pendingOrders,
      quotesByStatus,
      recentMonths,
      tendersByRisk,
      topClients,
      topSellers,
      totalQuoted,
      upcomingTenders,
      urgentOrders,
      workOrdersByArea,
      workOrdersByStatus,
    }
  }, [documents, financeMovements, normalizedQuotes, normalizedTenders, normalizedWorkOrders])

  const maxTopClientTotal = Math.max(1, ...dashboardData.topClients.map(([, total]) => total))
  const maxTopSellerTotal = Math.max(1, ...dashboardData.topSellers.map(([, total]) => total))
  const criticalAlerts = [
    ...(dashboardData.financeSummary.overdue > 0 && canViewFinance
      ? [
          {
            id: 'finance-overdue',
            title: 'Pagos vencidos',
            text: `${dashboardData.financeSummary.overdue} movimientos financieros requieren gestion.`,
            color: 'danger',
          },
        ]
      : []),
    ...dashboardData.closingSoonTenders.slice(0, 1).map((tender) => ({
      id: `tender-${tender.id}`,
      title: 'Licitacion por cerrar',
      text: `${tender.title || tender.tenderId} cierra el ${formatDate(tender.closingDate)}.`,
      color: 'warning',
    })),
    ...(dashboardData.ordersInReview.length > 0
      ? [
          {
            id: 'orders-review',
            title: 'Ordenes en revision',
            text: `${dashboardData.ordersInReview.length} ordenes esperan aprobacion o feedback.`,
            color: 'info',
          },
        ]
      : []),
    ...(dashboardData.documentsWithoutFiles.length > 0
      ? [
          {
            id: 'documents-missing',
            title: 'Documentos sin archivo',
            text: `${dashboardData.documentsWithoutFiles.length} documentos no tienen PDF/Excel asociado.`,
            color: 'secondary',
          },
        ]
      : []),
    ...dashboardData.overdueOrders.map((order) => ({
      id: `order-${order.id}`,
      title: 'Orden vencida',
      text: `${order.title} vence o vencio el ${formatDate(order.dueDate)}`,
      color: 'danger',
    })),
  ].slice(0, 4)

  return (
    <div style={styles.page}>
      <CRow className="g-4">
        <CCol xs={12}>
          <CCard style={styles.hero}>
            <CCardBody className="p-4 p-lg-5">
              <CRow className="g-4 align-items-center">
                <CCol lg={7}>
                  <CBadge color="primary" className="rounded-pill px-3 py-2 mb-3">
                    ERP Rubik / Panel ejecutivo
                  </CBadge>
                  <h1 className="display-6 fw-bold mb-3">Control visual de ventas, documentos y operaciones</h1>
                  <p className="mb-4" style={styles.muted}>
                    Indicadores vivos desde localStorage/API temporal, respetando permisos y sin duplicar calculos financieros.
                  </p>
                  <div className="d-flex gap-2 flex-wrap">
                    <QuickAction label="Nueva cotizacion" href="#/cotizador-5000/nueva-cotizacion" color="primary" />
                    <QuickAction label="Nueva orden" href="#/erp/ordenes-trabajo" color="warning" />
                    <QuickAction label="Subir documento" href="#/erp/documentos" color="info" />
                    {canViewFinance && <QuickAction label="Registrar pago" href="#/erp/administracion/pagos" color="success" />}
                    <QuickAction label="Ver licitaciones" href="#/erp/licitaciones" color="secondary" />
                    <QuickAction label="Asistente IA" href="#/erp/asistente" color="dark" />
                  </div>
                </CCol>
                <CCol lg={5}>
                  <CRow className="g-3">
                    <CCol xs={6}>
                      <KpiCard dark label="Total cotizado" value={hiddenMoney(canViewFinance, dashboardData.totalQuoted)} helper="acumulado" color="#3b82f6" />
                    </CCol>
                    <CCol xs={6}>
                      <KpiCard dark label="Ticket promedio" value={hiddenMoney(canViewFinance, dashboardData.averageQuote)} helper="cotizaciones" color="#7c3aed" />
                    </CCol>
                    <CCol xs={6}>
                      <KpiCard dark label="Ordenes urgentes" value={dashboardData.urgentOrders.length} helper="prioridad alta" color="#dc2626" />
                    </CCol>
                    <CCol xs={6}>
                      <KpiCard dark label="Docs activos" value={documents.length} helper="centro documental" color="#16a34a" />
                    </CCol>
                  </CRow>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        {criticalAlerts.length > 0 && (
          <CCol xs={12}>
            <CRow className="g-3">
              {criticalAlerts.map((alert) => (
                <CCol md={6} xl={3} key={alert.id}>
                  <CAlert color={alert.color} className="h-100 mb-0 rounded-4 shadow-sm">
                    <div className="fw-bold">{alert.title}</div>
                    <div className="small">{alert.text}</div>
                  </CAlert>
                </CCol>
              ))}
            </CRow>
          </CCol>
        )}

        <CCol sm={6} xl={2}>
          <KpiCard label="Cotizaciones activas" value={dashboardData.activeQuotes.length} helper="en flujo comercial" color="#3b82f6" />
        </CCol>
        <CCol sm={6} xl={2}>
          <KpiCard label="Ordenes pendientes" value={dashboardData.pendingOrders.length} helper={`${dashboardData.ordersInReview.length} en revision`} color="#f59e0b" />
        </CCol>
        <CCol sm={6} xl={2}>
          <KpiCard label="Licitaciones vigentes" value={dashboardData.activeTenders.length} helper={`${dashboardData.closingSoonTenders.length} por cerrar`} color="#7c3aed" />
        </CCol>
        <CCol sm={6} xl={2}>
          <KpiCard
            label="Por cobrar"
            value={hiddenMoney(canViewFinance, dashboardData.financeSummary.receivable)}
            helper={canViewFinance ? 'desde Finanzas' : 'sin permiso financiero'}
            color="#16a34a"
          />
        </CCol>
        <CCol sm={6} xl={2}>
          <KpiCard label="Pagos vencidos" value={canViewFinance ? dashboardData.financeSummary.overdue : 'Oculto'} helper="alerta financiera" color="#dc2626" />
        </CCol>
        <CCol sm={6} xl={2}>
          <KpiCard label="Docs recientes" value={dashboardData.latestDocuments.length} helper={`${dashboardData.documentsWithoutFiles.length} sin archivo`} color="#0891b2" />
        </CCol>

        <CCol xl={8}>
          <CCard className="h-100" style={styles.lightCard}>
            <CCardBody>
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
                <div>
                  <h5 className="fw-bold mb-1">{canViewFinance ? 'Ingresos vs egresos' : 'Actividad mensual'}</h5>
                  <div className="text-body-secondary small">
                    {canViewFinance ? 'Movimientos financieros agrupados por periodo' : 'Vista operativa sin datos financieros'}
                  </div>
                </div>
                <CBadge color="primary" className="rounded-pill px-3 py-2">
                  {canViewFinance ? hiddenMoney(true, dashboardData.financeSummary.projectedFlow) : 'Operativo'}
                </CBadge>
              </div>
              {canViewFinance ? (
                <CChartBar
                  data={{
                    labels: dashboardData.recentMonths.map((month) => month.label),
                    datasets: [
                      {
                        label: 'Ingresos',
                        backgroundColor: '#16a34a',
                        borderRadius: 10,
                        data: dashboardData.monthlyIncome,
                      },
                      {
                        label: 'Egresos',
                        backgroundColor: '#dc2626',
                        borderRadius: 10,
                        data: dashboardData.monthlyExpenses,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.18)' } },
                      x: { grid: { display: false } },
                    },
                  }}
                  style={{ minHeight: 320 }}
                />
              ) : (
                <CChartLine
                  data={{
                    labels: dashboardData.recentMonths.map((month) => month.label),
                    datasets: [
                      {
                        label: 'Actividad',
                        backgroundColor: 'rgba(59,130,246,0.16)',
                        borderColor: '#3b82f6',
                        data: dashboardData.monthlyActivity,
                        fill: true,
                        tension: 0.38,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { y: { beginAtZero: true }, x: { grid: { display: false } } },
                  }}
                  style={{ minHeight: 320 }}
                />
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={4}>
          <CCard className="h-100" style={styles.lightCard}>
            <CCardBody>
              <h5 className="fw-bold mb-1">Documentos por estado</h5>
              <div className="text-body-secondary small mb-4">Badges y distribucion documental</div>
              {dashboardData.documentsByStatus.length === 0 ? (
                <CAlert color="info">Sin documentos para graficar.</CAlert>
              ) : (
                <CChartDoughnut
                  data={toDoughnutData(dashboardData.documentsByStatus, 'Documentos')}
                  options={{ plugins: { legend: { position: 'bottom' } } }}
                />
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={4}>
          <CCard className="h-100" style={styles.lightCard}>
            <CCardBody>
              <h5 className="fw-bold mb-1">Cotizaciones por estado</h5>
              <div className="text-body-secondary small mb-4">Donut comercial</div>
              {dashboardData.quotesByStatus.length === 0 ? (
                <CAlert color="info">Sin cotizaciones para graficar.</CAlert>
              ) : (
                <CChartDoughnut
                  data={toDoughnutData(dashboardData.quotesByStatus, 'Cotizaciones')}
                  options={{ plugins: { legend: { position: 'bottom' } } }}
                />
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={4}>
          <CCard className="h-100" style={styles.lightCard}>
            <CCardBody>
              <h5 className="fw-bold mb-1">Ordenes por etapa</h5>
              <div className="text-body-secondary small mb-4">Bar chart de flujo operativo</div>
              <CChartBar
                data={{
                  labels: dashboardData.workOrdersByStatus.map(([status]) => status),
                  datasets: [
                    {
                      backgroundColor: '#7c3aed',
                      borderRadius: 8,
                      data: dashboardData.workOrdersByStatus.map(([, count]) => count),
                      label: 'Ordenes',
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } },
                }}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={4}>
          <CCard className="h-100" style={styles.lightCard}>
            <CCardBody>
              <h5 className="fw-bold mb-1">Riesgo licitaciones</h5>
              <div className="text-body-secondary small mb-4">Priorizacion de postulacion</div>
              <CChartDoughnut
                data={toDoughnutData(dashboardData.tendersByRisk, 'Licitaciones')}
                options={{ plugins: { legend: { position: 'bottom' } } }}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={8}>
          <CCard className="h-100" style={styles.lightCard}>
            <CCardBody>
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
                <div>
                  <h5 className="fw-bold mb-1">
                    {canViewFinance ? 'Tendencia de ingresos' : 'Tendencia de actividad'}
                  </h5>
                  <div className="text-body-secondary small">
                    {canViewFinance
                      ? 'Linea mensual desde movimientos financieros'
                      : 'Linea mensual sin exponer montos sensibles'}
                  </div>
                </div>
                <CBadge color={canViewFinance ? 'success' : 'info'} className="rounded-pill px-3 py-2">
                  {canViewFinance ? 'Finanzas' : 'Operativo'}
                </CBadge>
              </div>
              <CChartLine
                data={{
                  labels: dashboardData.recentMonths.map((month) => month.label),
                  datasets: canViewFinance
                    ? [
                        {
                          label: 'Ingresos',
                          backgroundColor: 'rgba(22,163,74,0.16)',
                          borderColor: '#16a34a',
                          data: dashboardData.monthlyIncome,
                          fill: true,
                          tension: 0.38,
                        },
                        {
                          label: 'Actividad',
                          backgroundColor: 'rgba(59,130,246,0.08)',
                          borderColor: '#3b82f6',
                          data: dashboardData.monthlyActivity,
                          tension: 0.38,
                          yAxisID: 'activity',
                        },
                      ]
                    : [
                        {
                          label: 'Actividad',
                          backgroundColor: 'rgba(59,130,246,0.16)',
                          borderColor: '#3b82f6',
                          data: dashboardData.monthlyActivity,
                          fill: true,
                          tension: 0.38,
                        },
                      ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.18)' } },
                    activity: { beginAtZero: true, display: false },
                    x: { grid: { display: false } },
                  },
                }}
                style={{ minHeight: 300 }}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={6}>
          <CCard className="h-100" style={styles.darkCard}>
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">Actividad reciente</h5>
                  <div className="small text-white-50">Timeline documental y operativo</div>
                </div>
                <CBadge color="info">Live</CBadge>
              </div>
              <div className="d-flex flex-column gap-3">
                {dashboardData.latestDocuments.slice(0, 4).map((document) => (
                  <TimelineItem
                    key={document.id}
                    title={`${document.tipoDocumento} ${document.numeroDocumento}`}
                    subtitle={`${document.empresa || document.cliente || 'Sin cliente'} / ${document.vendedor || 'Sin vendedor'}`}
                    badge={document.estado}
                    color={getStatusColor(document.estado)}
                    meta={formatDate(document.fecha)}
                  />
                ))}
                {dashboardData.latestWorkOrders.slice(0, 3).map((order) => (
                  <TimelineItem
                    key={order.id}
                    title={order.title}
                    subtitle={`${order.sourceArea || 'Origen'} -> ${order.targetArea || 'Responsable'}`}
                    badge={order.priority}
                    color={getPriorityColor(order.priority)}
                    meta={formatDate(order.dueDate)}
                  />
                ))}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={6}>
          <CCard className="h-100" style={styles.lightCard}>
            <CCardBody>
              <h5 className="fw-bold mb-1">Ranking comercial</h5>
              <div className="text-body-secondary small mb-4">Clientes y vendedores por monto cotizado</div>
              <CRow className="g-4">
                <CCol md={6}>
                  <div className="fw-semibold mb-3">Top clientes</div>
                  <div className="d-flex flex-column gap-3">
                    {dashboardData.topClients.map(([client, total]) => (
                      <div key={client}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{client}</span>
                          <strong>{hiddenMoney(canViewFinance, total)}</strong>
                        </div>
                        <CProgress color="primary" value={canViewFinance ? (total / maxTopClientTotal) * 100 : 0} height={8} />
                      </div>
                    ))}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="fw-semibold mb-3">Top vendedores</div>
                  <div className="d-flex flex-column gap-3">
                    {dashboardData.topSellers.map(([seller, total]) => (
                      <div key={seller}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{seller}</span>
                          <strong>{hiddenMoney(canViewFinance, total)}</strong>
                        </div>
                        <CProgress color="success" value={canViewFinance ? (total / maxTopSellerTotal) * 100 : 0} height={8} />
                      </div>
                    ))}
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={7}>
          <CCard className="h-100" style={styles.lightCard}>
            <CCardBody>
              <h5 className="fw-bold mb-1">Marketing y redes sociales</h5>
              <div className="text-body-secondary small mb-4">Mock separado de contabilidad, listo para reemplazar</div>
              <CChartBar
                data={{
                  labels: dashboardData.marketingChannels.map((channel) => channel.name),
                  datasets: [
                    {
                      backgroundColor: '#16a34a',
                      borderRadius: 8,
                      data: dashboardData.marketingChannels.map((channel) => channel.leads),
                      label: 'Leads',
                    },
                    {
                      backgroundColor: '#3b82f6',
                      borderRadius: 8,
                      data: dashboardData.marketingChannels.map((channel) => channel.interactions),
                      label: 'Interacciones',
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { position: 'bottom' } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } },
                }}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={5}>
          <CCard className="h-100" style={styles.lightCard}>
            <CCardBody>
              <h5 className="fw-bold mb-1">Proximos cierres</h5>
              <div className="text-body-secondary small mb-4">Licitaciones abiertas o en analisis</div>
              {dashboardData.upcomingTenders.length === 0 ? (
                <CAlert color="info">Sin cierres proximos registrados.</CAlert>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {dashboardData.upcomingTenders.map((tender) => (
                    <div className="p-3 rounded-4 border" key={tender.id}>
                      <div className="d-flex justify-content-between gap-3">
                        <div className="fw-semibold">{tender.title}</div>
                        <CBadge color={getRiskColor(tender.riskLevel)}>{tender.riskLevel}</CBadge>
                      </div>
                      <div className="small text-body-secondary mt-1">{tender.buyer || 'Sin comprador'}</div>
                      <div className="small mt-2">Cierre: {formatDate(tender.closingDate)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard style={styles.lightCard}>
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                <div>
                  <h5 className="fw-bold mb-1">Mapa de modulos ERP</h5>
                  <div className="text-body-secondary small">Accesos grandes para operacion diaria</div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <CBadge color="primary">{clients.length} clientes</CBadge>
                  <CBadge color="info">{materials.length} materiales</CBadge>
                  <CBadge color="success">{products.length} productos</CBadge>
                  <CBadge color="secondary">{users.length} usuarios</CBadge>
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap mt-4">
                <QuickAction label="Clientes" href="#/erp/clientes" color="primary" />
                <QuickAction label="Productos" href="#/erp/productos-servicios" color="info" />
                <QuickAction label="Materiales" href="#/erp/materiales" color="secondary" />
                <QuickAction label="Licitaciones" href="#/erp/licitaciones" color="warning" />
                <QuickAction label="Asistente IA" href="#/erp/asistente" color="dark" />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default DashboardERP
