import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { useAuth } from '../../../context/AuthContext'
import { getApiBaseUrl } from '../../../services/apiClient'
import { createTender, deleteTender, listTenders, updateTender } from '../../../services/tendersApi'
import { exportListToExcel } from '../../../utils/exportListToExcel'
import { readStorage, writeStorage } from '../../../utils/storage'
import {
  analyzeTenderText,
  emptyTender,
  mockTenders,
  normalizeTender,
  TENDER_RISK_LEVELS,
  TENDER_STATUSES,
  TENDER_STORAGE_KEY,
} from '../../../utils/tenderStorage'

const API_BASE_URL = getApiBaseUrl()

const TENDER_ANALYZER_API_URL =
  import.meta.env.VITE_RUBIK_TENDER_ANALYZER_URL ||
  `${API_BASE_URL}/tender-analyzer/analyze-documents`
const SUPPORTED_TENDER_DOCUMENT_EXTENSIONS = '.pdf,.xlsx,.xls,.docx,.txt,.jpg,.jpeg,.png'

const getStoredTenders = () => {
  const storedTenders = readStorage(TENDER_STORAGE_KEY, null)

  return Array.isArray(storedTenders)
    ? storedTenders.map(normalizeTender)
    : mockTenders.map(normalizeTender)
}

const getApiItems = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.tenders)) return payload.tenders
  if (Array.isArray(payload?.data)) return payload.data

  return []
}

const emptyFilters = {
  search: '',
  status: '',
  riskLevel: '',
  dateFrom: '',
  dateTo: '',
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const formatDate = (date) => {
  if (!date) return '-'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('es-CL').format(parsedDate)
}

const toListText = (value) => (Array.isArray(value) ? value.join('\n') : String(value || ''))

const toList = (value) =>
  String(value || '')
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)

const getSourceDocumentNames = (files) =>
  Array.from(files || []).map((file) => `${file.name} (${Math.round(file.size / 1024)} KB)`)

const getRiskColor = (riskLevel) => {
  if (riskLevel === 'Crítico') return 'danger'
  if (riskLevel === 'Alto') return 'warning'
  if (riskLevel === 'Medio') return 'info'
  return 'success'
}

const getStatusColor = (status) => {
  if (['Adjudicada', 'Lista para ofertar', 'Postulada'].includes(status)) return 'success'
  if (['En análisis', 'Consultas', 'Cotizando'].includes(status)) return 'info'
  if (status === 'Borrador') return 'secondary'
  if (['Perdida', 'Descartada'].includes(status)) return 'danger'
  return 'secondary'
}

const isClosingSoon = (tender) => {
  if (!tender.closingDate || ['Adjudicada', 'Perdida', 'Descartada'].includes(tender.status)) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const closingDate = new Date(tender.closingDate)
  closingDate.setHours(0, 0, 0, 0)
  const diffDays = (closingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)

  return diffDays >= 0 && diffDays <= 7
}

const isOverdue = (tender) => {
  if (!tender.closingDate || ['Adjudicada', 'Perdida', 'Descartada'].includes(tender.status)) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const closingDate = new Date(tender.closingDate)
  closingDate.setHours(0, 0, 0, 0)

  return closingDate < today
}

const matchesFilters = (tender, filters) => {
  const search = filters.search.trim().toLowerCase()
  const searchableText = [
    tender.tenderId,
    tender.title,
    tender.buyer,
    tender.status,
    tender.riskLevel,
    tender.summary,
    tender.objectOfContract,
    tender.observations,
    ...tender.administrativeRequirements,
    ...tender.technicalRequirements,
    ...tender.economicRequirements,
    ...tender.requiredDocuments,
    ...tender.essentialDocuments,
    ...tender.evaluationCriteria,
    ...tender.guarantees,
    ...tender.paymentTerms,
    ...tender.penalties,
    ...tender.technicalItems,
    ...tender.suggestedQuestions,
    ...tender.risks,
  ]
    .join(' ')
    .toLowerCase()

  const matchesSearch = !search || searchableText.includes(search)
  const matchesStatus = !filters.status || tender.status === filters.status
  const matchesRisk = !filters.riskLevel || tender.riskLevel === filters.riskLevel
  const closingDate = tender.closingDate ? new Date(tender.closingDate) : null
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null
  const matchesDateFrom = !dateFrom || (closingDate && closingDate >= dateFrom)
  const matchesDateTo = !dateTo || (closingDate && closingDate <= dateTo)

  return matchesSearch && matchesStatus && matchesRisk && matchesDateFrom && matchesDateTo
}

const checklistSections = [
  ['Administrativo', 'administrativeRequirements'],
  ['Técnico', 'technicalRequirements'],
  ['Económico', 'economicRequirements'],
]

const detailSections = [
  ['Garantías', 'guarantees'],
  ['Riesgos de inadmisibilidad', 'risks'],
  ['Preguntas sugeridas', 'suggestedQuestions'],
  ['Ítems valorizables', 'technicalItems'],
]

const formListSections = [
  ...checklistSections,
  ['Documentos obligatorios', 'requiredDocuments'],
  ['Documentos esenciales', 'essentialDocuments'],
  ['Criterios de evaluación', 'evaluationCriteria'],
  ['Garantías', 'guarantees'],
  ['Forma de pago', 'paymentTerms'],
  ['Multas y sanciones', 'penalties'],
  ['Riesgos de inadmisibilidad', 'risks'],
  ['Preguntas sugeridas', 'suggestedQuestions'],
  ['Ítems valorizables', 'technicalItems'],
]

const fieldLabels = {
  tenderId: 'ID licitación',
  title: 'Nombre',
  buyer: 'Comprador',
  buyerRut: 'RUT comprador',
  budget: 'Presupuesto',
  closingDate: 'Fecha cierre',
  closingTime: 'Hora cierre',
  openingDate: 'Fecha apertura',
  openingTime: 'Hora apertura',
  adjudicationDate: 'Fecha adjudicación',
  adjudicationTime: 'Hora adjudicación',
  contractSignDate: 'Firma contrato',
  questionsDeadline: 'Límite consultas',
  answersDate: 'Fecha respuestas',
  object: 'Objeto',
  administrativeRequirements: 'Administrativo',
  technicalRequirements: 'Técnico',
  economicRequirements: 'Económico',
  requiredDocuments: 'Documentos obligatorios',
  essentialDocuments: 'Documentos esenciales',
  evaluationCriteria: 'Criterios',
  guarantees: 'Garantías',
  paymentTerms: 'Forma de pago',
  penalties: 'Multas',
  risks: 'Riesgos',
  suggestedQuestions: 'Preguntas sugeridas',
  technicalItems: 'Ítems',
}

