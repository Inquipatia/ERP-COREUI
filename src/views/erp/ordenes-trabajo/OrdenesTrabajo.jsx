import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
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
import { mockUsers } from '../../../data/mockUsers'
import { useAuth } from '../../../context/AuthContext'
import {
  createWorkOrder as createWorkOrderApi,
  createWorkOrderFromDocument as createWorkOrderFromDocumentApi,
  createWorkOrderFromQuote as createWorkOrderFromQuoteApi,
  deleteWorkOrder as deleteWorkOrderApi,
  listWorkOrders as listWorkOrdersApi,
  patchWorkOrder as patchWorkOrderApi,
} from '../../../services/workOrdersApi'
import { exportListToExcel } from '../../../utils/exportListToExcel'
import { STORAGE_KEYS, useLocalStorageState } from '../../../utils/storage'
import {
  addWorkOrderComment,
  calculateChecklistProgress,
  calculateWorkOrderProgress,
  canUserCreateWorkOrder,
  canUserUpdateWorkOrder,
  canUserViewWorkOrder,
  emptyWorkOrder,
  getAvailableWorkOrderActions,
  getWorkOrderProgressColor,
  mockWorkOrders,
  normalizeWorkOrder,
  toggleWorkOrderDeliverable,
  updateWorkOrderProgress,
  updateWorkOrderStatus,
  WORK_ORDER_AREAS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STORAGE_KEY,
  WORK_ORDER_TYPES,
} from '../../../utils/workOrderStorage'

const USERS_STORAGE_KEY = STORAGE_KEYS.users || 'rubik.erp.users'

const hasValue = (value) => String(value || '').trim().length > 0

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase()

const normalizeUser = (user = {}) => ({
  id: user.id || user.email || user.name || '',
  name: user.name || '',
  email: user.email || '',
  role: user.role || '',
  status: user.status || 'Activo',
  position: user.position || user.cargo || '',
  area: user.area || '',
})

const extractWorkOrderItems = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback

const getWorkOrderAreaFromUser = (user) => {
  const area = user.area || ''

  if (WORK_ORDER_AREAS.includes(area)) {
    return area
  }

  const matchingArea = area
    .split('/')
    .map((areaPart) => areaPart.trim())
    .find((areaPart) => WORK_ORDER_AREAS.includes(areaPart))

  return matchingArea || ''
}

const getMergedUserOptions = (storedUsers = []) => {
  const usersByEmail = new Map()

  mockUsers.map(normalizeUser).forEach((user) => {
    usersByEmail.set((user.email || user.id).toLowerCase(), user)
  })
  ;(Array.isArray(storedUsers) ? storedUsers : []).map(normalizeUser).forEach((user) => {
    const key = (user.email || user.id).toLowerCase()
    const baseUser = usersByEmail.get(key)

    usersByEmail.set(
      key,
      baseUser
        ? {
            ...user,
            ...baseUser,
            id: user.id || baseUser.id,
            status: user.status || baseUser.status,
            observations: user.observations || baseUser.observations || '',
          }
        : user,
    )
  })

  return Array.from(usersByEmail.values())
    .filter((user) => user.name && user.status !== 'Inactivo')
    .sort((firstUser, secondUser) => firstUser.name.localeCompare(secondUser.name, 'es'))
}

const formatDate = (date) => {
  if (!date) return '-'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('es-CL').format(parsedDate)
}

const formatDateTime = (date) => {
  if (!date) return '-'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsedDate)
}

const getStatusColor = (status) => {
  if (status === 'Finalizada' || status === 'Aprobada') return 'success'
  if (status === 'En proceso' || status === 'En revisión' || status === 'Recibida') return 'info'
  if (
    status === 'Pausada' ||
    status === 'Borrador' ||
    status === 'Solicita antecedentes' ||
    status === 'Devuelta con observaciones'
  )
    return 'warning'
  if (status === 'Rechazada') return 'danger'
  return 'secondary'
}

const getPriorityColor = (priority) => {
  if (priority === 'Urgente') return 'danger'
  if (priority === 'Alta') return 'warning'
  if (priority === 'Media') return 'info'
  return 'secondary'
}

const getCompletionPercent = (order) => {
  const fields = [
    order.title,
    order.type,
    order.client,
    order.company,
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
  ]

  return Math.round((fields.filter(hasValue).length / fields.length) * 100)
}

const getCompletionColor = (percent) => {
  if (percent >= 85) return 'success'
  if (percent >= 60) return 'warning'
  return 'danger'
}

const isOverdue = (order) => {
  if (!order.dueDate || ['Finalizada', 'Aprobada', 'Rechazada'].includes(order.status)) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(order.dueDate)
  dueDate.setHours(0, 0, 0, 0)

  return dueDate < today
}

const matchesFilters = (order, filters) => {
  const search = filters.search.trim().toLowerCase()

  const matchesSearch =
    !search ||
    [
      order.title,
      order.type,
      order.client,
      order.company,
      order.quoteNumber,
      order.requesterName,
      order.requesterEmail,
      order.requesterRole,
      order.assigneeName,
      order.assigneeEmail,
      order.assigneeRole,
      order.sourceArea,
      order.targetArea,
      order.priority,
      order.status,
      order.description,
      order.requirements,
      order.deliverables,
      order.observations,
      ...(order.comments || []).map((comment) => comment.message),
      ...(order.workflowLog || []).map((movement) => movement.message),
    ].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(search),
    )

  const matchesStatus = !filters.status || order.status === filters.status
  const matchesPriority = !filters.priority || order.priority === filters.priority
  const matchesArea =
    !filters.area || order.sourceArea === filters.area || order.targetArea === filters.area
  const matchesResponsible =
    !filters.responsible ||
    order.assigneeEmail === filters.responsible ||
    order.assigneeName === filters.responsible

  return matchesSearch && matchesStatus && matchesPriority && matchesArea && matchesResponsible
}

const getActor = (currentUser = {}) => ({
  id: currentUser.id,
  name: currentUser.name,
  email: currentUser.email,
  role: currentUser.role || currentUser.position,
  area: currentUser.area,
})

const isRequester = (order, user) => normalizeEmail(order.requesterEmail) === normalizeEmail(user?.email)

const isAssignee = (order, user) => normalizeEmail(order.assigneeEmail) === normalizeEmail(user?.email)

