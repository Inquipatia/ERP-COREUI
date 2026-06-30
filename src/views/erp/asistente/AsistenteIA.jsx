import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
} from '@coreui/react'
import { useAuth } from '../../../context/AuthContext'
import { post as apiPost } from '../../../services/apiClient'

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Todos', permission: 'ai.chat' },
  { value: 'quotes', label: 'Cotizaciones', permission: 'quotes.view' },
  { value: 'documents', label: 'Documentos', permission: 'documents.view' },
  { value: 'tenders', label: 'Licitaciones', permission: 'tenders.view' },
  { value: 'workOrders', label: 'Ordenes de trabajo', permission: 'workorders.view' },
  { value: 'finance', label: 'Finanzas', permission: 'finance.view' },
  { value: 'clients', label: 'Clientes', permission: 'clients.view' },
]

const SUGGESTED_QUESTIONS = [
  'Que cotizaciones estan pendientes de aprobacion?',
  'Que licitaciones tienen fechas proximas?',
  'Que ordenes de trabajo estan atrasadas?',
  'Que clientes tienen mas cotizaciones?',
  'Que documentos requieren seguimiento?',
  'Que informacion falta para postular esta licitacion?',
]

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return ''

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

const confidenceColor = {
  alta: 'success',
  media: 'warning',
  baja: 'secondary',
}

const getDocumentRoute = (document) => {
  if (document?.route) return `#${document.route}`

  const routesByScope = {
    quotes: '#/erp/cotizaciones',
    documents: '#/erp/documentos',
    tenders: '#/erp/licitaciones',
    workOrders: '#/erp/ordenes-trabajo',
    finance: '#/erp/administracion/finanzas',
    clients: '#/erp/clientes',
    suppliers: '#/erp/administracion/proveedores',
    materials: '#/erp/materiales',
    products: '#/erp/productos-servicios',
    users: '#/erp/usuarios',
  }

  return routesByScope[document?.scope] || ''
}

const SectionList = ({ title, items = [], emptyText }) => (
  <CCard className="h-100">
    <CCardHeader>
      <strong>{title}</strong>
    </CCardHeader>
    <CCardBody>
      {items.length > 0 ? (
        <ul className="mb-0 ps-3">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="mb-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-body-secondary">{emptyText}</div>
      )}
    </CCardBody>
  </CCard>
)

const RelatedDocumentCard = ({ document }) => {
  const route = getDocumentRoute(document)

  return (
    <CCol xs={12} md={6} xl={4}>
      <CCard className="h-100">
        <CCardBody>
          <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
            <div>
              <div className="fw-semibold">{document.title || 'Documento sin titulo'}</div>
              <div className="small text-body-secondary">{document.type || 'Documento'}</div>
            </div>
            {document.status && <CBadge color="primary">{document.status}</CBadge>}
          </div>

          <div className="small d-flex flex-column gap-1">
            {document.client && (
              <span>
                <strong>Cliente:</strong> {document.client}
              </span>
            )}
            {document.date && (
              <span>
                <strong>Fecha:</strong> {document.date}
              </span>
            )}
            {document.amount ? (
              <span>
                <strong>Monto:</strong> {formatCurrency(document.amount)}
              </span>
            ) : null}
          </div>

          {route && (
            <CButton color="secondary" variant="outline" size="sm" className="mt-3" href={route}>
              Abrir modulo
            </CButton>
          )}
        </CCardBody>
      </CCard>
    </CCol>
  )
}