const getFieldSourceRows = (fieldSources = {}) =>
  Object.entries(fieldSources)
    .flatMap(([field, source]) => {
      if (!source) return []
      const sources = Array.isArray(source) ? source : [source]

      return sources.map((item) => ({
        field,
        ...item,
      }))
    })
    .filter((source) => source.sourceFile)

const buildTenderChecklist = (tender) => [
  {
    label: 'Revisar documentos administrativos obligatorios',
    done: tender.administrativeRequirements.length > 0 || tender.requiredDocuments.length > 0,
  },
  {
    label: 'Validar documentos esenciales e inadmisibilidad',
    done: tender.essentialDocuments.length > 0,
  },
  {
    label: 'Levantar requerimientos técnicos principales',
    done: tender.technicalRequirements.length > 0 || tender.technicalItems.length > 0,
  },
  {
    label: 'Identificar criterios de evaluación y ponderaciones',
    done: tender.evaluationCriteria.length > 0,
  },
  {
    label: 'Confirmar garantías y vigencias',
    done: tender.guarantees.length > 0,
  },
  {
    label: 'Revisar forma de pago y multas',
    done: tender.paymentTerms.length > 0 || tender.penalties.length > 0,
  },
  {
    label: 'Preparar preguntas de aclaración',
    done: tender.suggestedQuestions.length > 0,
  },
]

const getAnalyzerSourceDocumentNames = (sourceFiles = []) =>
  sourceFiles
    .map((sourceFile) => {
      if (typeof sourceFile === 'string') return sourceFile
      return sourceFile.name || sourceFile.fileName || ''
    })
    .filter(Boolean)

const normalizeAnalyzerResponse = (response, currentTender) => {
  const tenderData = response.tenderData || response
  const diagnostics = response.documentDiagnostics || []

  return normalizeTender({
    ...tenderData,
    objectOfContract: tenderData.objectOfContract || tenderData.object || '',
    sourceText: response.extractedText || tenderData.sourceText || currentTender.sourceText,
    sourceDocuments: [
      ...new Set([
        ...(currentTender.sourceDocuments || []),
        ...getAnalyzerSourceDocumentNames(response.sourceFiles || []),
        ...diagnostics.map((diagnostic) => diagnostic.fileName).filter(Boolean),
      ]),
    ],
    fieldSources: response.fieldSources || tenderData.fieldSources || {},
    documentDiagnostics: diagnostics,
    globalWarnings: response.globalWarnings || tenderData.globalWarnings || [],
  })
}

const isEmptyValue = (value) => {
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'number') return value === 0
  if (value && typeof value === 'object') return Object.keys(value).length === 0
  return !String(value || '').trim()
}

const mergeAnalyzedTender = (currentTender, analyzedTender, mode = 'replace') => {
  const protectedKeys = ['id', 'createdAt', 'updatedAt', 'status', 'observations']
  const merged = { ...currentTender }

  Object.entries(analyzedTender).forEach(([key, value]) => {
    if (protectedKeys.includes(key)) return

    if (
      [
        'sourceText',
        'sourceDocuments',
        'fieldSources',
        'documentDiagnostics',
        'globalWarnings',
      ].includes(key)
    ) {
      merged[key] = value
      return
    }

    if (mode === 'fill-empty' && !isEmptyValue(currentTender[key])) {
      return
    }

    merged[key] = value
  })

  merged.id = currentTender.id
  merged.createdAt = currentTender.createdAt
  merged.updatedAt = currentTender.updatedAt
  merged.status = currentTender.status || analyzedTender.status
  merged.observations = currentTender.observations

  return merged
}