const OrdenesTrabajo = () => {
  const { currentUser, hasPermission, isAuthInitialized, isAuthenticated } = useAuth()
  const activeWorkOrderRequestRef = useRef(null)
  const canCreateWorkOrders = canUserCreateWorkOrder(currentUser || {}, hasPermission)
  const canAssignWorkOrders = hasPermission('workorders.assign') || hasPermission('admin.all')
  const canCloseWorkOrders =
    hasPermission('workorders.complete') || hasPermission('workorders.close') || hasPermission('admin.all')
  const canDeleteWorkOrders =
    hasPermission('workorders.delete') || hasPermission('workorders.assign') || hasPermission('admin.all')
  const canViewAllWorkOrders = canAssignWorkOrders || canCloseWorkOrders || hasPermission('admin.all')

  const [fallbackWorkOrders, setFallbackWorkOrders] = useLocalStorageState(
    WORK_ORDER_STORAGE_KEY,
    mockWorkOrders.map(normalizeWorkOrder),
  )
  const [apiWorkOrders, setApiWorkOrders] = useState([])
  const [apiLoaded, setApiLoaded] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isApiLoading, setIsApiLoading] = useState(false)
  const [users] = useLocalStorageState(USERS_STORAGE_KEY, mockUsers.map(normalizeUser))
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    area: '',
    responsible: '',
  })
  const [fromQuoteId, setFromQuoteId] = useState('')
  const [fromDocumentId, setFromDocumentId] = useState('')
  const [visible, setVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyWorkOrder)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [workflowComment, setWorkflowComment] = useState('')
  const [workflowProgress, setWorkflowProgress] = useState(0)
  const workOrders = apiLoaded ? apiWorkOrders : fallbackWorkOrders
  const canLoadWorkOrdersFromApi = isAuthInitialized && isAuthenticated
  const currentUserEmail = currentUser?.email || ''

  const setWorkOrders = useCallback(
    (updater) => {
      const applyUpdate = (currentOrders) =>
        typeof updater === 'function' ? updater(Array.isArray(currentOrders) ? currentOrders : []) : updater

      if (apiLoaded) {
        setApiWorkOrders((currentOrders) => applyUpdate(currentOrders))
      }

      setFallbackWorkOrders((currentOrders) => applyUpdate(currentOrders))
    },
    [apiLoaded, setFallbackWorkOrders],
  )

  const loadWorkOrdersFromApi = useCallback(
    async ({ silent = false } = {}) => {
      if (!canLoadWorkOrdersFromApi) {
        setIsApiLoading(false)
        return
      }

      if (activeWorkOrderRequestRef.current) {
        activeWorkOrderRequestRef.current.abort()
      }

      const controller = new AbortController()
      activeWorkOrderRequestRef.current = controller

      if (!silent) {
        setIsApiLoading(true)
      }

      try {
        const payload = await listWorkOrdersApi({ signal: controller.signal })
        if (controller.signal.aborted) return

        const items = extractWorkOrderItems(payload).map(normalizeWorkOrder)
        setApiWorkOrders(items)
        setFallbackWorkOrders(items)
        setApiLoaded(true)
        setApiError('')
      } catch (loadError) {
        if (controller.signal.aborted || loadError?.name === 'AbortError') return

        console.error('Error cargando ordenes de trabajo desde API:', loadError)
        setApiLoaded(false)
        setApiError(
          getApiErrorMessage(
            loadError,
            'No se pudo conectar con la API de ordenes de trabajo. Se muestra respaldo local temporal.',
          ),
        )
      } finally {
        if (activeWorkOrderRequestRef.current === controller) {
          activeWorkOrderRequestRef.current = null
        }

        if (!silent && !controller.signal.aborted) {
          setIsApiLoading(false)
        }
      }
    },
    [canLoadWorkOrdersFromApi, setFallbackWorkOrders],
  )

  useEffect(() => {
    if (!isAuthInitialized) return undefined

    if (!isAuthenticated) {
      setIsApiLoading(false)
      setApiLoaded(false)
      return undefined
    }

    void loadWorkOrdersFromApi()

    return () => {
      if (activeWorkOrderRequestRef.current) {
        activeWorkOrderRequestRef.current.abort()
        activeWorkOrderRequestRef.current = null
      }
    }
  }, [currentUserEmail, isAuthenticated, isAuthInitialized, loadWorkOrdersFromApi])

  const normalizedOrders = useMemo(
    () => (Array.isArray(workOrders) ? workOrders : []).map(normalizeWorkOrder),
    [workOrders],
  )
  const normalizedUsers = useMemo(() => getMergedUserOptions(users), [users])

  const visibleOrders = useMemo(() => {
    if (canViewAllWorkOrders) {
      return normalizedOrders
    }

    return normalizedOrders.filter((order) =>
      canUserViewWorkOrder(order, currentUser || {}, hasPermission),
    )
  }, [canViewAllWorkOrders, currentUser, hasPermission, normalizedOrders])

  const filteredOrders = useMemo(
    () => visibleOrders.filter((order) => matchesFilters(order, filters)),
    [visibleOrders, filters],
  )

  const orderSummary = useMemo(() => {
    const total = visibleOrders.length
    const pending = visibleOrders.filter((order) =>
      ['Borrador', 'Pendiente'].includes(order.status),
    ).length
    const inProgress = visibleOrders.filter((order) =>
      ['Recibida', 'En proceso', 'Solicita antecedentes', 'Devuelta con observaciones'].includes(
        order.status,
      ),
    ).length
    const inReview = visibleOrders.filter((order) => order.status === 'En revisión').length
    const finished = visibleOrders.filter((order) =>
      ['Aprobada', 'Finalizada'].includes(order.status),
    ).length
    const urgent = visibleOrders.filter((order) => order.priority === 'Urgente').length
    const overdue = visibleOrders.filter(isOverdue).length
    const averageProgress =
      total > 0
        ? Math.round(
            visibleOrders.reduce((sum, order) => sum + calculateWorkOrderProgress(order), 0) /
              total,
          )
        : 0
    const completion =
      total > 0
        ? Math.round(
            visibleOrders.reduce((sum, order) => sum + getCompletionPercent(order), 0) / total,
          )
        : 0

    return {
      total,
      pending,
      inProgress,
      inReview,
      finished,
      urgent,
      overdue,
      averageProgress,
      completion,
      filtered: filteredOrders.length,
    }
  }, [visibleOrders, filteredOrders])

  const statusSummary = useMemo(
    () =>
      WORK_ORDER_STATUSES.map((status) => ({
        status,
        count: visibleOrders.filter((order) => order.status === status).length,
      })).filter((item) => item.count > 0),
    [visibleOrders],
  )

  const areaSummary = useMemo(
    () =>
      WORK_ORDER_AREAS.map((area) => ({
        area,
        count: visibleOrders.filter(
          (order) => order.sourceArea === area || order.targetArea === area,
        ).length,
      })).filter((item) => item.count > 0),
    [visibleOrders],
  )

  const upsertWorkOrderInState = useCallback(
    (nextOrder) => {
      const normalized = normalizeWorkOrder(nextOrder)

      setWorkOrders((currentOrders) => {
        const orders = Array.isArray(currentOrders) ? currentOrders : []
        const exists = orders.some((order) => normalizeWorkOrder(order).id === normalized.id)
        if (!exists) return [normalized, ...orders]

        return orders.map((order) => (normalizeWorkOrder(order).id === normalized.id ? normalized : order))
      })

      return normalized
    },
    [setWorkOrders],
  )

  const syncSelectedOrder = async (nextOrder) => {
    let normalized = normalizeWorkOrder(nextOrder)

    try {
      if (apiLoaded) {
        normalized = normalizeWorkOrder(await patchWorkOrderApi(normalized.id, normalized))
        setApiError('')
      }

      upsertWorkOrderInState(normalized)
      setSelectedOrder(normalized)
      setWorkflowProgress(calculateWorkOrderProgress(normalized))
      return true
    } catch (syncError) {
      console.error('Error sincronizando orden de trabajo:', syncError)
      setApiError(
        getApiErrorMessage(syncError, 'No se pudo guardar el cambio en la API de ordenes de trabajo.'),
      )
      return false
    }
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleUserSelect = (kind, event) => {
    if (kind === 'assignee' && editingId && !canAssignWorkOrders) {
      setError('Tu perfil no permite reasignar órdenes de trabajo.')
      return
    }

    const selectedEmail = event.target.value
    const selectedUser = normalizedUsers.find((user) => user.email === selectedEmail)

    setFormData((current) => {
      if (!selectedUser) {
        return {
          ...current,
          [`${kind}Name`]: '',
          [`${kind}Email`]: '',
          [`${kind}Role`]: '',
        }
      }

      const nextData = {
        ...current,
        [`${kind}Name`]: selectedUser.name,
        [`${kind}Email`]: selectedUser.email,
        [`${kind}Role`]: selectedUser.role || selectedUser.position,
      }

      const userArea = getWorkOrderAreaFromUser(selectedUser)

      if (kind === 'requester' && userArea) {
        nextData.sourceArea = userArea
      }

      if (kind === 'assignee' && userArea) {
        nextData.targetArea = userArea
      }

      return nextData
    })
  }

  const openCreateModal = () => {
    if (!canCreateWorkOrders) {
      setMessage('Tu perfil no permite crear órdenes de trabajo.')
      return
    }

    const currentUserArea = getWorkOrderAreaFromUser(currentUser || {})

    setEditingId(null)
    setFormData({
      ...emptyWorkOrder,
      requesterName: currentUser?.name || '',
      requesterEmail: currentUser?.email || '',
      requesterRole: currentUser?.role || currentUser?.position || '',
      sourceArea: currentUserArea || emptyWorkOrder.sourceArea,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setError('')
    setVisible(true)
  }

  const openEditModal = (order) => {
    if (!canUserUpdateWorkOrder(order, currentUser || {}, hasPermission)) {
      setMessage('Tu perfil solo permite visualizar esta orden.')
      return
    }

    setEditingId(order.id)
    setFormData(normalizeWorkOrder(order))
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData(emptyWorkOrder)
    setError('')
  }

  const openDetailModal = (order) => {
    const normalized = normalizeWorkOrder(order)
    setSelectedOrder(normalized)
    setWorkflowComment('')
    setWorkflowProgress(calculateWorkOrderProgress(normalized))
  }

  const validateOrder = () => {
    if (!formData.title.trim()) return 'Ingresa el título de la orden de trabajo.'
    if (!formData.type.trim()) return 'Selecciona el tipo de orden.'
    if (!formData.requesterName.trim()) return 'Selecciona quién solicita la orden.'
    if (!formData.assigneeName.trim()) return 'Selecciona a quién se asigna la orden.'
    if (!formData.sourceArea.trim()) return 'Selecciona el área solicitante.'
    if (!formData.targetArea.trim()) return 'Selecciona el área responsable.'
    if (!formData.description.trim()) return 'Agrega una descripción breve del requerimiento.'

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!editingId && !canCreateWorkOrders) {
      setError('Tu perfil no permite crear órdenes de trabajo.')
      return
    }

    if (editingId && !canUserUpdateWorkOrder(formData, currentUser || {}, hasPermission)) {
      setError('Tu perfil no permite editar esta orden de trabajo.')
      return
    }

    if (['Aprobada', 'Finalizada'].includes(formData.status) && !canCloseWorkOrders) {
      setError('Tu perfil no permite cerrar o aprobar órdenes de trabajo.')
      return
    }

    const validationError = validateOrder()

    if (validationError) {
      setError(validationError)
      return
    }

    const payload = normalizeWorkOrder({
      ...formData,
      id: editingId || undefined,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    try {
      const savedOrder = apiLoaded
        ? normalizeWorkOrder(
            editingId ? await patchWorkOrderApi(editingId, payload) : await createWorkOrderApi(payload),
          )
        : payload

      upsertWorkOrderInState(savedOrder)
      setApiError('')
      setMessage(
        editingId
          ? 'Orden de trabajo actualizada.'
          : apiLoaded
            ? 'Orden de trabajo creada en API/MySQL.'
            : 'Orden de trabajo creada en respaldo local temporal.',
      )
      closeModal()
    } catch (saveError) {
      console.error('Error guardando orden de trabajo:', saveError)
      const errorMessage = getApiErrorMessage(saveError, 'No se pudo guardar la orden de trabajo en la API.')
      setError(errorMessage)
      setApiError(errorMessage)
    }
  }

  const handleDelete = async (orderId) => {
    if (!canDeleteWorkOrders) {
      setMessage('Tu perfil no permite eliminar órdenes de trabajo.')
      return
    }

    try {
      if (apiLoaded) {
        await deleteWorkOrderApi(orderId)
      }

      setWorkOrders((currentOrders) =>
        (Array.isArray(currentOrders) ? currentOrders : []).filter(
          (order) => normalizeWorkOrder(order).id !== orderId,
        ),
      )
      setApiError('')
      setMessage('Orden de trabajo eliminada.')
    } catch (deleteError) {
      console.error('Error eliminando orden de trabajo:', deleteError)
      setApiError(getApiErrorMessage(deleteError, 'No se pudo eliminar la orden de trabajo en la API.'))
    }
  }

  const handleDuplicate = async (order) => {
    if (!canCreateWorkOrders) {
      setMessage('Tu perfil no permite duplicar órdenes de trabajo.')
      return
    }

    const duplicatedOrder = normalizeWorkOrder({
      ...order,
      id: undefined,
      title: `${order.title} - copia`,
      status: 'Pendiente',
      progressManual: 20,
      comments: [],
      workflowLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    try {
      const savedOrder = apiLoaded ? normalizeWorkOrder(await createWorkOrderApi(duplicatedOrder)) : duplicatedOrder
      upsertWorkOrderInState(savedOrder)
      setApiError('')
      setMessage(apiLoaded ? 'Orden de trabajo duplicada en API/MySQL.' : 'Orden de trabajo duplicada en respaldo local temporal.')
    } catch (duplicateError) {
      console.error('Error duplicando orden de trabajo:', duplicateError)
      setApiError(getApiErrorMessage(duplicateError, 'No se pudo duplicar la orden de trabajo en la API.'))
    }
  }

  const handleCreateFromQuote = async () => {
    const quoteId = fromQuoteId.trim()

    if (!quoteId) {
      setApiError('Ingresa el ID de la cotizacion para crear la orden de trabajo.')
      return
    }

    if (!apiLoaded) {
      setApiError('La creacion desde cotizacion requiere API disponible para usar datos reales.')
      return
    }

    try {
      const createdOrder = normalizeWorkOrder(
        await createWorkOrderFromQuoteApi(quoteId, {
          assignedArea: 'Diseño',
          priority: 'media',
          status: 'pending',
        }),
      )
      upsertWorkOrderInState(createdOrder)
      setFromQuoteId('')
      setApiError('')
      setMessage('Orden de trabajo creada desde cotizacion.')
    } catch (quoteError) {
      console.error('Error creando orden desde cotizacion:', quoteError)
      setApiError(getApiErrorMessage(quoteError, 'No se pudo crear la orden desde la cotizacion.'))
    }
  }

  const handleCreateFromDocument = async () => {
    const documentId = fromDocumentId.trim()

    if (!documentId) {
      setApiError('Ingresa el ID del documento para crear la orden de trabajo.')
      return
    }

    if (!apiLoaded) {
      setApiError('La creacion desde documento requiere API disponible para usar datos reales.')
      return
    }

    try {
      const createdOrder = normalizeWorkOrder(
        await createWorkOrderFromDocumentApi(documentId, {
          assignedArea: 'Diseño',
          priority: 'media',
          status: 'pending',
        }),
      )
      upsertWorkOrderInState(createdOrder)
      setFromDocumentId('')
      setApiError('')
      setMessage('Orden de trabajo creada desde documento.')
    } catch (documentError) {
      console.error('Error creando orden desde documento:', documentError)
      setApiError(getApiErrorMessage(documentError, 'No se pudo crear la orden desde el documento.'))
    }
  }

  const handleWorkflowAction = async (action) => {
    if (!selectedOrder) return

    const updatedOrder = updateWorkOrderStatus(selectedOrder, {
      action,
      actor: getActor(currentUser),
      message: workflowComment,
      progressManual: workflowProgress,
    })

    const synced = await syncSelectedOrder(updatedOrder)
    if (synced) {
      setWorkflowComment('')
      setMessage('Movimiento registrado en la orden de trabajo.')
    }
  }

  const handleAddComment = async () => {
    if (!selectedOrder) return

    const updatedOrder = addWorkOrderComment(selectedOrder, {
      actor: getActor(currentUser),
      message: workflowComment,
      type: 'Comentario',
    })

    const synced = await syncSelectedOrder(updatedOrder)
    if (synced) {
      setWorkflowComment('')
      setMessage('Comentario agregado a la orden de trabajo.')
    }
  }

  const handleProgressUpdate = async () => {
    if (!selectedOrder) return

    const updatedOrder = updateWorkOrderProgress(selectedOrder, {
      actor: getActor(currentUser),
      progressManual: workflowProgress,
      message: workflowComment,
    })

    const synced = await syncSelectedOrder(updatedOrder)
    if (synced) {
      setWorkflowComment('')
      setMessage('Avance actualizado.')
    }
  }

  const handleToggleDeliverable = async (item, done, index) => {
    if (!selectedOrder) return

    const updatedOrder = toggleWorkOrderDeliverable(selectedOrder, {
      deliverableId: item.id,
      index,
      done,
      actor: getActor(currentUser),
    })

    const synced = await syncSelectedOrder(updatedOrder)
    if (synced) {
      setMessage(done ? 'Entregable marcado como completado.' : 'Entregable reabierto.')
    }
  }

  const handleExportWorkOrdersList = async () => {
    try {
      await exportListToExcel({
        fileName: 'Listado-Ordenes-Trabajo-ERP-Rubik',
        sheetName: 'Ordenes trabajo',
        title: 'Listado de órdenes de trabajo ERP Rubik',
        columns: [
          { header: 'Título', key: 'title', width: 34 },
          { header: 'Tipo', key: 'type', width: 22 },
          { header: 'Cliente', key: 'client', width: 24 },
          { header: 'Empresa', key: 'company', width: 26 },
          { header: 'N° cotización', key: 'quoteNumber', width: 16 },
          { header: 'Solicita', key: 'requesterName', width: 24 },
          { header: 'Email solicitante', key: 'requesterEmail', width: 30 },
          { header: 'Rol solicitante', key: 'requesterRole', width: 26 },
          { header: 'Asignado a', key: 'assigneeName', width: 24 },
          { header: 'Email asignado', key: 'assigneeEmail', width: 30 },
          { header: 'Rol asignado', key: 'assigneeRole', width: 26 },
          { header: 'Área origen', key: 'sourceArea', width: 20 },
          { header: 'Área responsable', key: 'targetArea', width: 22 },
          { header: 'Prioridad', key: 'priority', width: 14 },
          { header: 'Estado', key: 'status', width: 18 },
          { header: 'Fecha entrega', key: 'dueDate', width: 16 },
          {
            header: 'Avance operativo',
            key: 'progress',
            width: 18,
            value: (order) => `${calculateWorkOrderProgress(order)}%`,
          },
          {
            header: 'Checklist entregables',
            key: 'checklistProgress',
            width: 20,
            value: (order) => `${calculateChecklistProgress(order)}%`,
          },
          {
            header: 'Completitud ficha',
            key: 'completion',
            width: 18,
            value: (order) => `${getCompletionPercent(order)}%`,
          },
          { header: 'Descripción', key: 'description', width: 42 },
          { header: 'Requerimientos', key: 'requirements', width: 42 },
          { header: 'Entregables', key: 'deliverables', width: 42 },
          { header: 'Observaciones', key: 'observations', width: 42 },
        ],
        rows: filteredOrders,
        summary: [
          { label: 'Órdenes exportadas', value: filteredOrders.length },
          { label: 'Total órdenes visibles', value: orderSummary.total },
          { label: 'Pendientes', value: orderSummary.pending },
          { label: 'En proceso', value: orderSummary.inProgress },
          { label: 'En revisión', value: orderSummary.inReview },
          { label: 'Finalizadas / aprobadas', value: orderSummary.finished },
          { label: 'Urgentes', value: orderSummary.urgent },
          { label: 'Vencidas', value: orderSummary.overdue },
        ],
      })

      setMessage('Listado de órdenes de trabajo exportado correctamente.')
    } catch (exportError) {
      console.error('Error exportando órdenes de trabajo:', exportError)
      setMessage(exportError.message || 'No se pudo exportar el listado de órdenes de trabajo.')
    }
  }

  const selectedOrderCanUpdate =
    selectedOrder && canUserUpdateWorkOrder(selectedOrder, currentUser || {}, hasPermission)
  const selectedOrderActions = selectedOrder
    ? getAvailableWorkOrderActions(selectedOrder, currentUser || {}, hasPermission)
    : []

  return (
    <CRow className="g-4">
      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Órdenes visibles</div>
            <div className="fs-3 fw-semibold">{orderSummary.total}</div>
            <CProgress thin color="primary" value={orderSummary.total > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Pendientes</div>
            <div className="fs-3 fw-semibold">{orderSummary.pending}</div>
            <div className="small text-body-secondary">borrador o por recibir</div>
            <CProgress
              thin
              color="warning"
              value={
                orderSummary.total > 0
                  ? Math.round((orderSummary.pending / orderSummary.total) * 100)
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">En gestión</div>
            <div className="fs-3 fw-semibold">{orderSummary.inProgress}</div>
            <div className="small text-body-secondary">recibidas, proceso u observación</div>
            <CProgress
              thin
              color="info"
              value={
                orderSummary.total > 0
                  ? Math.round((orderSummary.inProgress / orderSummary.total) * 100)
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">En revisión</div>
            <div className="fs-3 fw-semibold">{orderSummary.inReview}</div>
            <div className="small text-body-secondary">esperan aprobación o cambios</div>
            <CProgress
              thin
              color="primary"
              value={
                orderSummary.total > 0
                  ? Math.round((orderSummary.inReview / orderSummary.total) * 100)
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Urgentes / vencidas</div>
            <div className="fs-3 fw-semibold">
              {orderSummary.urgent} / {orderSummary.overdue}
            </div>
            <div className="small text-body-secondary">prioridad y fecha límite</div>
            <CProgress
              thin
              color={orderSummary.overdue > 0 ? 'danger' : 'warning'}
              value={
                orderSummary.total > 0
                  ? Math.round(
                      ((orderSummary.urgent + orderSummary.overdue) / orderSummary.total) * 100,
                    )
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Avance promedio</div>
            <div className="fs-3 fw-semibold">{orderSummary.averageProgress}%</div>
            <div className="small text-body-secondary">estado + avance + entregables</div>
            <CProgress
              thin
              color={getWorkOrderProgressColor(orderSummary.averageProgress)}
              value={orderSummary.averageProgress}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Órdenes de trabajo internas</strong>{' '}
              <small>Flujo operativo entre solicitante y responsable</small>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">{filteredOrders.length} órdenes</CBadge>
              <CButton
                color="success"
                type="button"
                variant="outline"
                onClick={handleExportWorkOrdersList}
                disabled={filteredOrders.length === 0}
              >
                Exportar listado Excel
              </CButton>
              {canCreateWorkOrders && (
                <CButton color="primary" type="button" onClick={openCreateModal}>
                  Nueva orden
                </CButton>
              )}
            </div>
          </CCardHeader>

          <CCardBody>
            {message && (
              <CAlert color="success" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}

            {isApiLoading && <CAlert color="info">Cargando ordenes de trabajo desde API...</CAlert>}

            {apiError && (
              <CAlert color="warning" dismissible onClose={() => setApiError('')}>
                {apiError}
              </CAlert>
            )}

            {!canViewAllWorkOrders && (
              <CAlert color="info">
                Tu perfil muestra órdenes donde participas como solicitante o responsable. Puedes
                gestionar fases, comentarios y entregables cuando la orden esté asignada a ti.
              </CAlert>
            )}

            {canCreateWorkOrders && (
              <CRow className="g-3 mb-3">
                <CCol lg={5} md={6}>
                  <CFormLabel htmlFor="fromQuoteId">Crear desde cotizacion</CFormLabel>
                  <CFormInput
                    id="fromQuoteId"
                    value={fromQuoteId}
                    onChange={(event) => setFromQuoteId(event.target.value)}
                    placeholder="ID de cotizacion"
                    disabled={!apiLoaded || isApiLoading}
                  />
                </CCol>
                <CCol lg={1} md={6} className="d-flex align-items-end">
                  <CButton
                    color="primary"
                    type="button"
                    variant="outline"
                    onClick={handleCreateFromQuote}
                    disabled={!apiLoaded || isApiLoading}
                  >
                    Crear
                  </CButton>
                </CCol>
                <CCol lg={5} md={6}>
                  <CFormLabel htmlFor="fromDocumentId">Crear desde documento</CFormLabel>
                  <CFormInput
                    id="fromDocumentId"
                    value={fromDocumentId}
                    onChange={(event) => setFromDocumentId(event.target.value)}
                    placeholder="ID de documento"
                    disabled={!apiLoaded || isApiLoading}
                  />
                </CCol>
                <CCol lg={1} md={6} className="d-flex align-items-end">
                  <CButton
                    color="primary"
                    type="button"
                    variant="outline"
                    onClick={handleCreateFromDocument}
                    disabled={!apiLoaded || isApiLoading}
                  >
                    Crear
                  </CButton>
                </CCol>
              </CRow>
            )}

            <CRow className="g-3 mb-3">
              <CCol xl={4} lg={12}>
                <CFormLabel htmlFor="workOrderSearch">Búsqueda inteligente</CFormLabel>
                <CFormInput
                  id="workOrderSearch"
                  name="search"
                  placeholder="Buscar por cliente, orden, área, responsable, estado o comentario..."
                  value={filters.search}
                  onChange={handleFilterChange}
                />
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
                  {WORK_ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xl={2} md={4}>
                <CFormLabel htmlFor="priorityFilter">Prioridad</CFormLabel>
                <CFormSelect
                  id="priorityFilter"
                  name="priority"
                  value={filters.priority}
                  onChange={handleFilterChange}
                >
                  <option value="">Todas</option>
                  {WORK_ORDER_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xl={2} md={4}>
                <CFormLabel htmlFor="areaFilter">Área</CFormLabel>
                <CFormSelect
                  id="areaFilter"
                  name="area"
                  value={filters.area}
                  onChange={handleFilterChange}
                >
                  <option value="">Todas</option>
                  {WORK_ORDER_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xl={2} md={4}>
                <CFormLabel htmlFor="responsibleFilter">Responsable</CFormLabel>
                <CFormSelect
                  id="responsibleFilter"
                  name="responsible"
                  value={filters.responsible}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {normalizedUsers.map((user) => (
                    <option key={`responsible-${user.email || user.id}`} value={user.email || user.name}>
                      {user.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xl={2} className="d-flex align-items-end">
                <CButton
                  color="secondary"
                  type="button"
                  variant="outline"
                  onClick={() => setFilters({ search: '', status: '', priority: '', area: '', responsible: '' })}
                >
                  Limpiar filtros
                </CButton>
              </CCol>
            </CRow>

            <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
              {statusSummary.map((item) => (
                <CBadge color={getStatusColor(item.status)} key={item.status}>
                  {item.status}: {item.count}
                </CBadge>
              ))}
              {areaSummary.map((item) => (
                <CBadge color="light" textColor="dark" key={item.area}>
                  {item.area}: {item.count}
                </CBadge>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <CAlert color="info">
                No hay órdenes de trabajo que coincidan con los filtros actuales.
              </CAlert>
            ) : (
              <CTable responsive align="middle" hover>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Orden</CTableHeaderCell>
                    <CTableHeaderCell>Cliente / empresa</CTableHeaderCell>
                    <CTableHeaderCell>Flujo</CTableHeaderCell>
                    <CTableHeaderCell>Responsables</CTableHeaderCell>
                    <CTableHeaderCell>Prioridad</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                    <CTableHeaderCell>Entrega</CTableHeaderCell>
                    <CTableHeaderCell>Avance</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {filteredOrders.map((order) => {
                    const progress = calculateWorkOrderProgress(order)
                    const completion = getCompletionPercent(order)
                    const checklistProgress = calculateChecklistProgress(order)
                    const overdue = isOverdue(order)
                    const userIsAssignee = isAssignee(order, currentUser)
                    const userIsRequester = isRequester(order, currentUser)

                    return (
                      <CTableRow key={order.id}>
                        <CTableDataCell style={{ minWidth: '260px' }}>
                          <div className="fw-semibold">{order.title}</div>
                          <div className="text-body-secondary small">
                            {order.type}
                            {order.quoteNumber ? ` · Cot. ${order.quoteNumber}` : ''}
                          </div>
                          <div className="d-flex align-items-center gap-1 flex-wrap mt-1">
                            {userIsAssignee && <CBadge color="info">Asignada a mí</CBadge>}
                            {userIsRequester && <CBadge color="primary">Solicitada por mí</CBadge>}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell style={{ minWidth: '220px' }}>
                          <div>{order.client || '-'}</div>
                          <div className="text-body-secondary small">{order.company || '-'}</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="light" textColor="dark">
                            {order.sourceArea} → {order.targetArea}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell style={{ minWidth: '180px' }}>
                          <div className="small">
                            <strong>Solicita:</strong> {order.requesterName}
                          </div>
                          <div className="text-body-secondary small">{order.requesterRole}</div>
                          <div className="small">
                            <strong>Asignado:</strong> {order.assigneeName}
                          </div>
                          <div className="text-body-secondary small">{order.assigneeRole}</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={getPriorityColor(order.priority)}>{order.priority}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={getStatusColor(order.status)}>{order.status}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div>{formatDate(order.dueDate)}</div>
                          {overdue && <CBadge color="danger">Vencida</CBadge>}
                        </CTableDataCell>
                        <CTableDataCell style={{ minWidth: '170px' }}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span>Operativo</span>
                            <strong>{progress}%</strong>
                          </div>
                          <CProgress color={getWorkOrderProgressColor(progress)} value={progress} />
                          <div className="d-flex justify-content-between small mt-2 mb-1">
                            <span>Entregables</span>
                            <strong>{checklistProgress}%</strong>
                          </div>
                          <CProgress
                            thin
                            color={getWorkOrderProgressColor(checklistProgress)}
                            value={checklistProgress}
                          />
                          <div className="d-flex justify-content-between small mt-2 mb-1">
                            <span>Ficha</span>
                            <strong>{completion}%</strong>
                          </div>
                          <CProgress
                            thin
                            color={getCompletionColor(completion)}
                            value={completion}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CButtonGroup size="sm" role="group" aria-label="Acciones de orden">
                            <CButton
                              color="primary"
                              variant="outline"
                              type="button"
                              onClick={() => openDetailModal(order)}
                            >
                              Gestionar
                            </CButton>
                            {canUserUpdateWorkOrder(order, currentUser || {}, hasPermission) && (
                              <CButton
                                color="secondary"
                                variant="outline"
                                type="button"
                                onClick={() => openEditModal(order)}
                              >
                                Editar ficha
                              </CButton>
                            )}
                            {canCreateWorkOrders && (
                              <CButton
                                color="info"
                                variant="outline"
                                type="button"
                                onClick={() => handleDuplicate(order)}
                              >
                                Duplicar
                              </CButton>
                            )}
                            {canDeleteWorkOrders && (
                              <CButton
                                color="danger"
                                variant="outline"
                                type="button"
                                onClick={() => handleDelete(order.id)}
                              >
                                Eliminar
                              </CButton>
                            )}
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

      <CModal visible={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} size="xl">
        <CModalHeader>
          <CModalTitle>Gestionar orden de trabajo</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedOrder && (
            <>
              <CRow className="g-4 mb-4">
                <CCol lg={8}>
                  <CCard className="h-100">
                    <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                      <div>
                        <strong>{selectedOrder.title}</strong>
                        <div className="small text-body-secondary">
                          {selectedOrder.type}
                          {selectedOrder.quoteNumber ? ` · Cot. ${selectedOrder.quoteNumber}` : ''}
                        </div>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <CBadge color={getStatusColor(selectedOrder.status)}>
                          {selectedOrder.status}
                        </CBadge>
                        <CBadge color={getPriorityColor(selectedOrder.priority)}>
                          {selectedOrder.priority}
                        </CBadge>
                      </div>
                    </CCardHeader>
                    <CCardBody>
                      <CRow className="g-3">
                        <CCol md={4}>
                          <div className="text-body-secondary small">Cliente / empresa</div>
                          <div>
                            {selectedOrder.client || '-'} · {selectedOrder.company || '-'}
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <div className="text-body-secondary small">Flujo de área</div>
                          <div>
                            {selectedOrder.sourceArea} → {selectedOrder.targetArea}
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <div className="text-body-secondary small">Entrega</div>
                          <div>{formatDate(selectedOrder.dueDate)}</div>
                          {isOverdue(selectedOrder) && <CBadge color="danger">Vencida</CBadge>}
                        </CCol>
                        <CCol md={6}>
                          <div className="text-body-secondary small">Solicita</div>
                          <div>{selectedOrder.requesterName}</div>
                          <div className="text-body-secondary small">
                            {selectedOrder.requesterRole}
                            {selectedOrder.requesterEmail
                              ? ` · ${selectedOrder.requesterEmail}`
                              : ''}
                          </div>
                        </CCol>
                        <CCol md={6}>
                          <div className="text-body-secondary small">Responsable</div>
                          <div>{selectedOrder.assigneeName}</div>
                          <div className="text-body-secondary small">
                            {selectedOrder.assigneeRole}
                            {selectedOrder.assigneeEmail ? ` · ${selectedOrder.assigneeEmail}` : ''}
                          </div>
                        </CCol>
                        <CCol xs={12}>
                          <div className="text-body-secondary small">Descripción</div>
                          <div>{selectedOrder.description || '-'}</div>
                        </CCol>
                        <CCol md={6}>
                          <div className="text-body-secondary small">Requerimientos / insumos</div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{selectedOrder.requirements || '-'}</div>
                        </CCol>
                        <CCol md={6}>
                          <div className="text-body-secondary small">Entregables esperados</div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{selectedOrder.deliverables || '-'}</div>
                        </CCol>
                      </CRow>
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol lg={4}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Avance operativo</strong>
                    </CCardHeader>
                    <CCardBody>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>Avance total</span>
                        <strong>{calculateWorkOrderProgress(selectedOrder)}%</strong>
                      </div>
                      <CProgress
                        color={getWorkOrderProgressColor(calculateWorkOrderProgress(selectedOrder))}
                        value={calculateWorkOrderProgress(selectedOrder)}
                        className="mb-3"
                      />

                      <div className="d-flex justify-content-between small mb-1">
                        <span>Checklist entregables</span>
                        <strong>{calculateChecklistProgress(selectedOrder)}%</strong>
                      </div>
                      <CProgress
                        color={getWorkOrderProgressColor(calculateChecklistProgress(selectedOrder))}
                        value={calculateChecklistProgress(selectedOrder)}
                        className="mb-3"
                      />

                      <CFormLabel htmlFor="workflowProgress">Avance manual</CFormLabel>
                      <CFormInput
                        id="workflowProgress"
                        type="number"
                        min={0}
                        max={100}
                        value={workflowProgress}
                        disabled={!selectedOrderCanUpdate}
                        onChange={(event) => setWorkflowProgress(Number(event.target.value))}
                      />

                      <CFormLabel htmlFor="workflowComment" className="mt-3">
                        Comentario / observación
                      </CFormLabel>
                      <CFormTextarea
                        id="workflowComment"
                        rows={4}
                        value={workflowComment}
                        disabled={!selectedOrderCanUpdate}
                        onChange={(event) => setWorkflowComment(event.target.value)}
                        placeholder="Describe avance, dudas, antecedentes requeridos, entrega o motivo del cambio."
                      />

                      <div className="d-flex flex-column gap-2 mt-3">
                        <CButton
                          color="secondary"
                          variant="outline"
                          type="button"
                          disabled={!selectedOrderCanUpdate || !workflowComment.trim()}
                          onClick={handleAddComment}
                        >
                          Agregar comentario
                        </CButton>
                        <CButton
                          color="info"
                          variant="outline"
                          type="button"
                          disabled={!selectedOrderCanUpdate}
                          onClick={handleProgressUpdate}
                        >
                          Actualizar avance
                        </CButton>
                      </div>
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>

              <CCard className="mb-4">
                <CCardHeader>
                  <strong>Acciones de flujo</strong>{' '}
                  <small>según responsable, solicitante y permisos del usuario</small>
                </CCardHeader>
                <CCardBody>
                  {selectedOrderActions.length === 0 ? (
                    <CAlert color="info" className="mb-0">
                      No tienes acciones disponibles para esta etapa. Puedes revisar el detalle e
                      historial.
                    </CAlert>
                  ) : (
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {selectedOrderActions.map((item) => (
                        <CButton
                          color={item.color}
                          variant="outline"
                          type="button"
                          key={item.action}
                          onClick={() => handleWorkflowAction(item.action)}
                        >
                          {item.label}
                        </CButton>
                      ))}
                    </div>
                  )}
                </CCardBody>
              </CCard>

              <CRow className="g-4">
                <CCol lg={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Checklist de entregables</strong>
                    </CCardHeader>
                    <CCardBody>
                      {selectedOrder.deliverableChecklist.length === 0 ? (
                        <CAlert color="info" className="mb-0">
                          Esta orden no tiene entregables separados. Puedes definirlos en la ficha
                          usando una línea por entregable.
                        </CAlert>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {selectedOrder.deliverableChecklist.map((item, index) => (
                            <div
                              key={item.id || `${item.label}-${index}`}
                              className="border rounded p-2"
                            >
                              <CFormCheck
                                id={`deliverable-${item.id || index}`}
                                label={item.label}
                                checked={Boolean(item.done)}
                                disabled={!selectedOrderCanUpdate}
                                onChange={(event) =>
                                  handleToggleDeliverable(item, event.target.checked, index)
                                }
                              />
                              {item.doneAt && (
                                <div className="small text-body-secondary ms-4">
                                  Completado: {formatDateTime(item.doneAt)}
                                  {item.doneBy?.name ? ` · ${item.doneBy.name}` : ''}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol lg={6}>
                  <CCard className="h-100">
                    <CCardHeader>
                      <strong>Comentarios internos</strong>
                    </CCardHeader>
                    <CCardBody>
                      {selectedOrder.comments.length === 0 ? (
                        <CAlert color="info" className="mb-0">
                          Sin comentarios registrados.
                        </CAlert>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {selectedOrder.comments.map((comment) => (
                            <div className="border rounded p-3" key={comment.id}>
                              <div className="d-flex justify-content-between gap-2 flex-wrap">
                                <strong>{comment.actor?.name || 'Usuario'}</strong>
                                <span className="small text-body-secondary">
                                  {formatDateTime(comment.createdAt)}
                                </span>
                              </div>
                              <CBadge color="light" textColor="dark" className="my-2">
                                {comment.type}
                              </CBadge>
                              <div style={{ whiteSpace: 'pre-wrap' }}>{comment.message}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol xs={12}>
                  <CCard>
                    <CCardHeader>
                      <strong>Historial de movimientos</strong>
                    </CCardHeader>
                    <CCardBody>
                      <CTable responsive hover small align="middle">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>Fecha</CTableHeaderCell>
                            <CTableHeaderCell>Acción</CTableHeaderCell>
                            <CTableHeaderCell>Estado</CTableHeaderCell>
                            <CTableHeaderCell>Avance</CTableHeaderCell>
                            <CTableHeaderCell>Usuario</CTableHeaderCell>
                            <CTableHeaderCell>Comentario</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {selectedOrder.workflowLog.map((movement) => (
                            <CTableRow key={movement.id}>
                              <CTableDataCell>{formatDateTime(movement.createdAt)}</CTableDataCell>
                              <CTableDataCell>{movement.action}</CTableDataCell>
                              <CTableDataCell>
                                {movement.fromStatus ? `${movement.fromStatus} → ` : ''}
                                <CBadge color={getStatusColor(movement.toStatus)}>
                                  {movement.toStatus || selectedOrder.status}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell>{movement.progress}%</CTableDataCell>
                              <CTableDataCell>
                                <div>{movement.actor?.name || '-'}</div>
                                <div className="small text-body-secondary">
                                  {movement.actor?.role || movement.actor?.email || ''}
                                </div>
                              </CTableDataCell>
                              <CTableDataCell style={{ minWidth: '260px' }}>
                                {movement.message || '-'}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          {selectedOrder && canUserUpdateWorkOrder(selectedOrder, currentUser || {}, hasPermission) && (
            <CButton color="secondary" variant="outline" type="button" onClick={() => openEditModal(selectedOrder)}>
              Editar ficha completa
            </CButton>
          )}
          <CButton color="secondary" type="button" onClick={() => setSelectedOrder(null)}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={visible} onClose={closeModal} size="xl">
        <CForm onSubmit={handleSubmit}>
          <CModalHeader>
            <CModalTitle>
              {editingId ? 'Editar orden de trabajo' : 'Nueva orden de trabajo'}
            </CModalTitle>
          </CModalHeader>

          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}

            <CRow className="g-3">
              <CCol md={8}>
                <CFormLabel htmlFor="title">Título de la orden</CFormLabel>
                <CFormInput
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="type">Tipo</CFormLabel>
                <CFormSelect id="type" name="type" value={formData.type} onChange={handleChange}>
                  {WORK_ORDER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="client">Cliente</CFormLabel>
                <CFormInput
                  id="client"
                  name="client"
                  value={formData.client}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="company">Empresa</CFormLabel>
                <CFormInput
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="quoteNumber">N° cotización asociada</CFormLabel>
                <CFormInput
                  id="quoteNumber"
                  name="quoteNumber"
                  value={formData.quoteNumber}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="requesterEmail">Solicita</CFormLabel>
                <CFormSelect
                  id="requesterEmail"
                  name="requesterEmail"
                  value={formData.requesterEmail}
                  onChange={(event) => handleUserSelect('requester', event)}
                  disabled={editingId && !canAssignWorkOrders && !canCloseWorkOrders}
                >
                  <option value="">Seleccionar usuario</option>
                  {normalizedUsers.map((user) => (
                    <option key={`requester-${user.email || user.id}`} value={user.email}>
                      {user.name} · {user.role || user.position}
                    </option>
                  ))}
                </CFormSelect>
                {formData.requesterName && (
                  <div className="small text-body-secondary mt-1">
                    {formData.requesterRole}
                    {formData.requesterEmail ? ` · ${formData.requesterEmail}` : ''}
                  </div>
                )}
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="assigneeEmail">Asignado a</CFormLabel>
                <CFormSelect
                  id="assigneeEmail"
                  name="assigneeEmail"
                  value={formData.assigneeEmail}
                  onChange={(event) => handleUserSelect('assignee', event)}
                  disabled={editingId && !canAssignWorkOrders}
                >
                  <option value="">Seleccionar usuario</option>
                  {normalizedUsers.map((user) => (
                    <option key={`assignee-${user.email || user.id}`} value={user.email}>
                      {user.name} · {user.role || user.position}
                    </option>
                  ))}
                </CFormSelect>
                {formData.assigneeName && (
                  <div className="small text-body-secondary mt-1">
                    {formData.assigneeRole}
                    {formData.assigneeEmail ? ` · ${formData.assigneeEmail}` : ''}
                  </div>
                )}
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="dueDate">Fecha de entrega</CFormLabel>
                <CFormInput
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="sourceArea">Área solicitante</CFormLabel>
                <CFormSelect
                  id="sourceArea"
                  name="sourceArea"
                  value={formData.sourceArea}
                  onChange={handleChange}
                  disabled={editingId && !canAssignWorkOrders && !canCloseWorkOrders}
                >
                  {WORK_ORDER_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="targetArea">Área responsable</CFormLabel>
                <CFormSelect
                  id="targetArea"
                  name="targetArea"
                  value={formData.targetArea}
                  onChange={handleChange}
                  disabled={editingId && !canAssignWorkOrders}
                >
                  {WORK_ORDER_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="priority">Prioridad</CFormLabel>
                <CFormSelect
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  {WORK_ORDER_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="status">Estado</CFormLabel>
                <CFormSelect
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {WORK_ORDER_STATUSES.filter(
                    (status) =>
                      canCloseWorkOrders || !['Aprobada', 'Finalizada', 'Rechazada'].includes(status),
                  ).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xs={12}>
                <CFormLabel htmlFor="description">Descripción del requerimiento</CFormLabel>
                <CFormTextarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Qué se necesita hacer y por qué área pasa esta solicitud."
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="requirements">Requerimientos / insumos</CFormLabel>
                <CFormTextarea
                  id="requirements"
                  name="requirements"
                  rows={4}
                  value={formData.requirements}
                  onChange={handleChange}
                  placeholder="Medidas, logos, archivos, materiales, fecha límite, referencias, restricciones."
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="deliverables">Entregables esperados</CFormLabel>
                <CFormTextarea
                  id="deliverables"
                  name="deliverables"
                  rows={4}
                  value={formData.deliverables}
                  onChange={handleChange}
                  placeholder="Usa una línea por entregable para activar el checklist."
                />
              </CCol>

              <CCol xs={12}>
                <CFormLabel htmlFor="observations">Observaciones internas</CFormLabel>
                <CFormTextarea
                  id="observations"
                  name="observations"
                  rows={3}
                  value={formData.observations}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>
          </CModalBody>

          <CModalFooter>
            <CButton color="secondary" type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit">
              Guardar orden
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default OrdenesTrabajo