const AssistantResponse = ({ result }) => {
  if (!result) return null

  return (
    <div className="mt-3">
      {result.permissionDenied && (
        <CAlert color="warning">
          Esta seccion esta restringida para perfiles autorizados.
        </CAlert>
      )}

      <CRow className="g-3">
        <CCol xs={12}>
          <CCard>
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <strong>Resumen</strong>
              <CBadge color={confidenceColor[result.confidence] || 'secondary'}>
                Confianza {result.confidence || 'baja'}
              </CBadge>
            </CCardHeader>
            <CCardBody>
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {result.answer || result.summary || 'Sin respuesta disponible.'}
              </p>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={4}>
          <SectionList
            title="Hallazgos importantes"
            items={result.importantFindings || []}
            emptyText="No se detectaron alertas criticas con los datos disponibles."
          />
        </CCol>
        <CCol xs={12} lg={4}>
          <SectionList
            title="Acciones sugeridas"
            items={result.suggestedActions || []}
            emptyText="No hay acciones sugeridas por ahora."
          />
        </CCol>
        <CCol xs={12} lg={4}>
          <SectionList
            title="Informacion faltante"
            items={result.missingInfo || []}
            emptyText="No se detecto informacion faltante relevante."
          />
        </CCol>

        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <strong>Documentos relacionados</strong>
            </CCardHeader>
            <CCardBody>
              {result.relatedDocuments?.length > 0 ? (
                <CRow className="g-3">
                  {result.relatedDocuments.map((document) => (
                    <RelatedDocumentCard
                      document={document}
                      key={`${document.scope}-${document.id}-${document.score}`}
                    />
                  ))}
                </CRow>
              ) : (
                <CAlert color="info" className="mb-0">
                  No se encontraron documentos relacionados en los modulos permitidos.
                </CAlert>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

const AsistenteIA = () => {
  const { currentUser, hasPermission } = useAuth()
  const canUseAssistant = hasPermission('ai.chat')
  const canViewFinance = hasPermission('finance.view') || hasPermission('ai.finance')
  const [message, setMessage] = useState('')
  const [scope, setScope] = useState('all')
  const [history, setHistory] = useState([])
  const [latestResult, setLatestResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emptyMessage, setEmptyMessage] = useState('')

  const allowedScopes = useMemo(
    () =>
      SCOPE_OPTIONS.filter((option) => {
        if (option.value === 'all') return canUseAssistant
        return hasPermission(option.permission)
      }),
    [canUseAssistant, hasPermission],
  )

  const submitQuestion = async (nextMessage = message) => {
    const trimmedMessage = nextMessage.trim()
    if (!trimmedMessage || loading) return

    if (!canUseAssistant) {
      setError('Tu perfil no tiene acceso al asistente IA.')
      return
    }

    setLoading(true)
    setError('')
    setEmptyMessage('')

    try {
      const result = await apiPost('/assistant/query', {
        message: trimmedMessage,
        scope,
        limit: 10,
      })

      setLatestResult(result)
      setHistory((current) => [
        { question: trimmedMessage, result, createdAt: new Date().toISOString() },
        ...current,
      ].slice(0, 6))
      setMessage('')

      if (!result?.relatedDocuments?.length) {
        setEmptyMessage('El asistente no encontro documentos relacionados para esa pregunta.')
      }
    } catch (requestError) {
      console.warn('No se pudo consultar el asistente desde la API.', requestError)
      setError(
        requestError.message ||
          'No se pudo conectar con la API del asistente. Intenta nuevamente en unos segundos.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      submitQuestion()
    }
  }

  return (
    <CRow className="g-4">
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Asistente IA Rubik</strong>{' '}
              <small>consulta documentos reales del ERP segun permisos</small>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color={canUseAssistant ? 'success' : 'danger'}>
                {canUseAssistant ? 'Activo' : 'Sin acceso'}
              </CBadge>
              <CBadge color={canViewFinance ? 'primary' : 'warning'}>
                {canViewFinance ? 'Finanzas disponibles' : 'Finanzas restringidas'}
              </CBadge>
            </div>
          </CCardHeader>

          <CCardBody>
            {!canUseAssistant && (
              <CAlert color="danger">
                Esta seccion esta restringida para perfiles autorizados.
              </CAlert>
            )}

            <CAlert color="info">
              El asistente consulta la API del ERP y no usa mocks como fuente principal. Si una
              respuesta queda incompleta, mostrara que informacion falta en vez de inventar datos.
            </CAlert>

            <CRow className="g-3 mb-4">
              <CCol md={4}>
                <CFormLabel>Usuario conectado</CFormLabel>
                <div className="border rounded p-3 h-100">
                  <div className="fw-semibold">{currentUser?.name || '-'}</div>
                  <div className="small text-body-secondary">{currentUser?.email || '-'}</div>
                  <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                    <CBadge color="primary">{currentUser?.role || 'Sin rol'}</CBadge>
                    <CBadge color="secondary">{currentUser?.area || 'Sin area'}</CBadge>
                  </div>
                </div>
              </CCol>

              <CCol md={8}>
                <CFormLabel>Alcance permitido</CFormLabel>
                <div className="border rounded p-3 h-100">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {allowedScopes.map((option) => (
                      <CBadge color="light" textColor="dark" key={option.value}>
                        {option.label}
                      </CBadge>
                    ))}
                  </div>
                </div>
              </CCol>
            </CRow>

            <CCard className="mb-4">
              <CCardHeader>
                <strong>Consulta</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol md={3}>
                    <CFormLabel>Alcance</CFormLabel>
                    <CFormSelect
                      value={scope}
                      onChange={(event) => setScope(event.target.value)}
                      disabled={!canUseAssistant || loading}
                    >
                      {allowedScopes.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol md={9}>
                    <CFormLabel>Pregunta</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>Consultar</CInputGroupText>
                      <CFormInput
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ej: Que cotizaciones estan pendientes de aprobacion?"
                        disabled={!canUseAssistant || loading}
                      />
                      <CButton
                        color="primary"
                        type="button"
                        onClick={() => submitQuestion()}
                        disabled={!canUseAssistant || loading || !message.trim()}
                      >
                        {loading ? (
                          <>
                            <CSpinner size="sm" className="me-2" />
                            Consultando
                          </>
                        ) : (
                          'Preguntar'
                        )}
                      </CButton>
                    </CInputGroup>
                    <div className="small text-body-secondary mt-2">
                      Tambien puedes usar Ctrl + Enter para enviar.
                    </div>
                  </CCol>

                  <CCol xs={12}>
                    <CFormLabel>Preguntas sugeridas</CFormLabel>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {SUGGESTED_QUESTIONS.map((question) => (
                        <CButton
                          color="secondary"
                          variant="outline"
                          size="sm"
                          type="button"
                          key={question}
                          onClick={() => {
                            setMessage(question)
                            submitQuestion(question)
                          }}
                          disabled={!canUseAssistant || loading}
                        >
                          {question}
                        </CButton>
                      ))}
                    </div>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>

            {error && <CAlert color="danger">{error}</CAlert>}
            {emptyMessage && !error && <CAlert color="warning">{emptyMessage}</CAlert>}
            {loading && (
              <CAlert color="info" className="d-flex align-items-center gap-2">
                <CSpinner size="sm" />
                Buscando en documentos, cotizaciones, licitaciones y modulos permitidos...
              </CAlert>
            )}

            <AssistantResponse result={latestResult} />

            {history.length > 0 && (
              <CCard className="mt-4">
                <CCardHeader>
                  <strong>Consultas recientes</strong>
                </CCardHeader>
                <CCardBody>
                  <div className="d-flex flex-column gap-2">
                    {history.map((entry) => (
                      <button
                        type="button"
                        className="btn btn-link text-start p-0"
                        key={`${entry.createdAt}-${entry.question}`}
                        onClick={() => setLatestResult(entry.result)}
                      >
                        {entry.question}
                      </button>
                    ))}
                  </div>
                </CCardBody>
              </CCard>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default AsistenteIA