const Licitaciones = () => {
  const { currentUser } = useAuth()
  const currentActor = currentUser
    ? {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      area: currentUser.area,
    }
    : null
  const [tenders, setTenders] = useState(getStoredTenders)
  const [isApiFallback, setIsApiFallback] = useState(false)
  const [filters, setFilters] = useState(emptyFilters)
  const [visible, setVisible] = useState(false)
  const [selectedTender, setSelectedTender] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyTender)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [analysisWarnings, setAnalysisWarnings] = useState([])
  const [isAnalyzingDocuments, setIsAnalyzingDocuments] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadTendersFromApi = async () => {
      try {
        const payload = await listTenders()
        const apiTenders = getApiItems(payload).map(normalizeTender)

        if (!isMounted) return

        setTenders(apiTenders)
        writeStorage(TENDER_STORAGE_KEY, apiTenders)
        setIsApiFallback(false)
      } catch (loadError) {
        console.warn('API tenders unavailable; using local fallback.', loadError)

        if (isMounted) {
          setIsApiFallback(true)
        }
      }
    }

    loadTendersFromApi()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    writeStorage(TENDER_STORAGE_KEY, tenders.map(normalizeTender))
  }, [tenders])

  const normalizedTenders = useMemo(() => tenders.map(normalizeTender), [tenders])
  const filteredTenders = useMemo(
    () => normalizedTenders.filter((tender) => matchesFilters(tender, filters)),
    [normalizedTenders, filters],
  )

  const tenderSummary = useMemo(() => {
    const total = normalizedTenders.length
    const inAnalysis = normalizedTenders.filter((tender) => tender.status === 'En análisis').length
    const ready = normalizedTenders.filter(
      (tender) => tender.status === 'Lista para ofertar',
    ).length
    const discarded = normalizedTenders.filter((tender) =>
      ['Perdida', 'Descartada'].includes(tender.status),
    ).length
    const highRisk = normalizedTenders.filter((tender) =>
      ['Alto', 'Crítico'].includes(tender.riskLevel),
    ).length
    const upcoming = normalizedTenders.filter(isClosingSoon).length

    return { total, inAnalysis, ready, discarded, highRisk, upcoming }
  }, [normalizedTenders])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleListChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: toList(value) }))
  }

  const handleDocumentSelection = (event) => {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    const allowedExtensions = SUPPORTED_TENDER_DOCUMENT_EXTENSIONS.split(',')
    const invalidFiles = files.filter((file) => {
      const lowerName = file.name.toLowerCase()
      return !allowedExtensions.some((extension) => lowerName.endsWith(extension))
    })

    if (invalidFiles.length > 0) {
      setError('Solo se permiten documentos PDF, Excel, DOCX, TXT, JPG, JPEG o PNG.')
      return
    }

    setSelectedFiles(files)
    setAnalysisWarnings([])
    setError('')
    setFormData((current) => ({
      ...current,
      sourceDocuments: [
        ...new Set([...(current.sourceDocuments || []), ...getSourceDocumentNames(files)]),
      ],
    }))
    setMessage(
      `${files.length} archivo${files.length === 1 ? '' : 's'} seleccionado${files.length === 1 ? '' : 's'
      }. Presiona Analizar documentos para extraer y completar la ficha.`,
    )
  }

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({
      ...emptyTender,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setError('')
    setSelectedFiles([])
    setAnalysisWarnings([])
    setVisible(true)
  }

  const openEditModal = (tender) => {
    setEditingId(tender.id)
    setFormData(normalizeTender(tender))
    setError('')
    setSelectedFiles([])
    setAnalysisWarnings([])
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData(emptyTender)
    setError('')
    setSelectedFiles([])
    setAnalysisWarnings([])
  }

  const handleAnalyzeDocuments = async (mode = 'fill-empty') => {
    if (selectedFiles.length === 0 && !formData.sourceText.trim()) {
      setError('Sube documentos o pega texto de respaldo antes de analizar.')
      return
    }

    setIsAnalyzingDocuments(true)
    setError('')
    setAnalysisWarnings([])

    try {
      if (selectedFiles.length > 0) {
        const payload = new FormData()

        selectedFiles.forEach((file) => payload.append('documents', file))

        if (formData.sourceText.trim()) {
          payload.append('sourceText', formData.sourceText)
        }

        const response = await fetch(TENDER_ANALYZER_API_URL, {
          method: 'POST',
          body: payload,
        })
        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(result.error || 'No se pudieron analizar los documentos.')
        }

        setFormData((current) => ({
          ...mergeAnalyzedTender(current, normalizeAnalyzerResponse(result, current), mode),
          analyzedBy: currentActor,
        }))
        setAnalysisWarnings(result.globalWarnings || [])
        setMessage(
          mode === 'fill-empty'
            ? 'Documentos analizados: se completaron solo campos vacíos.'
            : 'Documentos analizados: se reemplazaron los campos detectados.',
        )
        return
      }

      const analyzedTender = analyzeTenderText(formData.sourceText)

      setFormData((current) => ({
        ...mergeAnalyzedTender(current, analyzedTender, mode),
        analyzedBy: currentActor,
      }))
      setMessage(
        mode === 'fill-empty'
          ? 'Texto analizado localmente: se completaron solo campos vacíos.'
          : 'Texto analizado localmente: se reemplazaron los campos detectados.',
      )
    } catch (analysisError) {
      console.error('Error analizando documentos de licitación:', analysisError)
      setError(
        `${analysisError.message} No se pudo conectar con el analizador de licitaciones. Verifica que la API esté publicada correctamente o pega el texto manualmente como respaldo.`,
      )
    } finally {
      setIsAnalyzingDocuments(false)
    }
  }

  const handleReanalyzeSavedTender = async (tender) => {
    if (!tender.sourceText?.trim()) {
      setMessage('Esta licitación no tiene texto fuente para reanalizar.')
      return
    }

    const analyzedTender = analyzeTenderText(tender.sourceText)
    const updatedTender = normalizeTender({
      ...mergeAnalyzedTender(tender, analyzedTender),
      id: tender.id,
      createdAt: tender.createdAt,
      analyzedBy: currentActor || tender.analyzedBy,
      updatedAt: new Date().toISOString(),
    })

    try {
      const savedTender = normalizeTender(await updateTender(tender.id, updatedTender))
      setTenders((currentTenders) =>
        currentTenders.map((currentTender) =>
          currentTender.id === tender.id ? savedTender : currentTender,
        ),
      )
      setSelectedTender(savedTender)
      setIsApiFallback(false)
      setMessage('Licitación reanalizada y persistida en la API.')
      return
    } catch (saveError) {
      console.error('Error guardando reanalisis de licitacion en API:', saveError)
      setTenders((currentTenders) =>
        currentTenders.map((currentTender) =>
          currentTender.id === tender.id ? updatedTender : currentTender,
        ),
      )
      setSelectedTender(updatedTender)
      setIsApiFallback(true)
      setMessage('Licitación reanalizada localmente porque la API no respondió.')
      return
    }
    setMessage('Licitación reanalizada con los documentos/texto fuente guardados.')
  }

  const validateTender = () => {
    if (!formData.title.trim()) return 'Ingresa el nombre de la licitación.'
    if (!formData.buyer.trim()) return 'Ingresa el organismo comprador.'
    if (!formData.status.trim()) return 'Selecciona el estado.'
    if (!formData.riskLevel.trim()) return 'Selecciona el nivel de riesgo.'

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationError = validateTender()

    if (validationError) {
      setError(validationError)
      return
    }

    const payload = normalizeTender({
      ...formData,
      id: editingId || formData.id || undefined,
      budget: Number(formData.budget) || 0,
      createdBy: formData.createdBy || currentActor,
      analyzedBy: formData.analyzedBy || currentActor,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    try {
      const savedTender = normalizeTender(
        editingId ? await updateTender(editingId, payload) : await createTender(payload),
      )

      setTenders((currentTenders) => {
        if (editingId) {
          return currentTenders.map((tender) => (tender.id === editingId ? savedTender : tender))
        }

        return [savedTender, ...currentTenders]
      })

      setIsApiFallback(false)
      setMessage(editingId ? 'Licitación actualizada en la API.' : 'Licitación guardada en la API.')
      closeModal()
      return
    } catch (saveError) {
      console.error('Error guardando licitacion en API:', saveError)
      setIsApiFallback(true)
    }

    setTenders((currentTenders) => {
      if (editingId) {
        return currentTenders.map((tender) => (tender.id === editingId ? payload : tender))
      }

      return [payload, ...currentTenders]
    })

    setMessage(editingId ? 'Licitación actualizada.' : 'Licitación guardada.')
    closeModal()
  }

  const handleDelete = async (tenderId) => {
    try {
      await deleteTender(tenderId)
      setTenders((currentTenders) => currentTenders.filter((tender) => tender.id !== tenderId))
      setIsApiFallback(false)
      setMessage('Licitación eliminada de la API.')
      return
    } catch (deleteError) {
      console.error('Error eliminando licitacion en API:', deleteError)
      setIsApiFallback(true)
    }

    setTenders((currentTenders) => currentTenders.filter((tender) => tender.id !== tenderId))
    setMessage('Licitación eliminada localmente.')
  }

  const handleDuplicate = async (tender) => {
    const duplicatedTender = normalizeTender({
      ...tender,
      id: undefined,
      tenderId: tender.tenderId ? `${tender.tenderId}-copia` : '',
      title: `${tender.title} - copia`,
      status: 'Borrador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    try {
      const savedTender = normalizeTender(await createTender(duplicatedTender))
      setTenders((currentTenders) => [savedTender, ...currentTenders])
      setIsApiFallback(false)
      setMessage('Licitación duplicada en la API.')
      return
    } catch (duplicateError) {
      console.error('Error duplicando licitacion en API:', duplicateError)
      setIsApiFallback(true)
    }

    setTenders((currentTenders) => [duplicatedTender, ...currentTenders])
    setMessage('Licitación duplicada.')
  }

  const handleExportTendersList = async () => {
    try {
      await exportListToExcel({
        fileName: 'Listado-Licitaciones-ERP-Rubik',
        sheetName: 'Licitaciones',
        title: 'Listado de licitaciones ERP Rubik',
        columns: [
          { header: 'ID licitación', key: 'tenderId', width: 18 },
          { header: 'Nombre', key: 'title', width: 42 },
          { header: 'Comprador', key: 'buyer', width: 28 },
          { header: 'Presupuesto', key: 'budget', width: 16, numFmt: '"$"#,##0' },
          { header: 'Cierre', key: 'closingDate', width: 16 },
          { header: 'Apertura', key: 'openingDate', width: 16 },
          { header: 'Adjudicación', key: 'adjudicationDate', width: 16 },
          { header: 'Contrato', key: 'contractSignDate', width: 16 },
          { header: 'Estado', key: 'status', width: 20 },
          { header: 'Riesgo', key: 'riskLevel', width: 14 },
          { header: 'Objeto contratación', key: 'objectOfContract', width: 46 },
          { header: 'Resumen', key: 'summary', width: 52 },
          {
            header: 'Documentos fuente',
            key: 'sourceDocuments',
            width: 38,
            value: (tender) => tender.sourceDocuments.join('; '),
          },
          {
            header: 'Administrativo',
            key: 'administrativeRequirements',
            width: 46,
            value: (tender) => tender.administrativeRequirements.join('; '),
          },
          {
            header: 'Técnico',
            key: 'technicalRequirements',
            width: 46,
            value: (tender) => tender.technicalRequirements.join('; '),
          },
          {
            header: 'Económico',
            key: 'economicRequirements',
            width: 46,
            value: (tender) => tender.economicRequirements.join('; '),
          },
          {
            header: 'Documentos esenciales',
            key: 'essentialDocuments',
            width: 46,
            value: (tender) => tender.essentialDocuments.join('; '),
          },
          {
            header: 'Criterios evaluación',
            key: 'evaluationCriteria',
            width: 46,
            value: (tender) => tender.evaluationCriteria.join('; '),
          },
          {
            header: 'Forma pago',
            key: 'paymentTerms',
            width: 46,
            value: (tender) => tender.paymentTerms.join('; '),
          },
          {
            header: 'Multas',
            key: 'penalties',
            width: 46,
            value: (tender) => tender.penalties.join('; '),
          },
          {
            header: 'Preguntas sugeridas',
            key: 'suggestedQuestions',
            width: 46,
            value: (tender) => tender.suggestedQuestions.join('; '),
          },
          {
            header: 'Ítems valorizables',
            key: 'technicalItems',
            width: 46,
            value: (tender) => tender.technicalItems.join('; '),
          },
          {
            header: 'Riesgos',
            key: 'risks',
            width: 46,
            value: (tender) => tender.risks.join('; '),
          },
        ],
        rows: filteredTenders,
        summary: [
          { label: 'Licitaciones exportadas', value: filteredTenders.length },
          { label: 'Total licitaciones', value: tenderSummary.total },
          { label: 'En análisis', value: tenderSummary.inAnalysis },
          { label: 'Listas para ofertar', value: tenderSummary.ready },
          { label: 'Riesgo alto/crítico', value: tenderSummary.highRisk },
        ],
      })

      setMessage('Listado de licitaciones exportado correctamente.')
    } catch (exportError) {
      console.error('Error exportando licitaciones:', exportError)
      setMessage(exportError.message || 'No se pudo exportar el listado de licitaciones.')
    }
  }

  return (
    <CRow className="g-4">
      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Licitaciones</div>
            <div className="fs-3 fw-semibold">{tenderSummary.total}</div>
            <CProgress thin color="primary" value={tenderSummary.total ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">En análisis</div>
            <div className="fs-3 fw-semibold">{tenderSummary.inAnalysis}</div>
            <CProgress thin color="info" value={tenderSummary.total ? 70 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Listas</div>
            <div className="fs-3 fw-semibold">{tenderSummary.ready}</div>
            <CProgress thin color="success" value={tenderSummary.total ? 65 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Descartadas</div>
            <div className="fs-3 fw-semibold">{tenderSummary.discarded}</div>
            <CProgress thin color="secondary" value={tenderSummary.total ? 35 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Riesgo alto/crítico</div>
            <div className="fs-3 fw-semibold">{tenderSummary.highRisk}</div>
            <CProgress thin color="warning" value={tenderSummary.total ? 80 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Cierres próximos</div>
            <div className="fs-3 fw-semibold">{tenderSummary.upcoming}</div>
            <CProgress thin color="danger" value={tenderSummary.total ? 75 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Analizador de Licitaciones</strong>{' '}
              <small>Documentos, reglas locales y checklist comercial/técnico</small>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">{filteredTenders.length} licitaciones</CBadge>
              <CButton
                color="success"
                variant="outline"
                type="button"
                onClick={handleExportTendersList}
                disabled={filteredTenders.length === 0}
              >
                Exportar listado Excel
              </CButton>
              <CButton color="primary" type="button" onClick={openCreateModal}>
                Analizar documentos
              </CButton>
            </div>
          </CCardHeader>

          <CCardBody>
            {message && (
              <CAlert color="info" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}

            {isApiFallback && (
              <CAlert color="warning">
                Trabajando en modo local porque la API no respondió.
              </CAlert>
            )}

            <CRow className="g-3 mb-4">
              <CCol xl={4} lg={12}>
                <CFormLabel htmlFor="tenderSearch">Búsqueda inteligente</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>Buscar</CInputGroupText>
                  <CFormInput
                    id="tenderSearch"
                    name="search"
                    placeholder="Buscar ID, comprador, ítem, garantía, riesgo..."
                    value={filters.search}
                    onChange={handleFilterChange}
                  />
                </CInputGroup>
              </CCol>

              <CCol xl={2} md={4}>
                <CFormLabel htmlFor="statusFilter">Estado</CFormLabel>
                <CFormSelect
                  id="statusFilter"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {TENDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xl={2} md={4}>
                <CFormLabel htmlFor="riskFilter">Riesgo</CFormLabel>
                <CFormSelect
                  id="riskFilter"
                  name="riskLevel"
                  value={filters.riskLevel}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {TENDER_RISK_LEVELS.map((riskLevel) => (
                    <option key={riskLevel} value={riskLevel}>
                      {riskLevel}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xl={3} md={4}>
                <CFormLabel>Fecha cierre</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    aria-label="Desde"
                    name="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={handleFilterChange}
                  />
                  <CFormInput
                    aria-label="Hasta"
                    name="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={handleFilterChange}
                  />
                </CInputGroup>
              </CCol>

              <CCol xl={1} className="d-flex align-items-end">
                <CButton
                  color="secondary"
                  variant="outline"
                  type="button"
                  onClick={() => setFilters(emptyFilters)}
                >
                  Limpiar
                </CButton>
              </CCol>
            </CRow>

            {filteredTenders.length === 0 ? (
              <CAlert color="info">
                No hay licitaciones que coincidan con la búsqueda actual.
              </CAlert>
            ) : (
              <CTable responsive align="middle" hover>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Licitación</CTableHeaderCell>
                    <CTableHeaderCell>Comprador</CTableHeaderCell>
                    <CTableHeaderCell>Presupuesto</CTableHeaderCell>
                    <CTableHeaderCell>Cierre</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                    <CTableHeaderCell>Riesgo</CTableHeaderCell>
                    <CTableHeaderCell>Checklist</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {filteredTenders.map((tender) => {
                    const totalChecklist =
                      tender.administrativeRequirements.length +
                      tender.technicalRequirements.length +
                      tender.economicRequirements.length
                    const checklistPercent = Math.min(100, totalChecklist * 12)

                    return (
                      <CTableRow key={tender.id}>
                        <CTableDataCell style={{ minWidth: '260px' }}>
                          <div className="fw-semibold">{tender.title}</div>
                          <div className="text-body-secondary small">{tender.tenderId || '-'}</div>
                        </CTableDataCell>
                        <CTableDataCell>{tender.buyer || '-'}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(tender.budget)}</CTableDataCell>
                        <CTableDataCell>
                          <div>{formatDate(tender.closingDate)}</div>
                          {isClosingSoon(tender) && <CBadge color="warning">Próxima</CBadge>}
                          {isOverdue(tender) && <CBadge color="danger">Vencida</CBadge>}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={getStatusColor(tender.status)}>{tender.status}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={getRiskColor(tender.riskLevel)}>{tender.riskLevel}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell style={{ minWidth: '160px' }}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span>Detectado</span>
                            <strong>{checklistPercent}%</strong>
                          </div>
                          <CProgress
                            thin
                            color={checklistPercent >= 60 ? 'success' : 'warning'}
                            value={checklistPercent}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CButtonGroup size="sm" role="group" aria-label="Acciones licitación">
                            <CButton
                              color="primary"
                              variant="outline"
                              type="button"
                              onClick={() => setSelectedTender(tender)}
                            >
                              Ver
                            </CButton>
                            <CButton
                              color="secondary"
                              variant="outline"
                              type="button"
                              onClick={() => openEditModal(tender)}
                            >
                              Editar
                            </CButton>
                            <CButton
                              color="info"
                              variant="outline"
                              type="button"
                              onClick={() => handleDuplicate(tender)}
                            >
                              Duplicar
                            </CButton>
                            <CButton
                              color="danger"
                              variant="outline"
                              type="button"
                              onClick={() => handleDelete(tender.id)}
                            >
                              Eliminar
                            </CButton>
                          </CButtonGroup>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={Boolean(selectedTender)} onClose={() => setSelectedTender(null)} size="xl">
        <CModalHeader>
          <CModalTitle>{selectedTender?.title || 'Detalle licitación'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedTender && (
            <>
              <CRow className="g-4 mb-4">
                <CCol lg={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Resumen ejecutivo</strong>
                    </CCardHeader>
                    <CCardBody>
                      <div className="white-space-pre-wrap">{selectedTender.summary || '-'}</div>
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol lg={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Datos clave</strong>
                    </CCardHeader>
                    <CCardBody>
                      <CRow className="g-3">
                        <CCol md={6}>
                          <div className="text-body-secondary small">ID licitación</div>
                          <div className="fw-semibold">{selectedTender.tenderId || '-'}</div>
                        </CCol>
                        <CCol md={6}>
                          <div className="text-body-secondary small">Comprador</div>
                          <div>{selectedTender.buyer || '-'}</div>
                        </CCol>
                        <CCol md={6}>
                          <div className="text-body-secondary small">RUT comprador</div>
                          <div>{selectedTender.buyerRut || '-'}</div>
                        </CCol>
                        <CCol md={6}>
                          <div className="text-body-secondary small">Estado</div>
                          <CBadge color={getStatusColor(selectedTender.status)}>
                            {selectedTender.status}
                          </CBadge>
                        </CCol>
                        <CCol md={6}>
                          <div className="text-body-secondary small">Riesgo</div>
                          <CBadge color={getRiskColor(selectedTender.riskLevel)}>
                            {selectedTender.riskLevel}
                          </CBadge>
                        </CCol>
                        <CCol xs={12}>
                          <div className="text-body-secondary small">Objeto de contratación</div>
                          <div>{selectedTender.objectOfContract || '-'}</div>
                        </CCol>
                        <CCol xs={12}>
                          <div className="text-body-secondary small">Documentos fuente</div>
                          {selectedTender.sourceDocuments.length === 0 ? (
                            <div>-</div>
                          ) : (
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              {selectedTender.sourceDocuments.map((documentName) => (
                                <CBadge color="light" textColor="dark" key={documentName}>
                                  {documentName}
                                </CBadge>
                              ))}
                            </div>
                          )}
                        </CCol>
                        {getFieldSourceRows(selectedTender.fieldSources).length > 0 && (
                          <CCol xs={12}>
                            <div className="text-body-secondary small">
                              Origen de datos detectados
                            </div>
                            <div className="small">
                              {getFieldSourceRows(selectedTender.fieldSources)
                                .slice(0, 8)
                                .map((source) => (
                                  <div key={`${source.field}-${source.sourceFile}-${source.value}`}>
                                    <strong>{fieldLabels[source.field] || source.field}:</strong>{' '}
                                    {source.sourceFile}
                                    {source.sourcePage ? `, p.${source.sourcePage}` : ''}
                                    {source.sourceSheet ? `, hoja ${source.sourceSheet}` : ''}
                                    {source.sourceRow ? `, fila ${source.sourceRow}` : ''}
                                  </div>
                                ))}
                            </div>
                          </CCol>
                        )}
                      </CRow>
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol lg={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Fechas críticas</strong>
                    </CCardHeader>
                    <CCardBody>
                      <CTable responsive bordered>
                        <CTableBody>
                          <CTableRow>
                            <CTableHeaderCell>Cierre</CTableHeaderCell>
                            <CTableDataCell>
                              {formatDate(selectedTender.closingDate)}
                              {selectedTender.closingTime ? ` ${selectedTender.closingTime}` : ''}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell>Apertura</CTableHeaderCell>
                            <CTableDataCell>
                              {formatDate(selectedTender.openingDate)}
                              {selectedTender.openingTime ? ` ${selectedTender.openingTime}` : ''}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell>Adjudicación</CTableHeaderCell>
                            <CTableDataCell>
                              {formatDate(selectedTender.adjudicationDate)}
                              {selectedTender.adjudicationTime
                                ? ` ${selectedTender.adjudicationTime}`
                                : ''}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell>Límite contrato</CTableHeaderCell>
                            <CTableDataCell>
                              {formatDate(selectedTender.contractSignDate)}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell>Límite consultas</CTableHeaderCell>
                            <CTableDataCell>
                              {formatDate(selectedTender.questionsDeadline)}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell>Fecha respuestas</CTableHeaderCell>
                            <CTableDataCell>
                              {formatDate(selectedTender.answersDate)}
                            </CTableDataCell>
                          </CTableRow>
                        </CTableBody>
                      </CTable>
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol lg={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Presupuesto</strong>
                    </CCardHeader>
                    <CCardBody>
                      <div className="fs-3 fw-semibold">
                        {formatCurrency(selectedTender.budget)}
                      </div>
                      <div className="text-body-secondary small">
                        Presupuesto disponible o referencial detectado en documentos.
                      </div>
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>

              {selectedTender.documentDiagnostics.length > 0 && (
                <CCard className="mb-4">
                  <CCardHeader>
                    <strong>Diagnóstico de lectura documental</strong>
                  </CCardHeader>
                  <CCardBody>
                    <CTable responsive hover small align="middle">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Archivo</CTableHeaderCell>
                          <CTableHeaderCell>Tipo detectado</CTableHeaderCell>
                          <CTableHeaderCell>Confianza</CTableHeaderCell>
                          <CTableHeaderCell>Método</CTableHeaderCell>
                          <CTableHeaderCell>Campos encontrados</CTableHeaderCell>
                          <CTableHeaderCell>Advertencias</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {selectedTender.documentDiagnostics.map((diagnostic) => (
                          <CTableRow key={`detail-${diagnostic.fileName}`}>
                            <CTableDataCell className="fw-semibold">
                              {diagnostic.fileName}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color="info">{diagnostic.detectedType}</CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              {Math.round((diagnostic.confidence || 0) * 100)}%
                            </CTableDataCell>
                            <CTableDataCell>{diagnostic.extractionMethod || '-'}</CTableDataCell>
                            <CTableDataCell>
                              {(diagnostic.fieldsFound || []).length === 0
                                ? '-'
                                : diagnostic.fieldsFound
                                  .map((field) => fieldLabels[field] || field)
                                  .join(', ')}
                            </CTableDataCell>
                            <CTableDataCell>
                              {(diagnostic.extractionWarnings || []).length === 0
                                ? '-'
                                : diagnostic.extractionWarnings.join(' | ')}
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </CCardBody>
                </CCard>
              )}

              <CRow className="g-4">
                <CCol md={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Documentos obligatorios</strong>
                    </CCardHeader>
                    <CCardBody>
                      {selectedTender.requiredDocuments.length === 0 ? (
                        <CAlert color="info" className="mb-0">
                          Sin documentos obligatorios detectados.
                        </CAlert>
                      ) : (
                        <ul className="mb-0">
                          {selectedTender.requiredDocuments.map((item) => (
                            <li key={`required-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol md={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Documentos esenciales</strong>
                    </CCardHeader>
                    <CCardBody>
                      {selectedTender.essentialDocuments.length === 0 ? (
                        <CAlert color="info" className="mb-0">
                          Sin documentos esenciales detectados.
                        </CAlert>
                      ) : (
                        <ul className="mb-0">
                          {selectedTender.essentialDocuments.map((item) => (
                            <li key={`essential-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>

                {checklistSections.map(([label, key]) => (
                  <CCol md={4} key={key}>
                    <CCard className="h-100">
                      <CCardHeader>
                        <strong>Checklist {label}</strong>
                      </CCardHeader>
                      <CCardBody>
                        {selectedTender[key].length === 0 ? (
                          <CAlert color="info" className="mb-0">
                            Sin hallazgos.
                          </CAlert>
                        ) : (
                          <ul className="mb-0">
                            {selectedTender[key].map((item) => (
                              <li key={`${key}-${item}`}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </CCardBody>
                    </CCard>
                  </CCol>
                ))}

                <CCol md={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Requisitos técnicos</strong>
                    </CCardHeader>
                    <CCardBody>
                      {selectedTender.technicalRequirements.length === 0 ? (
                        <CAlert color="info" className="mb-0">
                          Sin requisitos técnicos detectados.
                        </CAlert>
                      ) : (
                        <ul className="mb-0">
                          {selectedTender.technicalRequirements.map((item) => (
                            <li key={`technical-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol md={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Criterios de evaluación</strong>
                    </CCardHeader>
                    <CCardBody>
                      {selectedTender.evaluationCriteria.length === 0 ? (
                        <CAlert color="info" className="mb-0">
                          Sin criterios detectados.
                        </CAlert>
                      ) : (
                        <ul className="mb-0">
                          {selectedTender.evaluationCriteria.map((item) => (
                            <li key={`criteria-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol md={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Forma de pago</strong>
                    </CCardHeader>
                    <CCardBody>
                      {selectedTender.paymentTerms.length === 0 ? (
                        <CAlert color="info" className="mb-0">
                          Sin forma de pago detectada.
                        </CAlert>
                      ) : (
                        <ul className="mb-0">
                          {selectedTender.paymentTerms.map((item) => (
                            <li key={`payment-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol md={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Multas y sanciones</strong>
                    </CCardHeader>
                    <CCardBody>
                      {selectedTender.penalties.length === 0 ? (
                        <CAlert color="info" className="mb-0">
                          Sin multas detectadas.
                        </CAlert>
                      ) : (
                        <ul className="mb-0">
                          {selectedTender.penalties.map((item) => (
                            <li key={`penalty-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol xs={12}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Checklist de postulación</strong>
                    </CCardHeader>
                    <CCardBody>
                      <CTable responsive align="middle">
                        <CTableBody>
                          {buildTenderChecklist(selectedTender).map((item) => (
                            <CTableRow key={item.label}>
                              <CTableDataCell>{item.label}</CTableDataCell>
                              <CTableDataCell className="text-end">
                                <CBadge color={item.done ? 'success' : 'warning'}>
                                  {item.done ? 'Detectado' : 'Revisar'}
                                </CBadge>
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </CCardBody>
                  </CCard>
                </CCol>

                {detailSections.map(([label, key]) => (
                  <CCol md={6} key={key}>
                    <CCard className="h-100">
                      <CCardHeader>
                        <strong>{label}</strong>
                      </CCardHeader>
                      <CCardBody>
                        {selectedTender[key].length === 0 ? (
                          <CAlert color="info" className="mb-0">
                            Sin información detectada.
                          </CAlert>
                        ) : (
                          <ul className="mb-0">
                            {selectedTender[key].map((item) => (
                              <li key={`${key}-${item}`}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </CCardBody>
                    </CCard>
                  </CCol>
                ))}
              </CRow>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="info"
            variant="outline"
            type="button"
            disabled={!selectedTender?.sourceText}
            onClick={() => selectedTender && handleReanalyzeSavedTender(selectedTender)}
          >
            Reanalizar documentos
          </CButton>
          <CButton color="secondary" type="button" onClick={() => setSelectedTender(null)}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={visible} onClose={closeModal} size="xl">
        <CForm onSubmit={handleSubmit}>
          <CModalHeader>
            <CModalTitle>{editingId ? 'Editar análisis' : 'Analizar documentos'}</CModalTitle>
          </CModalHeader>

          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}

            <CRow className="g-3">
              <CCol xs={12}>
                <CFormLabel htmlFor="sourceFiles">Documentos de la licitación</CFormLabel>
                <CFormInput
                  id="sourceFiles"
                  type="file"
                  accept={SUPPORTED_TENDER_DOCUMENT_EXTENSIONS}
                  multiple
                  onChange={handleDocumentSelection}
                  disabled={isAnalyzingDocuments}
                />
                <div className="small text-body-secondary mt-1">
                  Puedes subir PDF, Excel, DOCX, TXT o imágenes. El backend extrae texto, une
                  documentos y completa la ficha; imágenes quedan preparadas para OCR.
                </div>
                {formData.sourceDocuments.length > 0 && (
                  <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                    {formData.sourceDocuments.map((documentName) => (
                      <CBadge color="light" textColor="dark" key={documentName}>
                        {documentName}
                      </CBadge>
                    ))}
                  </div>
                )}
                {isAnalyzingDocuments && (
                  <CAlert color="info" className="mt-2 mb-0">
                    Analizando documentos...
                  </CAlert>
                )}
                {analysisWarnings.length > 0 && (
                  <CAlert color="warning" className="mt-2 mb-0">
                    <strong>Advertencias de análisis</strong>
                    <ul className="mb-0 ps-3">
                      {analysisWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </CAlert>
                )}
              </CCol>

              {formData.documentDiagnostics.length > 0 && (
                <CCol xs={12}>
                  <CCard>
                    <CCardHeader>
                      <strong>Diagnóstico de lectura documental</strong>
                    </CCardHeader>
                    <CCardBody>
                      <CTable responsive hover small align="middle">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>Archivo</CTableHeaderCell>
                            <CTableHeaderCell>Tipo detectado</CTableHeaderCell>
                            <CTableHeaderCell>Confianza</CTableHeaderCell>
                            <CTableHeaderCell>Método</CTableHeaderCell>
                            <CTableHeaderCell>Campos encontrados</CTableHeaderCell>
                            <CTableHeaderCell>Advertencias</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {formData.documentDiagnostics.map((diagnostic) => (
                            <CTableRow key={diagnostic.fileName}>
                              <CTableDataCell className="fw-semibold">
                                {diagnostic.fileName}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color="info">{diagnostic.detectedType}</CBadge>
                              </CTableDataCell>
                              <CTableDataCell>
                                {Math.round((diagnostic.confidence || 0) * 100)}%
                              </CTableDataCell>
                              <CTableDataCell>{diagnostic.extractionMethod || '-'}</CTableDataCell>
                              <CTableDataCell>
                                {(diagnostic.fieldsFound || []).length === 0
                                  ? '-'
                                  : diagnostic.fieldsFound
                                    .map((field) => fieldLabels[field] || field)
                                    .join(', ')}
                              </CTableDataCell>
                              <CTableDataCell>
                                {(diagnostic.extractionWarnings || []).length === 0
                                  ? '-'
                                  : diagnostic.extractionWarnings.join(' | ')}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </CCardBody>
                  </CCard>
                </CCol>
              )}

              {getFieldSourceRows(formData.fieldSources).length > 0 && (
                <CCol xs={12}>
                  <CCard>
                    <CCardHeader>
                      <strong>Origen de datos detectados</strong>
                    </CCardHeader>
                    <CCardBody>
                      <CTable responsive hover small align="middle">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>Campo</CTableHeaderCell>
                            <CTableHeaderCell>Valor</CTableHeaderCell>
                            <CTableHeaderCell>Archivo</CTableHeaderCell>
                            <CTableHeaderCell>Ubicación</CTableHeaderCell>
                            <CTableHeaderCell>Confianza</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {getFieldSourceRows(formData.fieldSources)
                            .slice(0, 18)
                            .map((source, index) => (
                              <CTableRow key={`${source.field}-${source.sourceFile}-${index}`}>
                                <CTableDataCell>
                                  {fieldLabels[source.field] || source.field}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {String(source.value || '').slice(0, 140)}
                                </CTableDataCell>
                                <CTableDataCell>{source.sourceFile}</CTableDataCell>
                                <CTableDataCell>
                                  {[
                                    source.sourcePage ? `p.${source.sourcePage}` : '',
                                    source.sourceSheet ? `hoja ${source.sourceSheet}` : '',
                                    source.sourceRow ? `fila ${source.sourceRow}` : '',
                                    source.sourceCell ? `celda ${source.sourceCell}` : '',
                                  ]
                                    .filter(Boolean)
                                    .join(', ') || '-'}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {Math.round((source.confidence || 0) * 100)}%
                                </CTableDataCell>
                              </CTableRow>
                            ))}
                        </CTableBody>
                      </CTable>
                    </CCardBody>
                  </CCard>
                </CCol>
              )}

              <CCol xs={12}>
                <CFormLabel htmlFor="sourceText">Texto extraído o pegado manualmente</CFormLabel>
                <CFormTextarea
                  id="sourceText"
                  name="sourceText"
                  rows={8}
                  value={formData.sourceText}
                  onChange={handleChange}
                  placeholder="El texto extraído por backend aparecerá aquí. También puedes pegar manualmente texto copiado desde Mercado Público, bases administrativas o bases técnicas."
                />
                <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                  <CButton
                    color="info"
                    variant="outline"
                    type="button"
                    onClick={() => handleAnalyzeDocuments('fill-empty')}
                    disabled={isAnalyzingDocuments}
                  >
                    Reanalizar completando campos vacíos
                  </CButton>
                  <CButton
                    color="warning"
                    variant="outline"
                    type="button"
                    onClick={() => handleAnalyzeDocuments('replace')}
                    disabled={isAnalyzingDocuments}
                  >
                    Reanalizar y reemplazar campos
                  </CButton>
                </div>
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="tenderId">ID licitación</CFormLabel>
                <CFormInput
                  id="tenderId"
                  name="tenderId"
                  value={formData.tenderId}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={5}>
                <CFormLabel htmlFor="title">Nombre licitación</CFormLabel>
                <CFormInput
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="buyer">Comprador</CFormLabel>
                <CFormInput
                  id="buyer"
                  name="buyer"
                  value={formData.buyer}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="buyerRut">RUT comprador</CFormLabel>
                <CFormInput
                  id="buyerRut"
                  name="buyerRut"
                  value={formData.buyerRut}
                  onChange={handleChange}
                />
              </CCol>

              <CCol xs={12}>
                <CFormLabel htmlFor="objectOfContract">Objeto de contratación</CFormLabel>
                <CFormTextarea
                  id="objectOfContract"
                  name="objectOfContract"
                  rows={2}
                  value={formData.objectOfContract}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="budget">Presupuesto</CFormLabel>
                <CFormInput
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  value={formData.budget}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="closingDate">Fecha cierre</CFormLabel>
                <CFormInput
                  id="closingDate"
                  name="closingDate"
                  type="date"
                  value={formData.closingDate}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="closingTime">Hora cierre</CFormLabel>
                <CFormInput
                  id="closingTime"
                  name="closingTime"
                  type="time"
                  value={formData.closingTime}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="openingDate">Apertura</CFormLabel>
                <CFormInput
                  id="openingDate"
                  name="openingDate"
                  type="date"
                  value={formData.openingDate}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="openingTime">Hora apertura</CFormLabel>
                <CFormInput
                  id="openingTime"
                  name="openingTime"
                  type="time"
                  value={formData.openingTime}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="adjudicationDate">Adjudicación</CFormLabel>
                <CFormInput
                  id="adjudicationDate"
                  name="adjudicationDate"
                  type="date"
                  value={formData.adjudicationDate}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="adjudicationTime">Hora adjudicación</CFormLabel>
                <CFormInput
                  id="adjudicationTime"
                  name="adjudicationTime"
                  type="time"
                  value={formData.adjudicationTime}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="contractSignDate">Firma contrato</CFormLabel>
                <CFormInput
                  id="contractSignDate"
                  name="contractSignDate"
                  type="date"
                  value={formData.contractSignDate}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="questionsDeadline">Límite consultas</CFormLabel>
                <CFormInput
                  id="questionsDeadline"
                  name="questionsDeadline"
                  type="date"
                  value={formData.questionsDeadline}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="answersDate">Fecha respuestas</CFormLabel>
                <CFormInput
                  id="answersDate"
                  name="answersDate"
                  type="date"
                  value={formData.answersDate}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="status">Estado</CFormLabel>
                <CFormSelect
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {TENDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="riskLevel">Riesgo</CFormLabel>
                <CFormSelect
                  id="riskLevel"
                  name="riskLevel"
                  value={formData.riskLevel}
                  onChange={handleChange}
                >
                  {TENDER_RISK_LEVELS.map((riskLevel) => (
                    <option key={riskLevel} value={riskLevel}>
                      {riskLevel}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="summary">Resumen</CFormLabel>
                <CFormTextarea
                  id="summary"
                  name="summary"
                  rows={5}
                  value={formData.summary}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="observations">Observaciones internas</CFormLabel>
                <CFormTextarea
                  id="observations"
                  name="observations"
                  rows={5}
                  value={formData.observations}
                  onChange={handleChange}
                />
              </CCol>

              {formListSections.map(([label, key]) => (
                <CCol md={6} key={`form-${key}`}>
                  <CFormLabel htmlFor={key}>{label}</CFormLabel>
                  <CFormTextarea
                    id={key}
                    name={key}
                    rows={4}
                    value={toListText(formData[key])}
                    onChange={handleListChange}
                    placeholder="Un elemento por línea"
                  />
                </CCol>
              ))}
            </CRow>
          </CModalBody>

          <CModalFooter>
            <CButton color="secondary" variant="outline" type="button" onClick={closeModal}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit">
              Guardar licitación
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Licitaciones
