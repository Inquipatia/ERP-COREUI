import React, { useMemo, useState } from 'react'
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
import { exportListToExcel } from '../../../utils/exportListToExcel'
import { STORAGE_KEYS, useLocalStorageState } from '../../../utils/storage'
import {
  emptyWorkOrder,
  mockWorkOrders,
  normalizeWorkOrder,
  WORK_ORDER_AREAS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STORAGE_KEY,
  WORK_ORDER_TYPES,
} from '../../../utils/workOrderStorage'

const USERS_STORAGE_KEY = STORAGE_KEYS.users || 'rubik.erp.users'

const hasValue = (value) => String(value || '').trim().length > 0

const normalizeUser = (user = {}) => ({
  id: user.id || user.email || user.name || '',
  name: user.name || '',
  email: user.email || '',
  role: user.role || '',
  status: user.status || 'Activo',
  position: user.position || user.cargo || '',
  area: user.area || '',
})

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

const getStatusColor = (status) => {
  if (status === 'Finalizada' || status === 'Aprobada') return 'success'
  if (status === 'En proceso' || status === 'En revisión') return 'info'
  if (status === 'Pausada' || status === 'Borrador') return 'warning'
  if (status === 'Rechazada') return 'danger'
  return 'secondary'
}

const getPriorityColor = (priority) => {
  if (priority === 'Urgente') return 'danger'
  if (priority === 'Alta') return 'warning'
  if (priority === 'Media') return 'info'
  return 'secondary'
}

const getProgressByStatus = (status) => {
  if (status === 'Borrador') return 10
  if (status === 'Pendiente') return 20
  if (status === 'En proceso') return 55
  if (status === 'En revisión') return 75
  if (status === 'Aprobada') return 90
  if (status === 'Finalizada') return 100
  if (status === 'Pausada') return 35
  if (status === 'Rechazada') return 0
  return 0
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
    ].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(search),
    )

  const matchesStatus = !filters.status || order.status === filters.status
  const matchesPriority = !filters.priority || order.priority === filters.priority
  const matchesArea =
    !filters.area || order.sourceArea === filters.area || order.targetArea === filters.area

  return matchesSearch && matchesStatus && matchesPriority && matchesArea
}

