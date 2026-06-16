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
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import { useAuth } from '../../../context/AuthContext'
import { readStorage, STORAGE_KEYS } from '../../../utils/storage'
import { answerAssistantQuestion } from '../../../utils/assistantEngine'

const WORK_ORDER_STORAGE_KEY = 'rubik.erp.workOrders'
const TENDER_STORAGE_KEY = 'rubik.erp.tenders'

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Todo lo permitido', permission: 'ai.chat' },
  { value: 'tenders', label: 'Licitaciones', permission: 'tenders.view' },
  { value: 'documents', label: 'Documentos', permission: 'documents.view' },
  { value: 'quotes', label: 'Cotizaciones', permission: 'quotes.view' },
  { value: 'workorders', label: 'Órdenes de trabajo', permission: 'workorders.view' },
  { value: 'clients', label: 'Clientes', permission: 'clients.view' },
  { value: 'materials', label: 'Materiales', permission: 'materials.view' },
  { value: 'products', label: 'Productos / Servicios', permission: 'products.view' },
]

const FINANCE_WORDS = [
  'finanza',
  'finanzas',
  'margen',
  'márgen',
  'utilidad',
  'ganancia',
  'costo',
  'costos',
  'presupuesto',
  'valor',
  'precio',
  'neto',
  'iva',
  'total',
  'factura',
  'pago',
]

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const safeArray = (value) => (Array.isArray(value) ? value : [])

const stringifySafe = (value) => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(' | ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const hasFinanceIntent = (question) => {
  const text = normalizeText(question)
  return FINANCE_WORDS.some((word) => text.includes(normalizeText(word)))
}

const buildSearchText = (record) =>
  Object.entries(record || {})
    .filter(([, value]) => typeof value !== 'function')
    .map(([key, value]) => `${key}: ${stringifySafe(value)}`)
    .join('\n')

const getScore = (text, question) => {
  const normalizedText = normalizeText(text)
  const words = normalizeText(question)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3)

  if (words.length === 0) return 0

  return words.reduce((score, word) => {
    if (normalizedText.includes(word)) return score + 1
    return score
  }, 0)
}

const stripFinanceFields = (record) => {
  const blockedKeys = [
    'budget',
    'total',
    'net',
    'iva',
    'amount',
    'price',
    'cost',
    'baseCost',
    'suggestedPrice',
    'margin',
    'marginPercent',
    'utility',
    'profit',
    'paymentTerms',
  ]

  return Object.fromEntries(
    Object.entries(record || {}).filter(([key]) => {
      const normalizedKey = normalizeText(key)
      return !blockedKeys.some((blockedKey) => normalizedKey.includes(normalizeText(blockedKey)))
    }),
  )
}

const getCollectionData = ({ key, fallback = [], canViewFinance = false }) => {
  const stored = readStorage(key, fallback)
  const list = safeArray(stored)

  if (canViewFinance) return list

  return list.map(stripFinanceFields)
}

const getKnowledgeBase = ({ hasPermission, canViewFinance }) => {
  const collections = []

  if (hasPermission('tenders.view')) {
    collections.push({
      scope: 'tenders',
      label: 'Licitaciones',
      items: getCollectionData({
        key: TENDER_STORAGE_KEY,
        canViewFinance,
      }),
    })
  }

  if (hasPermission('documents.view')) {
    collections.push({
      scope: 'documents',
      label: 'Documentos',
      items: getCollectionData({
        key: STORAGE_KEYS.documents,
        canViewFinance,
      }),
    })
  }

  if (hasPermission('quotes.view')) {
    collections.push({
      scope: 'quotes',
      label: 'Cotizaciones',
      items: getCollectionData({
        key: STORAGE_KEYS.quotes,
        canViewFinance,
      }),
    })
  }

  if (hasPermission('workorders.view')) {
    collections.push({
      scope: 'workorders',
      label: 'Órdenes de trabajo',
      items: getCollectionData({
        key: WORK_ORDER_STORAGE_KEY,
        canViewFinance,
      }),
    })
  }

  if (hasPermission('clients.view')) {
    collections.push({
      scope: 'clients',
      label: 'Clientes',
      items: getCollectionData({
        key: STORAGE_KEYS.clients,
        canViewFinance,
      }),
    })
  }

  if (hasPermission('materials.view')) {
    collections.push({
      scope: 'materials',
      label: 'Materiales',
      items: getCollectionData({
        key: STORAGE_KEYS.materials,
        canViewFinance,
      }),
    })
  }

  if (hasPermission('products.view')) {
    collections.push({
      scope: 'products',
      label: 'Productos / Servicios',
      items: getCollectionData({
        key: STORAGE_KEYS.products,
        canViewFinance,
      }),
    })
  }

  return collections
}

