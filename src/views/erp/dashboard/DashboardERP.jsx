import React, { useMemo } from 'react'
import {
  CAlert,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { CChartBar, CChartDoughnut, CChartLine } from '@coreui/react-chartjs'

import { mockClients } from '../../../data/mockClients'
import { mockDocuments } from '../../../data/mockDocuments'
import { mockMarketingMetrics } from '../../../data/mockMarketingMetrics'
import { mockMaterials } from '../../../data/mockMaterials'
import { mockProducts } from '../../../data/mockProducts'
import { mockQuotes } from '../../../data/mockQuotes'
import { mockUsers } from '../../../data/mockUsers'
import { useAuth } from '../../../context/AuthContext'
import { STORAGE_KEYS, useLocalStorageState } from '../../../utils/storage'
import {
  normalizeDocument,
  parseDocumentDate,
  useDocumentStorage,
} from '../../../utils/documentStorage'
import {
  mockWorkOrders,
  normalizeWorkOrder,
  WORK_ORDER_STORAGE_KEY,
} from '../../../utils/workOrderStorage'
import { mockTenders, normalizeTender, TENDER_STORAGE_KEY } from '../../../utils/tenderStorage'

const USERS_STORAGE_KEY = STORAGE_KEYS.users || 'rubik.erp.users'

const CHART_COLORS = ['#3399ff', '#2eb85c', '#f9b115', '#e55353', '#6f42c1', '#39f', '#636f83']

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const formatPercent = (value) => `${Math.round(Number(value) || 0)}%`

const formatDate = (date) => {
  if (!date) return '-'

  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    return date
  }

  const parsedDate = parseDocumentDate(date)

  if (!parsedDate) {
    return date
  }

  return new Intl.DateTimeFormat('es-CL').format(parsedDate)
}

const getNumberValue = (value) => Number(value) || 0

const hasValue = (value) => String(value || '').trim().length > 0

const getStatusColor = (status) => {
  if (
    [
      'Activo',
      'Emitida',
      'Enviada',
      'Adjudicada',
      'Aprobada',
      'Finalizada',
      'Lista para ofertar',
      'Postulada',
    ].includes(status)
  )
    return 'success'
  if (['Borrador', 'Pendiente', 'En evaluación', 'Pausada'].includes(status)) return 'warning'
  if (['En proceso', 'En revisión', 'En análisis', 'Consultas', 'Cotizando'].includes(status))
    return 'info'
  if (['Rechazada', 'Anulada', 'Perdida', 'Descartada'].includes(status)) return 'danger'
  if (['Cerrada'].includes(status)) return 'dark'
  return 'secondary'
}

const getRiskColor = (riskLevel) => {
  if (riskLevel === 'Crítico') return 'danger'
  if (riskLevel === 'Alto') return 'warning'
  if (riskLevel === 'Medio') return 'info'
  return 'success'
}

const getPriorityColor = (priority) => {
  if (priority === 'Urgente') return 'danger'
  if (priority === 'Alta') return 'warning'
  if (priority === 'Media') return 'info'
  return 'secondary'
}

const normalizeClient = (client) => ({
  id: client.id || '',
  contact: client.contact || client.client || '',
  company: client.company || '',
  rut: client.rut || '',
  phone: client.phone || '',
  email: client.email || '',
  commune: client.commune || client.comuna || '',
  address: client.address || '',
  status: client.status || 'Activo',
})

const normalizeMaterial = (material) => ({
  id: material.id || '',
  name: material.name || '',
  category: material.category || '',
  unit: material.unit || '',
  baseCost: getNumberValue(material.baseCost),
  wastePercent: getNumberValue(material.wastePercent),
  marginPercent: getNumberValue(material.marginPercent),
  supplier: material.supplier || '',
  status: material.status || 'Activo',
})

const normalizeProduct = (product) => ({
  id: product.id || '',
  name: product.name || '',
  category: product.category || '',
  unit: product.unit || '',
  technicalDescription: product.technicalDescription || '',
  baseCost: getNumberValue(product.baseCost),
  suggestedPrice: getNumberValue(product.suggestedPrice),
  material: product.material || '',
  status: product.status || 'Activo',
})

const normalizeQuote = (quote) => ({
  id: quote.id || '',
  quoteNumber: String(quote.quoteNumber || quote.number || ''),
  date: quote.date || quote.fecha || '',
  client: quote.client || quote.clientName || quote.cliente || '',
  company: quote.company || quote.empresa || '',
  seller: quote.seller || quote.vendedor || '',
  net: getNumberValue(quote.net || quote.montoNeto || quote.amounts?.net),
  iva: getNumberValue(quote.iva || quote.amounts?.iva),
  total: getNumberValue(quote.total || quote.amounts?.total),
  status: quote.status || quote.estado || 'Borrador',
  items: Array.isArray(quote.items) ? quote.items : [],
})