const OrdenesTrabajo = () => {
  const { currentUser, hasPermission } = useAuth()
  const canCreateWorkOrders = hasPermission('workorders.create')
  const canAssignWorkOrders = hasPermission('workorders.assign')
  const canCloseWorkOrders = hasPermission('workorders.close')
  const canManageWorkOrders =
    canCreateWorkOrders || canAssignWorkOrders || canCloseWorkOrders || hasPermission('admin.all')
  const [workOrders, setWorkOrders] = useLocalStorageState(
    WORK_ORDER_STORAGE_KEY,
    mockWorkOrders.map(normalizeWorkOrder),
  )
  const [users] = useLocalStorageState(USERS_STORAGE_KEY, mockUsers.map(normalizeUser))
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    area: '',
  })
  const [visible, setVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyWorkOrder)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const normalizedOrders = useMemo(() => workOrders.map(normalizeWorkOrder), [workOrders])
  const normalizedUsers = useMemo(() => getMergedUserOptions(users), [users])
  const visibleOrders = useMemo(() => {
    if (canManageWorkOrders) {
      return normalizedOrders
    }

    const currentEmail = String(currentUser?.email || '').toLowerCase()

    return normalizedOrders.filter(
      (order) => String(order.assigneeEmail || '').toLowerCase() === currentEmail,
    )
  }, [canManageWorkOrders, currentUser?.email, normalizedOrders])

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
      ['En proceso', 'En revisión'].includes(order.status),
    ).length
    const finished = visibleOrders.filter((order) =>
      ['Aprobada', 'Finalizada'].includes(order.status),
    ).length
    const urgent = visibleOrders.filter((order) => order.priority === 'Urgente').length
    const overdue = visibleOrders.filter(isOverdue).length
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
      finished,
      urgent,
      overdue,
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

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleUserSelect = (kind, event) => {
    if (kind === 'assignee' && !canAssignWorkOrders) {
      setError('Tu perfil no permite asignar órdenes de trabajo.')
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
    if (!canAssignWorkOrders && !canCloseWorkOrders) {
      setMessage('Tu perfil solo permite ver órdenes asignadas.')
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

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!editingId && !canCreateWorkOrders) {
      setError('Tu perfil no permite crear órdenes de trabajo.')
      return
    }

    if (editingId && !canAssignWorkOrders && !canCloseWorkOrders) {
      setError('Tu perfil no permite editar órdenes de trabajo.')
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

    setWorkOrders((currentOrders) => {
      if (editingId) {
        return currentOrders.map((order) => (order.id === editingId ? payload : order))
      }

      return [payload, ...currentOrders]
    })

    setMessage(editingId ? 'Orden de trabajo actualizada.' : 'Orden de trabajo creada.')
    closeModal()
  }

  const handleDelete = (orderId) => {
    if (!canAssignWorkOrders) {
      setMessage('Tu perfil no permite eliminar órdenes de trabajo.')
      return
    }

    setWorkOrders((currentOrders) => currentOrders.filter((order) => order.id !== orderId))
    setMessage('Orden de trabajo eliminada localmente.')
  }

  const handleDuplicate = (order) => {
    if (!canCreateWorkOrders) {
      setMessage('Tu perfil no permite duplicar órdenes de trabajo.')
      return
    }

    const duplicatedOrder = normalizeWorkOrder({
      ...order,
      id: undefined,
      title: `${order.title} - copia`,
      status: 'Pendiente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    setWorkOrders((currentOrders) => [duplicatedOrder, ...currentOrders])
    setMessage('Orden de trabajo duplicada.')
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
            header: 'Avance',
            key: 'progress',
            width: 14,
            value: (order) => `${getProgressByStatus(order.status)}%`,
          },
          {
            header: 'Completitud',
            key: 'completion',
            width: 16,
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
          { label: 'Total órdenes guardadas', value: orderSummary.total },
          { label: 'Pendientes', value: orderSummary.pending },
          { label: 'En proceso / revisión', value: orderSummary.inProgress },
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

  return (
    <CRow className="g-4">
      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Órdenes registradas</div>
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
            <div className="small text-body-secondary">borrador o por iniciar</div>
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
            <div className="text-body-secondary small">En proceso / revisión</div>
            <div className="fs-3 fw-semibold">{orderSummary.inProgress}</div>
            <div className="small text-body-secondary">trabajo activo entre áreas</div>
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
            <div className="text-body-secondary small">Urgentes</div>
            <div className="fs-3 fw-semibold">{orderSummary.urgent}</div>
            <div className="small text-body-secondary">prioridad crítica</div>
            <CProgress
              thin
              color="danger"
              value={
                orderSummary.total > 0
                  ? Math.round((orderSummary.urgent / orderSummary.total) * 100)
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Vencidas</div>
            <div className="fs-3 fw-semibold">{orderSummary.overdue}</div>
            <div className="small text-body-secondary">fuera de fecha</div>
            <CProgress
              thin
              color={orderSummary.overdue > 0 ? 'danger' : 'success'}
              value={
                orderSummary.total > 0
                  ? Math.round((orderSummary.overdue / orderSummary.total) * 100)
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Completitud promedio</div>
            <div className="fs-3 fw-semibold">{orderSummary.completion}%</div>
            <div className="small text-body-secondary">calidad de la solicitud</div>
            <CProgress
              thin
              color={getCompletionColor(orderSummary.completion)}
              value={orderSummary.completion}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Órdenes de trabajo internas</strong>{' '}
              <small>Flujo entre ventas, diseño, producción, administración y gerencia</small>
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

            {!canManageWorkOrders && (
              <CAlert color="info">
                Tu perfil muestra solo órdenes asignadas a {currentUser?.email || 'tu usuario'}.
              </CAlert>
            )}

            <CRow className="g-3 mb-3">
              <CCol xl={4} lg={12}>
                <CFormLabel htmlFor="workOrderSearch">Búsqueda inteligente</CFormLabel>
                <CFormInput
                  id="workOrderSearch"
                  name="search"
                  placeholder="Buscar por cliente, orden, área, responsable, estado..."
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

              <CCol xl={2} className="d-flex align-items-end">
                <CButton
                  color="secondary"
                  type="button"
                  variant="outline"
                  onClick={() => setFilters({ search: '', status: '', priority: '', area: '' })}
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
                    const progress = getProgressByStatus(order.status)
                    const completion = getCompletionPercent(order)
                    const overdue = isOverdue(order)

                    return (
                      <CTableRow key={order.id}>
                        <CTableDataCell style={{ minWidth: '260px' }}>
                          <div className="fw-semibold">{order.title}</div>
                          <div className="text-body-secondary small">
                            {order.type}
                            {order.quoteNumber ? ` · Cot. ${order.quoteNumber}` : ''}
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
                        <CTableDataCell style={{ minWidth: '160px' }}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span>Avance</span>
                            <strong>{progress}%</strong>
                          </div>
                          <CProgress color={getStatusColor(order.status)} value={progress} />
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
                              onClick={() => setSelectedOrder(order)}
                            >
                              Ver
                            </CButton>
                            {(canAssignWorkOrders || canCloseWorkOrders) && (
                              <CButton
                                color="secondary"
                                variant="outline"
                                type="button"
                                onClick={() => openEditModal(order)}
                              >
                                Editar
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
                            {canAssignWorkOrders && (
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

      <CModal visible={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} size="lg">
        <CModalHeader>
          <CModalTitle>Orden de trabajo</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedOrder && (
            <>
              <CRow className="g-3 mb-3">
                <CCol md={8}>
                  <div className="text-body-secondary small">Título</div>
                  <div className="fw-semibold">{selectedOrder.title}</div>
                </CCol>
                <CCol md={4}>
                  <div className="text-body-secondary small">Estado</div>
                  <CBadge color={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status}
                  </CBadge>
                </CCol>
                <CCol md={4}>
                  <div className="text-body-secondary small">Tipo</div>
                  <div>{selectedOrder.type}</div>
                </CCol>
                <CCol md={4}>
                  <div className="text-body-secondary small">Prioridad</div>
                  <CBadge color={getPriorityColor(selectedOrder.priority)}>
                    {selectedOrder.priority}
                  </CBadge>
                </CCol>
                <CCol md={4}>
                  <div className="text-body-secondary small">Entrega</div>
                  <div>{formatDate(selectedOrder.dueDate)}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-body-secondary small">Cliente / empresa</div>
                  <div>
                    {selectedOrder.client || '-'} · {selectedOrder.company || '-'}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="text-body-secondary small">Flujo de área</div>
                  <div>
                    {selectedOrder.sourceArea} → {selectedOrder.targetArea}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="text-body-secondary small">Solicita</div>
                  <div>{selectedOrder.requesterName}</div>
                  <div className="text-body-secondary small">
                    {selectedOrder.requesterRole}
                    {selectedOrder.requesterEmail ? ` · ${selectedOrder.requesterEmail}` : ''}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="text-body-secondary small">Asignado a</div>
                  <div>{selectedOrder.assigneeName}</div>
                  <div className="text-body-secondary small">
                    {selectedOrder.assigneeRole}
                    {selectedOrder.assigneeEmail ? ` · ${selectedOrder.assigneeEmail}` : ''}
                  </div>
                </CCol>
              </CRow>

              <div className="mb-3">
                <div className="text-body-secondary small">Descripción</div>
                <div>{selectedOrder.description || '-'}</div>
              </div>

              <div className="mb-3">
                <div className="text-body-secondary small">Requerimientos</div>
                <div>{selectedOrder.requirements || '-'}</div>
              </div>

              <div className="mb-3">
                <div className="text-body-secondary small">Entregables</div>
                <div>{selectedOrder.deliverables || '-'}</div>
              </div>

              <div>
                <div className="text-body-secondary small">Observaciones</div>
                <div>{selectedOrder.observations || '-'}</div>
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
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
                  disabled={!canAssignWorkOrders}
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
                  disabled={!canCreateWorkOrders && !canAssignWorkOrders}
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
                  disabled={!canAssignWorkOrders}
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
                      canCloseWorkOrders || !['Aprobada', 'Finalizada'].includes(status),
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
                  placeholder="Mockup, arte final, presupuesto validado, archivo producción, aprobación, etc."
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