const getRecordTitle = (record, fallback = 'Registro') =>
  record.title ||
  record.name ||
  record.quoteNumber ||
  record.tenderId ||
  record.client ||
  record.company ||
  record.email ||
  fallback

const buildAnswer = ({ question, matches, canViewFinance }) => {
  if (matches.length === 0) {
    return {
      answer:
        'No encontré información suficiente en los módulos permitidos para responder esa consulta. Prueba con una pregunta más específica o revisa si el documento fue guardado en el ERP.',
      sources: [],
    }
  }

  const topMatches = matches.slice(0, 5)

  const lines = topMatches.map((match, index) => {
    const record = match.record
    const title = getRecordTitle(record, `Resultado ${index + 1}`)

    const usefulFields = [
      record.tenderId ? `ID licitación: ${record.tenderId}` : '',
      record.buyer ? `Comprador: ${record.buyer}` : '',
      record.status ? `Estado: ${record.status}` : '',
      record.riskLevel ? `Riesgo: ${record.riskLevel}` : '',
      record.closingDate ? `Cierre: ${record.closingDate}` : '',
      record.client ? `Cliente: ${record.client}` : '',
      record.company ? `Empresa: ${record.company}` : '',
      record.assigneeName ? `Asignado a: ${record.assigneeName}` : '',
      record.dueDate ? `Entrega: ${record.dueDate}` : '',
      canViewFinance && record.budget ? `Presupuesto: ${formatCurrency(record.budget)}` : '',
      canViewFinance && record.total ? `Total: ${formatCurrency(record.total)}` : '',
      record.summary ? `Resumen: ${String(record.summary).slice(0, 500)}` : '',
      record.description ? `Descripción: ${String(record.description).slice(0, 500)}` : '',
      safeArray(record.risks).length ? `Riesgos: ${record.risks.slice(0, 4).join('; ')}` : '',
      safeArray(record.requiredDocuments).length
        ? `Documentos: ${record.requiredDocuments.slice(0, 4).join('; ')}`
        : '',
      safeArray(record.technicalItems).length
        ? `Ítems: ${record.technicalItems.slice(0, 4).join('; ')}`
        : '',
    ].filter(Boolean)

    return `${index + 1}. ${title}\n${usefulFields.join('\n')}`
  })

  return {
    answer: `Encontré información relacionada en los módulos permitidos:\n\n${lines.join(
      '\n\n',
    )}\n\nRespuesta generada en modo local. La IA externa todavía no está conectada, por eso esta respuesta se basa en búsqueda inteligente sobre los datos guardados.`,
    sources: topMatches.map((match) => ({
      module: match.label,
      title: getRecordTitle(match.record),
      score: match.score,
    })),
  }
}