const normalizeUser = (user) => ({
  id: user.id || '',
  name: user.name || '',
  email: user.email || '',
  role: user.role || '',
  status: user.status || 'Activo',
  position: user.position || user.cargo || '',
  area: user.area || '',
})

const getCompletionPercent = (fields) => {
  if (!fields.length) return 0
  return Math.round((fields.filter(hasValue).length / fields.length) * 100)
}

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

const getMonthKey = (date) => {
  if (!date) return ''

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const isSameMonth = (date, referenceDate) =>
  date &&
  date.getFullYear() === referenceDate.getFullYear() &&
  date.getMonth() === referenceDate.getMonth()

const isWorkOrderOverdue = (order) => {
  if (!order.dueDate || ['Finalizada', 'Aprobada', 'Rechazada'].includes(order.status)) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(order.dueDate)
  dueDate.setHours(0, 0, 0, 0)

  return dueDate < today
}

const getFutureDate = (date) => {
  if (!date) return null

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  parsedDate.setHours(0, 0, 0, 0)

  return parsedDate
}

const getWorkOrderCompletionPercent = (order) =>
  getCompletionPercent([
    order.title,
    order.type,
    order.requesterName,
    order.requesterEmail,
    order.assigneeName,
    order.assigneeEmail,
    order.sourceArea,
    order.targetArea,
    order.priority,
    order.status,
    order.description,
    order.requirements,
    order.deliverables,
  ])

const aggregateBy = (collection, getKey, getValue = () => 1) =>
  collection.reduce((result, item) => {
    const key = getKey(item) || 'Sin clasificar'
    result[key] = (result[key] || 0) + getValue(item)
    return result
  }, {})

const toChartDataset = (entries, label) => ({
  labels: entries.map(([key]) => key),
  datasets: [
    {
      label,
      backgroundColor: entries.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
      borderColor: entries.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
      data: entries.map(([, value]) => value),
    },
  ],
})

const DashboardERP = () => {
  const { hasPermission } = useAuth()
  const canViewFinance = hasPermission('finance.view')
  const [clients] = useLocalStorageState(STORAGE_KEYS.clients, mockClients.map(normalizeClient))
  const [materials] = useLocalStorageState(
    STORAGE_KEYS.materials,
    mockMaterials.map(normalizeMaterial),
  )
  const [products] = useLocalStorageState(STORAGE_KEYS.products, mockProducts.map(normalizeProduct))
  const [quotes] = useLocalStorageState(STORAGE_KEYS.quotes, mockQuotes.map(normalizeQuote))
  const [users] = useLocalStorageState(USERS_STORAGE_KEY, mockUsers.map(normalizeUser))
  const [workOrders] = useLocalStorageState(
    WORK_ORDER_STORAGE_KEY,
    mockWorkOrders.map(normalizeWorkOrder),
  )
  const [tenders] = useLocalStorageState(TENDER_STORAGE_KEY, mockTenders.map(normalizeTender))
  const [storedDocuments] = useDocumentStorage()

  const normalizedClients = useMemo(() => clients.map(normalizeClient), [clients])
  const normalizedMaterials = useMemo(() => materials.map(normalizeMaterial), [materials])
  const normalizedProducts = useMemo(() => products.map(normalizeProduct), [products])
  const normalizedQuotes = useMemo(() => quotes.map(normalizeQuote), [quotes])
  const normalizedUsers = useMemo(() => users.map(normalizeUser), [users])
  const normalizedWorkOrders = useMemo(() => workOrders.map(normalizeWorkOrder), [workOrders])
  const normalizedTenders = useMemo(() => tenders.map(normalizeTender), [tenders])

  const documents = useMemo(() => {
    const normalizedStoredDocuments = storedDocuments.map(normalizeDocument)

    return normalizedStoredDocuments.length > 0
      ? normalizedStoredDocuments
      : mockDocuments.map(normalizeDocument)
  }, [storedDocuments])

  const dashboardData = useMemo(() => {
    const now = new Date()
    const recentMonths = getRecentMonths(6)

    const activeClients = normalizedClients.filter((client) => client.status === 'Activo')
    const activeMaterials = normalizedMaterials.filter((material) => material.status === 'Activo')
    const activeProducts = normalizedProducts.filter((product) => product.status === 'Activo')
    const activeUsers = normalizedUsers.filter((user) => user.status === 'Activo')

    const quotesThisMonth = normalizedQuotes.filter((quote) =>
      isSameMonth(parseDocumentDate(quote.date), now),
    )
    const totalQuoted = normalizedQuotes.reduce((total, quote) => total + quote.total, 0)
    const totalQuotedMonth = quotesThisMonth.reduce((total, quote) => total + quote.total, 0)
    const averageQuote = normalizedQuotes.length > 0 ? totalQuoted / normalizedQuotes.length : 0

    const monthlyQuoteTotals = recentMonths.map((month) =>
      normalizedQuotes
        .filter((quote) => getMonthKey(parseDocumentDate(quote.date)) === month.key)
        .reduce((total, quote) => total + quote.total, 0),
    )

    const monthlyQuoteCounts = recentMonths.map(
      (month) =>
        normalizedQuotes.filter((quote) => getMonthKey(parseDocumentDate(quote.date)) === month.key)
          .length,
    )

    const documentsByStatus = Object.entries(aggregateBy(documents, (document) => document.estado))
    const documentsByType = Object.entries(
      aggregateBy(documents, (document) => document.tipoDocumento),
    )

    const quotesByStatus = Object.entries(aggregateBy(normalizedQuotes, (quote) => quote.status))

    const workOrderSummary = {
      total: normalizedWorkOrders.length,
      pending: normalizedWorkOrders.filter((order) =>
        ['Borrador', 'Pendiente'].includes(order.status),
      ).length,
      active: normalizedWorkOrders.filter((order) =>
        ['En proceso', 'En revisión'].includes(order.status),
      ).length,
      finished: normalizedWorkOrders.filter((order) =>
        ['Aprobada', 'Finalizada'].includes(order.status),
      ).length,
      urgent: normalizedWorkOrders.filter((order) => order.priority === 'Urgente').length,
      overdue: normalizedWorkOrders.filter(isWorkOrderOverdue).length,
      completion:
        normalizedWorkOrders.length > 0
          ? Math.round(
              normalizedWorkOrders.reduce(
                (total, order) => total + getWorkOrderCompletionPercent(order),
                0,
              ) / normalizedWorkOrders.length,
            )
          : 0,
    }

    const workOrdersByStatus = Object.entries(
      aggregateBy(normalizedWorkOrders, (order) => order.status),
    )
    const workOrdersByTargetArea = Object.entries(
      aggregateBy(normalizedWorkOrders, (order) => order.targetArea),
    )

    const tenderSummary = {
      total: normalizedTenders.length,
      inAnalysis: normalizedTenders.filter((tender) => tender.status === 'En análisis').length,
      ready: normalizedTenders.filter((tender) => tender.status === 'Lista para ofertar').length,
      discarded: normalizedTenders.filter((tender) =>
        ['Perdida', 'Descartada'].includes(tender.status),
      ).length,
      highRisk: normalizedTenders.filter((tender) => ['Alto', 'Crítico'].includes(tender.riskLevel))
        .length,
    }

    const tendersByRisk = Object.entries(
      aggregateBy(normalizedTenders, (tender) => tender.riskLevel),
    )

    const upcomingTenders = [...normalizedTenders]
      .filter((tender) => {
        const closingDate = getFutureDate(tender.closingDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        return closingDate && closingDate >= today
      })
      .sort((firstTender, secondTender) => {
        const firstClosingDate = getFutureDate(firstTender.closingDate)?.getTime() || 0
        const secondClosingDate = getFutureDate(secondTender.closingDate)?.getTime() || 0

        return firstClosingDate - secondClosingDate
      })
      .slice(0, 6)

    const latestWorkOrders = [...normalizedWorkOrders]
      .sort(
        (firstOrder, secondOrder) =>
          new Date(secondOrder.createdAt || secondOrder.updatedAt || 0).getTime() -
          new Date(firstOrder.createdAt || firstOrder.updatedAt || 0).getTime(),
      )
      .slice(0, 6)

    const materialCostCoverage =
      normalizedMaterials.length > 0
        ? Math.round(
            (normalizedMaterials.filter((material) => material.baseCost > 0).length /
              normalizedMaterials.length) *
              100,
          )
        : 0

    const productPriceCoverage =
      normalizedProducts.length > 0
        ? Math.round(
            (normalizedProducts.filter((product) => product.suggestedPrice > 0).length /
              normalizedProducts.length) *
              100,
          )
        : 0

    const userQuality =
      normalizedUsers.length > 0
        ? Math.round(
            normalizedUsers.reduce(
              (total, user) =>
                total +
                getCompletionPercent([user.name, user.email, user.role, user.position, user.area]),
              0,
            ) / normalizedUsers.length,
          )
        : 0

    const clientQuality =
      normalizedClients.length > 0
        ? Math.round(
            normalizedClients.reduce(
              (total, client) =>
                total +
                getCompletionPercent([
                  client.contact,
                  client.company,
                  client.rut,
                  client.phone,
                  client.email,
                  client.commune,
                ]),
              0,
            ) / normalizedClients.length,
          )
        : 0

    const moduleCounts = [
      ['Clientes', normalizedClients.length],
      ['Materiales', normalizedMaterials.length],
      ['Productos', normalizedProducts.length],
      ['Cotizaciones', normalizedQuotes.length],
      ['Documentos', documents.length],
      ['Licitaciones', normalizedTenders.length],
      ['Órdenes', normalizedWorkOrders.length],
      ['Usuarios', normalizedUsers.length],
    ]

    const topClients = Object.entries(
      aggregateBy(
        normalizedQuotes,
        (quote) => quote.company || quote.client,
        (quote) => quote.total,
      ),
    )
      .sort(([, firstValue], [, secondValue]) => secondValue - firstValue)
      .slice(0, 5)

    const topSellers = Object.entries(
      aggregateBy(
        normalizedQuotes,
        (quote) => quote.seller,
        (quote) => quote.total,
      ),
    )
      .sort(([, firstValue], [, secondValue]) => secondValue - firstValue)
      .slice(0, 5)

    const latestDocuments = [...documents]
      .sort((firstDocument, secondDocument) => {
        const firstDate = new Date(
          firstDocument.createdAt || firstDocument.updatedAt || firstDocument.fecha || 0,
        ).getTime()
        const secondDate = new Date(
          secondDocument.createdAt || secondDocument.updatedAt || secondDocument.fecha || 0,
        ).getTime()

        return secondDate - firstDate
      })
      .slice(0, 6)

    return {
      recentMonths,
      activeClients,
      activeMaterials,
      activeProducts,
      activeUsers,
      totalQuoted,
      totalQuotedMonth,
      averageQuote,
      monthlyQuoteTotals,
      monthlyQuoteCounts,
      documentsByStatus,
      documentsByType,
      quotesByStatus,
      workOrderSummary,
      workOrdersByStatus,
      workOrdersByTargetArea,
      tenderSummary,
      tendersByRisk,
      upcomingTenders,
      latestWorkOrders,
      materialCostCoverage,
      productPriceCoverage,
      userQuality,
      clientQuality,
      moduleCounts,
      topClients,
      topSellers,
      latestDocuments,
    }
  }, [
    normalizedClients,
    normalizedMaterials,
    normalizedProducts,
    normalizedQuotes,
    normalizedUsers,
    normalizedWorkOrders,
    normalizedTenders,
    documents,
  ])

  const maxTopClientTotal = Math.max(1, ...dashboardData.topClients.map(([, total]) => total))
  const maxTopSellerTotal = Math.max(1, ...dashboardData.topSellers.map(([, total]) => total))
  const marketingSummary = useMemo(() => {
    const campaigns = mockMarketingMetrics.campaigns || []
    const channels = mockMarketingMetrics.channels || []

    return {
      campaigns,
      channels,
      totalCampaigns: campaigns.length,
      totalLeads: channels.reduce((total, channel) => total + getNumberValue(channel.leads), 0),
      totalInteractions: channels.reduce(
        (total, channel) => total + getNumberValue(channel.interactions),
        0,
      ),
      averagePerformance:
        channels.length > 0
          ? Math.round(
              channels.reduce((total, channel) => total + getNumberValue(channel.performance), 0) /
                channels.length,
            )
          : 0,
    }
  }, [])

  return (
    <CRow className="g-4">
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Dashboard ERP</strong>{' '}
              <small>Control general comercial, documental y operativo</small>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">Documentos: {documents.length}</CBadge>
              <CBadge color="success">Cotizaciones: {normalizedQuotes.length}</CBadge>
              <CBadge color="danger">Licitaciones: {normalizedTenders.length}</CBadge>
              <CBadge color="warning">Órdenes: {normalizedWorkOrders.length}</CBadge>
              <CBadge color="info">Usuarios: {normalizedUsers.length}</CBadge>
            </div>
          </CCardHeader>

          <CCardBody>
            {storedDocuments.length === 0 && (
              <CAlert color="info" className="mb-4">
                Aún no hay documentos reales guardados. El panel usa documentos mock como referencia
                visual hasta que se generen cotizaciones desde el Cotizador 5000.
              </CAlert>
            )}

            {!canViewFinance && (
              <CAlert color="warning" className="mb-4">
                Las métricas financieras están ocultas para tu perfil.
              </CAlert>
            )}

            <CRow className="g-4">
              <CCol sm={6} xl={3}>
                <CCard className="h-100 border-0 bg-primary text-white">
                  <CCardBody>
                    <div className="small text-white-50">Total cotizado histórico</div>
                    <div className="fs-4 fw-semibold">
                      {canViewFinance ? formatCurrency(dashboardData.totalQuoted) : 'Oculto'}
                    </div>
                    <div className="small text-white-50">
                      Mes actual:{' '}
                      {canViewFinance ? formatCurrency(dashboardData.totalQuotedMonth) : 'Oculto'}
                    </div>
                    <CProgress className="mt-3" color="light" value={100} />
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol sm={6} xl={3}>
                <CCard className="h-100 border-0 bg-success text-white">
                  <CCardBody>
                    <div className="small text-white-50">Promedio por cotización</div>
                    <div className="fs-4 fw-semibold">
                      {canViewFinance ? formatCurrency(dashboardData.averageQuote) : 'Oculto'}
                    </div>
                    <div className="small text-white-50">
                      {normalizedQuotes.length} cotizaciones registradas
                    </div>
                    <CProgress className="mt-3" color="light" value={100} />
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol sm={6} xl={3}>
                <CCard className="h-100 border-0 bg-info text-white">
                  <CCardBody>
                    <div className="small text-white-50">Base comercial activa</div>
                    <div className="fs-4 fw-semibold">{dashboardData.activeClients.length}</div>
                    <div className="small text-white-50">
                      de {normalizedClients.length} clientes registrados
                    </div>
                    <CProgress
                      className="mt-3"
                      color="light"
                      value={
                        normalizedClients.length > 0
                          ? Math.round(
                              (dashboardData.activeClients.length / normalizedClients.length) * 100,
                            )
                          : 0
                      }
                    />
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol sm={6} xl={3}>
                <CCard className="h-100 border-0 bg-warning text-white">
                  <CCardBody>
                    <div className="small text-white-50">Usuarios activos</div>
                    <div className="fs-4 fw-semibold">{dashboardData.activeUsers.length}</div>
                    <div className="small text-white-50">
                      de {normalizedUsers.length} perfiles ERP
                    </div>
                    <CProgress
                      className="mt-3"
                      color="light"
                      value={
                        normalizedUsers.length > 0
                          ? Math.round(
                              (dashboardData.activeUsers.length / normalizedUsers.length) * 100,
                            )
                          : 0
                      }
                    />
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div>
            <h6 className="mb-0">Órdenes de trabajo</h6>
            <div className="small text-body-secondary">Control interno entre áreas operativas</div>
          </div>
          <CBadge color="secondary">{dashboardData.workOrderSummary.total} órdenes</CBadge>
        </div>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Total órdenes</div>
            <div className="fs-3 fw-semibold">{dashboardData.workOrderSummary.total}</div>
            <CProgress
              thin
              color="primary"
              value={dashboardData.workOrderSummary.total ? 100 : 0}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Pendientes</div>
            <div className="fs-3 fw-semibold">{dashboardData.workOrderSummary.pending}</div>
            <CProgress
              thin
              color="warning"
              value={
                dashboardData.workOrderSummary.total > 0
                  ? Math.round(
                      (dashboardData.workOrderSummary.pending /
                        dashboardData.workOrderSummary.total) *
                        100,
                    )
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">En proceso / revisión</div>
            <div className="fs-3 fw-semibold">{dashboardData.workOrderSummary.active}</div>
            <CProgress
              thin
              color="info"
              value={
                dashboardData.workOrderSummary.total > 0
                  ? Math.round(
                      (dashboardData.workOrderSummary.active /
                        dashboardData.workOrderSummary.total) *
                        100,
                    )
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Finalizadas / aprobadas</div>
            <div className="fs-3 fw-semibold">{dashboardData.workOrderSummary.finished}</div>
            <CProgress
              thin
              color="success"
              value={
                dashboardData.workOrderSummary.total > 0
                  ? Math.round(
                      (dashboardData.workOrderSummary.finished /
                        dashboardData.workOrderSummary.total) *
                        100,
                    )
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Urgentes / vencidas</div>
            <div className="fs-3 fw-semibold">
              {dashboardData.workOrderSummary.urgent} / {dashboardData.workOrderSummary.overdue}
            </div>
            <CProgress
              thin
              color={dashboardData.workOrderSummary.overdue > 0 ? 'danger' : 'warning'}
              value={
                dashboardData.workOrderSummary.total > 0
                  ? Math.round(
                      ((dashboardData.workOrderSummary.urgent +
                        dashboardData.workOrderSummary.overdue) /
                        dashboardData.workOrderSummary.total) *
                        100,
                    )
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Completitud ficha</div>
            <div className="fs-3 fw-semibold">
              {formatPercent(dashboardData.workOrderSummary.completion)}
            </div>
            <CProgress
              thin
              color={dashboardData.workOrderSummary.completion >= 75 ? 'success' : 'warning'}
              value={dashboardData.workOrderSummary.completion}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div>
            <h6 className="mb-0">Licitaciones</h6>
            <div className="small text-body-secondary">
              Resumen de análisis, riesgo y fechas de cierre
            </div>
          </div>
          <CBadge color="danger">{dashboardData.tenderSummary.total} licitaciones</CBadge>
        </div>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Total licitaciones</div>
            <div className="fs-3 fw-semibold">{dashboardData.tenderSummary.total}</div>
            <CProgress thin color="primary" value={dashboardData.tenderSummary.total ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">En análisis</div>
            <div className="fs-3 fw-semibold">{dashboardData.tenderSummary.inAnalysis}</div>
            <CProgress thin color="info" value={dashboardData.tenderSummary.total ? 70 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Listas para ofertar</div>
            <div className="fs-3 fw-semibold">{dashboardData.tenderSummary.ready}</div>
            <CProgress thin color="success" value={dashboardData.tenderSummary.total ? 65 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={2}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Descartadas</div>
            <div className="fs-3 fw-semibold">{dashboardData.tenderSummary.discarded}</div>
            <CProgress thin color="secondary" value={dashboardData.tenderSummary.total ? 35 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={4}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Riesgo alto / crítico</div>
            <div className="fs-3 fw-semibold">{dashboardData.tenderSummary.highRisk}</div>
            <CProgress
              thin
              color="warning"
              value={
                dashboardData.tenderSummary.total > 0
                  ? Math.round(
                      (dashboardData.tenderSummary.highRisk / dashboardData.tenderSummary.total) *
                        100,
                    )
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={3}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Materiales activos</div>
            <div className="fs-3 fw-semibold">{dashboardData.activeMaterials.length}</div>
            <div className="small text-body-secondary">
              {canViewFinance ? 'Cobertura costo base' : 'Costos ocultos'}
            </div>
            <CProgress
              color="success"
              value={canViewFinance ? dashboardData.materialCostCoverage : 0}
            />
            <div className="small text-body-secondary mt-1">
              {canViewFinance ? formatPercent(dashboardData.materialCostCoverage) : 'finance.view'}
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={3}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Productos / servicios activos</div>
            <div className="fs-3 fw-semibold">{dashboardData.activeProducts.length}</div>
            <div className="small text-body-secondary">
              {canViewFinance ? 'Cobertura precio sugerido' : 'Precios ocultos'}
            </div>
            <CProgress
              color="info"
              value={canViewFinance ? dashboardData.productPriceCoverage : 0}
            />
            <div className="small text-body-secondary mt-1">
              {canViewFinance ? formatPercent(dashboardData.productPriceCoverage) : 'finance.view'}
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={3}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Calidad base clientes</div>
            <div className="fs-3 fw-semibold">{formatPercent(dashboardData.clientQuality)}</div>
            <div className="small text-body-secondary">contacto, empresa, RUT, email y comuna</div>
            <CProgress
              color={dashboardData.clientQuality >= 70 ? 'success' : 'warning'}
              value={dashboardData.clientQuality}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={3}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Calidad perfiles usuarios</div>
            <div className="fs-3 fw-semibold">{formatPercent(dashboardData.userQuality)}</div>
            <div className="small text-body-secondary">nombre, email, rol, cargo y área</div>
            <CProgress
              color={dashboardData.userQuality >= 70 ? 'success' : 'warning'}
              value={dashboardData.userQuality}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={7}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Monto cotizado por mes</strong>{' '}
            <small>Evolución comercial de los últimos 6 meses</small>
          </CCardHeader>
          <CCardBody>
            {canViewFinance ? (
              <CChartBar
                data={{
                  labels: dashboardData.recentMonths.map((month) => month.label),
                  datasets: [
                    {
                      label: 'Monto cotizado',
                      backgroundColor: '#3399ff',
                      data: dashboardData.monthlyQuoteTotals,
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      ticks: {
                        callback: (value) => `$${Number(value).toLocaleString('es-CL')}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <CAlert color="warning" className="mb-0">
                Gráfico financiero oculto para tu perfil.
              </CAlert>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={5}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Cantidad de cotizaciones</strong> <small>Frecuencia mensual</small>
          </CCardHeader>
          <CCardBody>
            <CChartLine
              data={{
                labels: dashboardData.recentMonths.map((month) => month.label),
                datasets: [
                  {
                    label: 'Cotizaciones',
                    backgroundColor: 'rgba(46, 184, 92, .15)',
                    borderColor: '#2eb85c',
                    pointBackgroundColor: '#2eb85c',
                    data: dashboardData.monthlyQuoteCounts,
                    fill: true,
                    tension: 0.35,
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                    },
                  },
                },
              }}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Documentos por estado</strong>
          </CCardHeader>
          <CCardBody>
            {dashboardData.documentsByStatus.length === 0 ? (
              <CAlert color="info" className="mb-0">
                No hay estados documentales para mostrar.
              </CAlert>
            ) : (
              <CChartDoughnut
                data={toChartDataset(dashboardData.documentsByStatus, 'Documentos')}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Documentos por tipo</strong>
          </CCardHeader>
          <CCardBody>
            {dashboardData.documentsByType.length === 0 ? (
              <CAlert color="info" className="mb-0">
                No hay tipos documentales para mostrar.
              </CAlert>
            ) : (
              <CChartDoughnut
                data={toChartDataset(dashboardData.documentsByType, 'Tipos')}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Estado de cotizaciones</strong>
          </CCardHeader>
          <CCardBody>
            {dashboardData.quotesByStatus.length === 0 ? (
              <CAlert color="info" className="mb-0">
                No hay cotizaciones para clasificar.
              </CAlert>
            ) : (
              <div className="d-flex flex-column gap-3">
                {dashboardData.quotesByStatus.map(([status, count]) => {
                  const percent =
                    normalizedQuotes.length > 0
                      ? Math.round((count / normalizedQuotes.length) * 100)
                      : 0

                  return (
                    <div key={status}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <CBadge color={getStatusColor(status)}>{status}</CBadge>
                        <span className="small text-body-secondary">
                          {count} / {normalizedQuotes.length}
                        </span>
                      </div>
                      <CProgress color={getStatusColor(status)} value={percent} />
                    </div>
                  )
                })}
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Órdenes por estado</strong>
          </CCardHeader>
          <CCardBody>
            {dashboardData.workOrdersByStatus.length === 0 ? (
              <CAlert color="info" className="mb-0">
                No hay órdenes internas para clasificar.
              </CAlert>
            ) : (
              <CChartDoughnut
                data={toChartDataset(dashboardData.workOrdersByStatus, 'Órdenes')}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Órdenes por área responsable</strong>
          </CCardHeader>
          <CCardBody>
            {dashboardData.workOrdersByTargetArea.length === 0 ? (
              <CAlert color="info" className="mb-0">
                No hay áreas responsables para graficar.
              </CAlert>
            ) : (
              <CChartBar
                data={toChartDataset(dashboardData.workOrdersByTargetArea, 'Órdenes')}
                options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Licitaciones por riesgo</strong>
          </CCardHeader>
          <CCardBody>
            {dashboardData.tendersByRisk.length === 0 ? (
              <CAlert color="info" className="mb-0">
                No hay riesgos de licitación para mostrar.
              </CAlert>
            ) : (
              <CChartDoughnut
                data={toChartDataset(dashboardData.tendersByRisk, 'Licitaciones')}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={8}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Próximas fechas de cierre</strong>{' '}
            <small>Licitaciones abiertas ordenadas por cierre</small>
          </CCardHeader>
          <CCardBody>
            {dashboardData.upcomingTenders.length === 0 ? (
              <CAlert color="info" className="mb-0">
                No hay cierres próximos registrados.
              </CAlert>
            ) : (
              <CTable responsive align="middle" hover>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Licitación</CTableHeaderCell>
                    <CTableHeaderCell>Comprador</CTableHeaderCell>
                    <CTableHeaderCell>Cierre</CTableHeaderCell>
                    <CTableHeaderCell>Riesgo</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {dashboardData.upcomingTenders.map((tender) => (
                    <CTableRow key={tender.id}>
                      <CTableDataCell>
                        <div className="fw-semibold">{tender.title}</div>
                        <div className="text-body-secondary small">{tender.tenderId || '-'}</div>
                      </CTableDataCell>
                      <CTableDataCell>{tender.buyer || '-'}</CTableDataCell>
                      <CTableDataCell>{formatDate(tender.closingDate)}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getRiskColor(tender.riskLevel)}>{tender.riskLevel}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(tender.status)}>{tender.status}</CBadge>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={6}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Distribución de módulos</strong>{' '}
            <small>Volumen de registros por área ERP</small>
          </CCardHeader>
          <CCardBody>
            <CChartBar
              data={{
                labels: dashboardData.moduleCounts.map(([module]) => module),
                datasets: [
                  {
                    label: 'Registros',
                    backgroundColor: '#6f42c1',
                    data: dashboardData.moduleCounts.map(([, count]) => count),
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                    },
                  },
                },
              }}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={6}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Ranking comercial</strong>{' '}
            <small>Clientes y vendedores con mayor monto cotizado</small>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-4">
              <CCol md={6}>
                <div className="fw-semibold mb-3">Top clientes</div>
                {dashboardData.topClients.length === 0 ? (
                  <CAlert color="info">Sin clientes cotizados.</CAlert>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {dashboardData.topClients.map(([client, total]) => (
                      <div key={client}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{client}</span>
                          <strong>{canViewFinance ? formatCurrency(total) : 'Oculto'}</strong>
                        </div>
                        <CProgress
                          color="primary"
                          value={canViewFinance ? (total / maxTopClientTotal) * 100 : 0}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CCol>

              <CCol md={6}>
                <div className="fw-semibold mb-3">Top vendedores</div>
                {dashboardData.topSellers.length === 0 ? (
                  <CAlert color="info">Sin vendedores cotizados.</CAlert>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {dashboardData.topSellers.map(([seller, total]) => (
                      <div key={seller}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{seller}</span>
                          <strong>{canViewFinance ? formatCurrency(total) : 'Oculto'}</strong>
                        </div>
                        <CProgress
                          color="success"
                          value={canViewFinance ? (total / maxTopSellerTotal) * 100 : 0}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <strong>Últimos documentos creados</strong> <small>Actividad documental reciente</small>
          </CCardHeader>
          <CCardBody>
            <CTable responsive align="middle" hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Tipo</CTableHeaderCell>
                  <CTableHeaderCell>N° documento</CTableHeaderCell>
                  <CTableHeaderCell>Fecha</CTableHeaderCell>
                  <CTableHeaderCell>Cliente</CTableHeaderCell>
                  <CTableHeaderCell>Vendedor</CTableHeaderCell>
                  <CTableHeaderCell>Total</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {dashboardData.latestDocuments.map((document) => (
                  <CTableRow key={document.id}>
                    <CTableDataCell>{document.tipoDocumento}</CTableDataCell>
                    <CTableDataCell className="fw-semibold">
                      {document.numeroDocumento}
                    </CTableDataCell>
                    <CTableDataCell>{formatDate(document.fecha)}</CTableDataCell>
                    <CTableDataCell>
                      <div className="fw-semibold">{document.cliente}</div>
                      <div className="text-body-secondary small">{document.empresa}</div>
                    </CTableDataCell>
                    <CTableDataCell>{document.vendedor}</CTableDataCell>
                    <CTableDataCell>
                      {canViewFinance ? formatCurrency(document.total) : 'Oculto'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={getStatusColor(document.estado)}>{document.estado}</CBadge>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <strong>Últimas órdenes de trabajo</strong>{' '}
            <small>Actividad interna reciente por área responsable</small>
          </CCardHeader>
          <CCardBody>
            {dashboardData.latestWorkOrders.length === 0 ? (
              <CAlert color="info" className="mb-0">
                No hay órdenes de trabajo registradas todavía.
              </CAlert>
            ) : (
              <CTable responsive align="middle" hover>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Orden</CTableHeaderCell>
                    <CTableHeaderCell>Flujo</CTableHeaderCell>
                    <CTableHeaderCell>Responsable</CTableHeaderCell>
                    <CTableHeaderCell>Entrega</CTableHeaderCell>
                    <CTableHeaderCell>Prioridad</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {dashboardData.latestWorkOrders.map((order) => (
                    <CTableRow key={order.id}>
                      <CTableDataCell>
                        <div className="fw-semibold">{order.title}</div>
                        <div className="text-body-secondary small">{order.type}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        {order.sourceArea} → {order.targetArea}
                      </CTableDataCell>
                      <CTableDataCell>
                        <div>{order.assigneeName}</div>
                        <div className="text-body-secondary small">{order.assigneeRole}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        {formatDate(order.dueDate)}
                        {isWorkOrderOverdue(order) && (
                          <CBadge color="danger" className="ms-2">
                            Vencida
                          </CBadge>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getPriorityColor(order.priority)}>{order.priority}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(order.status)}>{order.status}</CBadge>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div>
            <h6 className="mb-0">Marketing y redes sociales</h6>
            <div className="small text-body-secondary">
              Métricas visuales mock separadas de finanzas, listas para reemplazar por datos reales
            </div>
          </div>
          <CBadge color="info">Mock reemplazable</CBadge>
        </div>
      </CCol>

      <CCol sm={6} xl={3}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Campañas</div>
            <div className="fs-3 fw-semibold">{marketingSummary.totalCampaigns}</div>
            <div className="small text-body-secondary">activas, planificadas o en evaluación</div>
            <CProgress thin color="primary" value={marketingSummary.totalCampaigns ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={3}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Leads</div>
            <div className="fs-3 fw-semibold">{marketingSummary.totalLeads}</div>
            <div className="small text-body-secondary">prospectos captados por canal</div>
            <CProgress thin color="success" value={Math.min(marketingSummary.totalLeads, 100)} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={3}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Interacciones</div>
            <div className="fs-3 fw-semibold">
              {marketingSummary.totalInteractions.toLocaleString('es-CL')}
            </div>
            <div className="small text-body-secondary">alcance social acumulado</div>
            <CProgress thin color="info" value={85} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol sm={6} xl={3}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Rendimiento canal</div>
            <div className="fs-3 fw-semibold">
              {formatPercent(marketingSummary.averagePerformance)}
            </div>
            <div className="small text-body-secondary">promedio visual de campañas</div>
            <CProgress thin color="warning" value={marketingSummary.averagePerformance} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={7}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Rendimiento por canal</strong> <small>Leads e interacciones digitales</small>
          </CCardHeader>
          <CCardBody>
            <CChartBar
              data={{
                labels: marketingSummary.channels.map((channel) => channel.name),
                datasets: [
                  {
                    label: 'Leads',
                    backgroundColor: '#2eb85c',
                    data: marketingSummary.channels.map((channel) => channel.leads),
                  },
                  {
                    label: 'Interacciones',
                    backgroundColor: '#3399ff',
                    data: marketingSummary.channels.map((channel) => channel.interactions),
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                    },
                  },
                },
              }}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={5}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Campañas recientes</strong>
          </CCardHeader>
          <CCardBody>
            <CTable responsive align="middle" hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Campaña</CTableHeaderCell>
                  <CTableHeaderCell>Canal</CTableHeaderCell>
                  <CTableHeaderCell>Leads</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {marketingSummary.campaigns.map((campaign) => (
                  <CTableRow key={campaign.id}>
                    <CTableDataCell>
                      <div className="fw-semibold">{campaign.name}</div>
                      <div className="text-body-secondary small">
                        Rendimiento {formatPercent(campaign.performance)}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>{campaign.channel}</CTableDataCell>
                    <CTableDataCell>{campaign.leads}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={campaign.status === 'Activa' ? 'success' : 'secondary'}>
                        {campaign.status}
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default DashboardERP
