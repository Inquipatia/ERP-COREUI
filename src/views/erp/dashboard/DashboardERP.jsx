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
  CWidgetStatsA,
} from '@coreui/react'
import { CChartBar, CChartDoughnut, CChartLine, CChartPie } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilChartPie, cilDescription, cilPeople, cilSpeedometer } from '@coreui/icons'
import { mockDocuments } from '../../../data/mockDocuments'
import {
  getNumberValue,
  normalizeDocument,
  parseDocumentDate,
  useDocumentStorage,
} from '../../../utils/documentStorage'

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]
const CHART_COLORS = ['#3399ff', '#2eb85c', '#f9b115', '#e55353', '#6f42c1', '#39f', '#636f83']

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(getNumberValue(value))

const formatDate = (date) => {
  const parsedDate = parseDocumentDate(date)

  if (!parsedDate) {
    return date || '-'
  }

  return new Intl.DateTimeFormat('es-CL').format(parsedDate)
}

const getStatusColor = (status) => {
  if (status === 'Adjudicada' || status === 'Emitida') return 'success'
  if (status === 'Enviada') return 'info'
  if (status === 'Rechazada') return 'danger'
  if (status === 'Cerrada') return 'dark'
  return 'secondary'
}

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const getRecentMonths = (count) => {
  const now = new Date()

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1)

    return {
      key: getMonthKey(date),
      label: `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
    }
  })
}

const isSameMonth = (date, referenceDate) =>
  date &&
  date.getFullYear() === referenceDate.getFullYear() &&
  date.getMonth() === referenceDate.getMonth()

const isQuoteDocument = (document) => document.tipoDocumento === 'Cotización'

const sumDocuments = (documents, field = 'total') =>
  documents.reduce((total, document) => total + getNumberValue(document[field]), 0)

const aggregateDocuments = (documents, getKey, getValue = () => 1) =>
  documents.reduce((accumulator, document) => {
    const key = getKey(document) || 'Sin asignar'
    accumulator[key] = (accumulator[key] || 0) + getValue(document)
    return accumulator
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
  const [storedDocuments] = useDocumentStorage()

  const documents = useMemo(() => {
    const normalizedDocuments = storedDocuments.map(normalizeDocument)
    return normalizedDocuments.length > 0
      ? normalizedDocuments
      : mockDocuments.map(normalizeDocument)
  }, [storedDocuments])

  const dashboardData = useMemo(() => {
    const now = new Date()
    const quoteDocuments = documents.filter(isQuoteDocument)
    const currentMonthQuotes = quoteDocuments.filter((document) =>
      isSameMonth(parseDocumentDate(document.fecha), now),
    )
    const emittedQuotes = quoteDocuments.filter((document) =>
      ['Emitida', 'Enviada', 'Adjudicada'].includes(document.estado),
    )
    const draftQuotes = quoteDocuments.filter((document) => document.estado === 'Borrador')
    const recentMonths = getRecentMonths(6)

    const monthlyQuoteTotals = recentMonths.map((month) =>
      sumDocuments(
        quoteDocuments.filter((document) => {
          const date = parseDocumentDate(document.fecha)
          return date && getMonthKey(date) === month.key
        }),
      ),
    )
    const monthlyQuoteCounts = recentMonths.map(
      (month) =>
        quoteDocuments.filter((document) => {
          const date = parseDocumentDate(document.fecha)
          return date && getMonthKey(date) === month.key
        }).length,
    )

    const documentsByStatus = Object.entries(
      aggregateDocuments(documents, (document) => document.estado),
    )
    const documentsByType = Object.entries(
      aggregateDocuments(documents, (document) => document.tipoDocumento),
    )
    const sellerTotals = Object.entries(
      aggregateDocuments(
        quoteDocuments,
        (document) => document.vendedor,
        (document) => document.total,
      ),
    ).sort(([, firstValue], [, secondValue]) => secondValue - firstValue)
    const clientTotals = Object.entries(
      aggregateDocuments(
        quoteDocuments,
        (document) => document.empresa || document.cliente,
        (document) => document.total,
      ),
    )
      .sort(([, firstValue], [, secondValue]) => secondValue - firstValue)
      .slice(0, 5)
    const latestDocuments = [...documents]
      .sort((firstDocument, secondDocument) => {
        const firstDate = new Date(
          firstDocument.createdAt || firstDocument.updatedAt || 0,
        ).getTime()
        const secondDate = new Date(
          secondDocument.createdAt || secondDocument.updatedAt || 0,
        ).getTime()
        return secondDate - firstDate
      })
      .slice(0, 6)

    return {
      quoteDocuments,
      totalQuotedMonth: sumDocuments(currentMonthQuotes),
      emittedQuotes,
      draftQuotes,
      recentMonths,
      monthlyQuoteTotals,
      monthlyQuoteCounts,
      documentsByStatus,
      documentsByType,
      sellerTotals,
      clientTotals,
      latestDocuments,
    }
  }, [documents])

  const maxSellerTotal = Math.max(1, ...dashboardData.sellerTotals.map(([, total]) => total))
  const maxClientTotal = Math.max(1, ...dashboardData.clientTotals.map(([, total]) => total))

  return (
    <CRow className="g-4">
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <strong>Dashboard ERP</strong>{' '}
              <small>Indicadores comerciales y documentales Rubik Creaciones</small>
            </div>
            <CBadge color="primary">Documentos: {documents.length}</CBadge>
          </CCardHeader>
          <CCardBody>
            {storedDocuments.length === 0 && (
              <CAlert color="info" className="mb-4">
                Aun no hay documentos guardados. Se muestran datos mock para mantener el panel
                operativo.
              </CAlert>
            )}
            <CRow className="g-4">
              <CCol sm={6} xl={3}>
                <CWidgetStatsA
                  color="primary"
                  title="Total cotizado del mes"
                  value={formatCurrency(dashboardData.totalQuotedMonth)}
                  chart={
                    <CChartLine
                      className="mt-3 mx-3"
                      style={{ height: '70px' }}
                      data={{
                        labels: dashboardData.recentMonths.map((month) => month.label),
                        datasets: [
                          {
                            borderColor: 'rgba(255,255,255,.75)',
                            backgroundColor: 'transparent',
                            data: dashboardData.monthlyQuoteTotals,
                            tension: 0.35,
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false }, y: { display: false } },
                      }}
                    />
                  }
                />
              </CCol>
              <CCol sm={6} xl={3}>
                <CWidgetStatsA
                  color="info"
                  title="Cantidad de cotizaciones"
                  value={
                    <>
                      <CIcon icon={cilDescription} className="me-2" />
                      {dashboardData.quoteDocuments.length}
                    </>
                  }
                  chart={
                    <CChartBar
                      className="mt-3 mx-3"
                      style={{ height: '70px' }}
                      data={{
                        labels: dashboardData.recentMonths.map((month) => month.label),
                        datasets: [
                          {
                            backgroundColor: 'rgba(255,255,255,.65)',
                            data: dashboardData.monthlyQuoteCounts,
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false }, y: { display: false } },
                      }}
                    />
                  }
                />
              </CCol>
              <CCol sm={6} xl={3}>
                <CWidgetStatsA
                  color="success"
                  title="Cotizaciones emitidas"
                  value={
                    <>
                      <CIcon icon={cilSpeedometer} className="me-2" />
                      {dashboardData.emittedQuotes.length}
                    </>
                  }
                  chart={
                    <CChartLine
                      className="mt-3 mx-3"
                      style={{ height: '70px' }}
                      data={{
                        labels: dashboardData.recentMonths.map((month) => month.label),
                        datasets: [
                          {
                            borderColor: 'rgba(255,255,255,.75)',
                            backgroundColor: 'transparent',
                            data: dashboardData.monthlyQuoteCounts,
                            tension: 0.35,
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false }, y: { display: false } },
                      }}
                    />
                  }
                />
              </CCol>
              <CCol sm={6} xl={3}>
                <CWidgetStatsA
                  color="warning"
                  title="Cotizaciones en borrador"
                  value={
                    <>
                      <CIcon icon={cilPeople} className="me-2" />
                      {dashboardData.draftQuotes.length}
                    </>
                  }
                  chart={
                    <CChartBar
                      className="mt-3 mx-3"
                      style={{ height: '70px' }}
                      data={{
                        labels: dashboardData.recentMonths.map((month) => month.label),
                        datasets: [
                          {
                            backgroundColor: 'rgba(255,255,255,.65)',
                            data: dashboardData.monthlyQuoteTotals.map((value) =>
                              Math.round(value / 100000),
                            ),
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false }, y: { display: false } },
                      }}
                    />
                  }
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={6}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Monto cotizado por mes</strong>
          </CCardHeader>
          <CCardBody>
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
                    ticks: { callback: (value) => `$${Number(value).toLocaleString('es-CL')}` },
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
            <strong>Evolucion de cotizaciones</strong>
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
            <CChartDoughnut data={toChartDataset(dashboardData.documentsByStatus, 'Documentos')} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Distribucion por tipo</strong>
          </CCardHeader>
          <CCardBody>
            <CChartPie data={toChartDataset(dashboardData.documentsByType, 'Tipos')} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CCard className="h-100">
          <CCardHeader className="d-flex align-items-center gap-2">
            <CIcon icon={cilChartPie} />
            <strong>Documentos por estado</strong>
          </CCardHeader>
          <CCardBody>
            {dashboardData.documentsByStatus.map(([status, count]) => (
              <div className="d-flex align-items-center justify-content-between mb-3" key={status}>
                <span>{status}</span>
                <CBadge color={getStatusColor(status)}>{count}</CBadge>
              </div>
            ))}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={6}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Ventas / cotizaciones por vendedor</strong>
          </CCardHeader>
          <CCardBody>
            {dashboardData.sellerTotals.map(([seller, total]) => (
              <div className="mb-4" key={seller}>
                <div className="d-flex justify-content-between mb-2">
                  <span>{seller}</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
                <CProgress color="primary" value={(total / maxSellerTotal) * 100} />
              </div>
            ))}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={6}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Top clientes por monto cotizado</strong>
          </CCardHeader>
          <CCardBody>
            {dashboardData.clientTotals.map(([client, total], index) => (
              <div className="mb-4" key={client}>
                <div className="d-flex justify-content-between mb-2">
                  <span>
                    <CBadge color="secondary" className="me-2">
                      #{index + 1}
                    </CBadge>
                    {client}
                  </span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
                <CProgress color="success" value={(total / maxClientTotal) * 100} />
              </div>
            ))}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <strong>Ultimos documentos creados</strong>
          </CCardHeader>
          <CCardBody>
            <CTable responsive align="middle" hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Tipo</CTableHeaderCell>
                  <CTableHeaderCell>Numero</CTableHeaderCell>
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
                    <CTableDataCell>{formatCurrency(document.total)}</CTableDataCell>
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
    </CRow>
  )
}

export default DashboardERP