const AsistenteIA = () => {
  const { currentUser, hasPermission } = useAuth()
  const canUseAssistant = hasPermission('ai.chat')
  const canViewFinance = hasPermission('finance.view') || hasPermission('ai.finance')
  const [question, setQuestion] = useState('')
  const [scope, setScope] = useState('all')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hola, soy el asistente interno del ERP Rubik. Puedo ayudarte a buscar información en licitaciones, documentos, cotizaciones, órdenes de trabajo y otros módulos, respetando los permisos de tu perfil.',
      sources: [],
    },
  ])

  const allowedScopes = useMemo(
    () =>
      SCOPE_OPTIONS.filter((option) => {
        if (option.value === 'all') return canUseAssistant
        return hasPermission(option.permission)
      }),
    [canUseAssistant, hasPermission],
  )

  const knowledgeBase = useMemo(
    () => getKnowledgeBase({ hasPermission, canViewFinance }),
    [hasPermission, canViewFinance],
  )

  const handleAsk = () => {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) return

    if (!canUseAssistant) {
      setMessages((current) => [
        ...current,
        { role: 'user', content: trimmedQuestion, sources: [] },
        {
          role: 'assistant',
          content: 'No tienes permiso para usar el asistente IA.',
          sources: [],
        },
      ])
      setQuestion('')
      return
    }

    const result = answerAssistantQuestion({
      question: trimmedQuestion,
      hasPermission,
      canViewFinance,
    })

    setMessages((current) => [
      ...current,
      { role: 'user', content: trimmedQuestion, sources: [] },
      { role: 'assistant', content: result.answer, sources: result.sources },
    ])

    setQuestion('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      handleAsk()
    }
  }

  return (
    <CRow className="g-4">
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Asistente IA Rubik</strong>{' '}
              <small>Consulta inteligente con permisos por perfil</small>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color={canUseAssistant ? 'success' : 'danger'}>
                {canUseAssistant ? 'Activo' : 'Sin permiso'}
              </CBadge>
              <CBadge color={canViewFinance ? 'primary' : 'warning'}>
                {canViewFinance ? 'Finanzas habilitadas' : 'Finanzas ocultas'}
              </CBadge>
            </div>
          </CCardHeader>

          <CCardBody>
            {!canUseAssistant && (
              <CAlert color="danger">
                Tu usuario no tiene permiso <strong>ai.chat</strong>. Solicita acceso a Gerencia o
                Administración.
              </CAlert>
            )}

            <CAlert color="info">
              Este asistente está en modo local seguro. Busca dentro de los datos guardados del ERP
              y respeta los permisos del usuario conectado. La conexión con IA externa se puede
              agregar después desde backend.
            </CAlert>

            <CRow className="g-3 mb-4">
              <CCol md={4}>
                <CFormLabel>Usuario conectado</CFormLabel>
                <div className="border rounded p-3 h-100">
                  <div className="fw-semibold">{currentUser?.name || '-'}</div>
                  <div className="small text-body-secondary">{currentUser?.email || '-'}</div>
                  <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                    <CBadge color="primary">{currentUser?.role || 'Sin rol'}</CBadge>
                    <CBadge color="secondary">{currentUser?.area || 'Sin área'}</CBadge>
                  </div>
                </div>
              </CCol>

              <CCol md={8}>
                <CFormLabel>Módulos disponibles para el asistente</CFormLabel>
                <div className="border rounded p-3 h-100">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {knowledgeBase.length === 0 ? (
                      <CBadge color="secondary">Sin módulos disponibles</CBadge>
                    ) : (
                      knowledgeBase.map((collection) => (
                        <CBadge color="light" textColor="dark" key={collection.scope}>
                          {collection.label}: {collection.items.length}
                        </CBadge>
                      ))
                    )}
                  </div>
                </div>
              </CCol>
            </CRow>

            <CCard className="mb-4">
              <CCardHeader>
                <strong>Chat</strong>
              </CCardHeader>
              <CCardBody style={{ maxHeight: '460px', overflowY: 'auto' }}>
                <div className="d-flex flex-column gap-3">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`p-3 rounded ${message.role === 'user'
                          ? 'bg-primary text-white align-self-end'
                          : 'bg-body-tertiary align-self-start'
                        }`}
                      style={{ maxWidth: '88%', whiteSpace: 'pre-wrap' }}
                    >
                      <div className="small fw-semibold mb-1">
                        {message.role === 'user' ? 'Tú' : 'Asistente Rubik'}
                      </div>
                      <div>{message.content}</div>

                      {message.sources?.length > 0 && (
                        <div className="mt-3">
                          <div className="small fw-semibold mb-1">Fuentes usadas</div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            {message.sources.map((source) => (
                              <CBadge
                                color="light"
                                textColor="dark"
                                key={`${source.module}-${source.title}-${source.score}`}
                              >
                                {source.module}: {source.title}
                              </CBadge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CCardBody>
            </CCard>

            <CRow className="g-3">
              <CCol md={3}>
                <CFormLabel>Alcance</CFormLabel>
                <CFormSelect value={scope} onChange={(event) => setScope(event.target.value)}>
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
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ej: ¿Qué licitaciones cierran pronto? ¿Qué órdenes tengo asignadas?"
                    disabled={!canUseAssistant}
                  />
                  <CButton color="primary" type="button" onClick={handleAsk} disabled={!canUseAssistant}>
                    Preguntar
                  </CButton>
                </CInputGroup>
                <div className="small text-body-secondary mt-2">
                  Tip: también puedes usar Ctrl + Enter para enviar.
                </div>
              </CCol>

              <CCol xs={12}>
                <CFormLabel>Preguntas rápidas</CFormLabel>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {[
                    '¿Qué licitaciones cierran pronto?',
                    '¿Qué órdenes de trabajo están pendientes?',
                    '¿Qué documentos obligatorios aparecen en las licitaciones?',
                    '¿Qué riesgos tienen las licitaciones?',
                    '¿Qué cotizaciones están pendientes?',
                  ].map((quickQuestion) => (
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      type="button"
                      key={quickQuestion}
                      onClick={() => setQuestion(quickQuestion)}
                      disabled={!canUseAssistant}
                    >
                      {quickQuestion}
                    </CButton>
                  ))}
                </div>
              </CCol>

              <CCol xs={12}>
                <CFormTextarea
                  readOnly
                  rows={4}
                  value="Regla de seguridad: el asistente no entrega información financiera si el usuario no tiene finance.view o ai.finance. Tampoco consulta módulos donde el usuario no tiene permiso de lectura."
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default AsistenteIA