import { createLocalId } from './storage'

export const WORK_ORDER_STORAGE_KEY = 'rubik.erp.workOrders'

export const WORK_ORDER_STATUSES = [
  'Borrador',
  'Pendiente',
  'Recibida',
  'En proceso',
  'Solicita antecedentes',
  'En revisión',
  'Devuelta con observaciones',
  'Aprobada',
  'Finalizada',
  'Pausada',
  'Rechazada',
]

export const WORK_ORDER_PRIORITIES = ['Baja', 'Media', 'Alta', 'Urgente']

const WORK_ORDER_STATUS_CODE_TO_LABEL = {
  draft: 'Borrador',
  pending: 'Pendiente',
  assigned: 'Recibida',
  in_progress: 'En proceso',
  paused: 'Pausada',
  completed: 'Finalizada',
  cancelled: 'Rechazada',
}

const WORK_ORDER_PRIORITY_CODE_TO_LABEL = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const WORK_ORDER_AREAS = [
  'Ventas',
  'Ventas Públicas',
  'Ventas Privadas',
  'Licitaciones',
  'Marketing',
  'Diseño',
  'Diseño Imprenta',
  'Producción',
  'Taller',
  'Instalaciones',
  'Administración',
  'Contabilidad',
  'Finanzas',
  'Gerencia',
  'Desarrollo',
  'Operaciones',
  'Compras',
  'Bodega',
  'Postventa',
]

export const WORK_ORDER_TYPES = [
  'Diseño gráfico',
  'Producción gráfica',
  'Cotización',
  'Licitación',
  'Instalación',
  'Administrativo',
  'Contable',
  'Marketing',
  'Desarrollo',
  'Compra',
  'Bodega',
  'Postventa',
  'Otro',
]

export const WORK_ORDER_STATUS_PROGRESS = {
  Borrador: 10,
  Pendiente: 20,
  Recibida: 28,
  'En proceso': 55,
  'Solicita antecedentes': 45,
  'En revisión': 78,
  'Devuelta con observaciones': 60,
  Aprobada: 90,
  Finalizada: 100,
  Pausada: 35,
  Rechazada: 0,
}

export const WORK_ORDER_ACTIONS = {
  ACCEPT: 'accept',
  START: 'start',
  REQUEST_INFO: 'request_info',
  SEND_REVIEW: 'send_review',
  RETURN_CHANGES: 'return_changes',
  APPROVE: 'approve',
  FINISH: 'finish',
  PAUSE: 'pause',
  REOPEN: 'reopen',
  REJECT: 'reject',
}

export const emptyWorkOrder = {
  id: '',
  title: '',
  type: 'Producción gráfica',
  client: '',
  company: '',
  quoteNumber: '',
  requesterName: '',
  requesterEmail: '',
  requesterRole: '',
  assigneeName: '',
  assigneeEmail: '',
  assigneeRole: '',
  sourceArea: 'Ventas',
  targetArea: 'Diseño',
  priority: 'Media',
  status: 'Pendiente',
  progressManual: 20,
  dueDate: '',
  description: '',
  requirements: '',
  deliverables: '',
  observations: '',
  deliverableChecklist: [],
  comments: [],
  workflowLog: [],
  createdAt: '',
  updatedAt: '',
}

const getDateOffset = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const safeArray = (value) => (Array.isArray(value) ? value : [])

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase()

const normalizeComparableText = (value = '') =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const normalizeStatusForUi = (status = '') => {
  const normalizedStatus = normalizeComparableText(status).replace(/\s+/g, '_')
  return WORK_ORDER_STATUS_CODE_TO_LABEL[normalizedStatus] || status || 'Pendiente'
}

const normalizePriorityForUi = (priority = '') => {
  const normalizedPriority = normalizeComparableText(priority)
  return WORK_ORDER_PRIORITY_CODE_TO_LABEL[normalizedPriority] || priority || 'Media'
}

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0))

const getActorSnapshot = (actor = {}) => ({
  id: actor.id || actor.email || '',
  name: actor.name || actor.nombre || 'Sistema',
  email: actor.email || '',
  role: actor.role || actor.position || '',
  area: actor.area || '',
})

export const splitTextToItems = (value = '') =>
  String(value || '')
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)

const buildChecklistFromDeliverables = (deliverables = '') =>
  splitTextToItems(deliverables).map((label, index) => ({
    id: createLocalId(`ent-${index}`),
    label,
    done: false,
    doneAt: '',
    doneBy: null,
  }))

const normalizeChecklist = (checklist = [], deliverables = '') => {
  if (Array.isArray(checklist) && checklist.length > 0) {
    return checklist.map((item, index) => ({
      id: item.id || createLocalId(`ent-${index}`),
      label: item.label || item.name || String(item || ''),
      done: Boolean(item.done),
      doneAt: item.doneAt || '',
      doneBy: item.doneBy || null,
    }))
  }

  return buildChecklistFromDeliverables(deliverables)
}

const normalizeComment = (comment = {}) => ({
  id: comment.id || createLocalId('com'),
  type: comment.type || 'Comentario',
  message: comment.message || comment.comment || '',
  createdAt: comment.createdAt || new Date().toISOString(),
  actor: comment.actor || getActorSnapshot(comment.createdBy || {}),
})

const normalizeMovement = (movement = {}) => ({
  id: movement.id || createLocalId('mov'),
  action: movement.action || movement.type || 'Movimiento',
  fromStatus: movement.fromStatus || '',
  toStatus: movement.toStatus || movement.status || '',
  message: movement.message || movement.comment || '',
  progress: clamp(movement.progress ?? 0),
  createdAt: movement.createdAt || new Date().toISOString(),
  actor: movement.actor || getActorSnapshot(movement.createdBy || {}),
})

const getInitialMovement = (workOrder) => ({
  id: createLocalId('mov'),
  action: 'Creación',
  fromStatus: '',
  toStatus: workOrder.status || 'Pendiente',
  message: 'Orden creada en el ERP.',
  progress: clamp(workOrder.progressManual ?? WORK_ORDER_STATUS_PROGRESS[workOrder.status] ?? 20),
  createdAt: workOrder.createdAt || new Date().toISOString(),
  actor: getActorSnapshot({
    name: workOrder.requesterName || 'Sistema',
    email: workOrder.requesterEmail || '',
    role: workOrder.requesterRole || '',
    area: workOrder.sourceArea || '',
  }),
})

export const calculateChecklistProgress = (workOrder = {}) => {
  const checklist = normalizeChecklist(workOrder.deliverableChecklist, workOrder.deliverables)

  if (checklist.length === 0) return 0

  const doneItems = checklist.filter((item) => item.done).length
  return Math.round((doneItems / checklist.length) * 100)
}

export const calculateWorkOrderProgress = (workOrder = {}) => {
  const status = workOrder.status || 'Pendiente'

  if (status === 'Finalizada') return 100
  if (status === 'Rechazada') return 0

  const baseProgress = WORK_ORDER_STATUS_PROGRESS[status] ?? 0
  const manualProgress = clamp(workOrder.progressManual ?? baseProgress)
  const checklistProgress = calculateChecklistProgress(workOrder)

  if (['Borrador', 'Pendiente', 'Recibida'].includes(status)) {
    return clamp(Math.max(baseProgress, Math.round(manualProgress * 0.7 + checklistProgress * 0.3)))
  }

  if (['En proceso', 'Solicita antecedentes', 'Devuelta con observaciones', 'Pausada'].includes(status)) {
    return clamp(Math.max(baseProgress, Math.round(manualProgress * 0.65 + checklistProgress * 0.35)))
  }

  if (status === 'En revisión') {
    return clamp(Math.max(baseProgress, Math.round(manualProgress * 0.45 + checklistProgress * 0.55)))
  }

  if (status === 'Aprobada') return Math.max(90, manualProgress)

  return clamp(Math.max(baseProgress, manualProgress))
}

export const getWorkOrderProgressColor = (progress) => {
  if (progress >= 90) return 'success'
  if (progress >= 65) return 'info'
  if (progress >= 35) return 'warning'
  return 'danger'
}

export const normalizeWorkOrder = (workOrder = {}) => {
  const requesterName = workOrder.requesterName || workOrder.requestedBy || ''
  const assigneeName = workOrder.assigneeName || workOrder.assignedToName || workOrder.assignedTo || ''
  const createdAt = workOrder.createdAt || new Date().toISOString()
  const status = normalizeStatusForUi(workOrder.statusLabel || workOrder.status || 'Pendiente')
  const baseProgress = WORK_ORDER_STATUS_PROGRESS[status] ?? 20
  const deliverables = workOrder.deliverables || ''

  const normalized = {
    ...emptyWorkOrder,
    ...workOrder,
    id: workOrder.id || createLocalId('ot'),
    title: workOrder.title || '',
    type: workOrder.type || 'Producción gráfica',
    workOrderNumber: workOrder.workOrderNumber || workOrder.number || workOrder.id || '',
    clientId: workOrder.clientId || '',
    client: workOrder.clientName || workOrder.client || workOrder.cliente || '',
    clientName: workOrder.clientName || workOrder.client || workOrder.cliente || '',
    company: workOrder.company || workOrder.empresa || '',
    quoteNumber: String(workOrder.quoteNumber || workOrder.numeroCotizacion || ''),
    quoteId: workOrder.quoteId || '',
    documentId: workOrder.documentId || '',
    tenderId: workOrder.tenderId || '',
    requesterName,
    requesterEmail: workOrder.requesterEmail || '',
    requesterRole: workOrder.requesterRole || '',
    assigneeName,
    assigneeEmail: workOrder.assigneeEmail || '',
    assigneeRole: workOrder.assigneeRole || '',
    sourceArea: workOrder.sourceArea || 'Ventas',
    targetArea: workOrder.targetArea || workOrder.assignedArea || 'Diseño',
    assignedArea: workOrder.assignedArea || workOrder.targetArea || 'Diseño',
    assignedToId: workOrder.assignedToId || '',
    assignedToName: assigneeName,
    priority: normalizePriorityForUi(workOrder.priorityLabel || workOrder.priority || 'Media'),
    status,
    progressManual: clamp(workOrder.progressManual ?? baseProgress),
    dueDate: workOrder.dueDate || '',
    startDate: workOrder.startDate || '',
    completedAt: workOrder.completedAt || '',
    description: workOrder.description || '',
    requirements: workOrder.requirements || workOrder.details || '',
    details: workOrder.details || workOrder.requirements || '',
    deliverables,
    observations: workOrder.observations || workOrder.notes || '',
    notes: workOrder.notes || workOrder.observations || '',
    items: safeArray(workOrder.items),
    tasks: safeArray(workOrder.tasks),
    attachments: safeArray(workOrder.attachments),
    deliverableChecklist: normalizeChecklist(workOrder.deliverableChecklist, deliverables),
    comments: safeArray(workOrder.comments).map(normalizeComment),
    workflowLog: safeArray(workOrder.workflowLog || workOrder.movements).map(normalizeMovement),
    createdAt,
    updatedAt: workOrder.updatedAt || createdAt,
  }

  if (normalized.workflowLog.length === 0) {
    normalized.workflowLog = [getInitialMovement(normalized)]
  }

  normalized.progress = calculateWorkOrderProgress(normalized)

  return normalized
}

export const isRequester = (workOrder = {}, user = {}) =>
  normalizeEmail(workOrder.requesterEmail) === normalizeEmail(user.email)

export const isAssignee = (workOrder = {}, user = {}) =>
  normalizeEmail(workOrder.assigneeEmail) === normalizeEmail(user.email)

export const isOwnerOrManager = (user = {}, hasPermission = () => false) =>
  hasPermission('admin.all') ||
  hasPermission('workorders.assign') ||
  hasPermission('workorders.complete') ||
  hasPermission('workorders.delete') ||
  hasPermission('workorders.close')

export const canUserViewWorkOrder = (workOrder = {}, user = {}, hasPermission = () => false) => {
  if (isOwnerOrManager(user, hasPermission)) return true
  return isRequester(workOrder, user) || isAssignee(workOrder, user)
}

export const canUserCreateWorkOrder = (user = {}, hasPermission = () => false) => {
  return hasPermission('workorders.create') || hasPermission('admin.all')
}

export const canUserUpdateWorkOrder = (workOrder = {}, user = {}, hasPermission = () => false) => {
  if (isOwnerOrManager(user, hasPermission)) return true
  return isRequester(workOrder, user) || isAssignee(workOrder, user)
}

export const canUserRunWorkOrderAction = (
  workOrder = {},
  user = {},
  action = '',
  hasPermission = () => false,
) => {
  const assignee = isAssignee(workOrder, user)
  const requester = isRequester(workOrder, user)
  const manager = isOwnerOrManager(user, hasPermission)

  if (manager) return true

  if ([WORK_ORDER_ACTIONS.ACCEPT, WORK_ORDER_ACTIONS.START, WORK_ORDER_ACTIONS.REQUEST_INFO, WORK_ORDER_ACTIONS.SEND_REVIEW, WORK_ORDER_ACTIONS.PAUSE].includes(action)) {
    return assignee
  }

  if ([WORK_ORDER_ACTIONS.RETURN_CHANGES, WORK_ORDER_ACTIONS.APPROVE].includes(action)) {
    return requester
  }

  if ([WORK_ORDER_ACTIONS.FINISH, WORK_ORDER_ACTIONS.REJECT].includes(action)) {
    return hasPermission('workorders.complete') || hasPermission('workorders.close')
  }

  if (action === WORK_ORDER_ACTIONS.REOPEN) {
    return requester || assignee
  }

  return requester || assignee
}

const getStatusForAction = (action, currentStatus) => {
  if (action === WORK_ORDER_ACTIONS.ACCEPT) return 'Recibida'
  if (action === WORK_ORDER_ACTIONS.START) return 'En proceso'
  if (action === WORK_ORDER_ACTIONS.REQUEST_INFO) return 'Solicita antecedentes'
  if (action === WORK_ORDER_ACTIONS.SEND_REVIEW) return 'En revisión'
  if (action === WORK_ORDER_ACTIONS.RETURN_CHANGES) return 'Devuelta con observaciones'
  if (action === WORK_ORDER_ACTIONS.APPROVE) return 'Aprobada'
  if (action === WORK_ORDER_ACTIONS.FINISH) return 'Finalizada'
  if (action === WORK_ORDER_ACTIONS.PAUSE) return 'Pausada'
  if (action === WORK_ORDER_ACTIONS.REOPEN) return currentStatus === 'Pausada' ? 'En proceso' : 'Pendiente'
  if (action === WORK_ORDER_ACTIONS.REJECT) return 'Rechazada'

  return currentStatus
}

const getActionLabel = (action) => {
  if (action === WORK_ORDER_ACTIONS.ACCEPT) return 'Orden recibida'
  if (action === WORK_ORDER_ACTIONS.START) return 'Inicio de trabajo'
  if (action === WORK_ORDER_ACTIONS.REQUEST_INFO) return 'Solicitud de antecedentes'
  if (action === WORK_ORDER_ACTIONS.SEND_REVIEW) return 'Envío a revisión'
  if (action === WORK_ORDER_ACTIONS.RETURN_CHANGES) return 'Devuelta con observaciones'
  if (action === WORK_ORDER_ACTIONS.APPROVE) return 'Aprobación'
  if (action === WORK_ORDER_ACTIONS.FINISH) return 'Cierre final'
  if (action === WORK_ORDER_ACTIONS.PAUSE) return 'Pausa'
  if (action === WORK_ORDER_ACTIONS.REOPEN) return 'Reapertura'
  if (action === WORK_ORDER_ACTIONS.REJECT) return 'Rechazo'

  return 'Movimiento'
}

export const addWorkOrderComment = (workOrder = {}, { actor, message, type = 'Comentario' } = {}) => {
  const normalized = normalizeWorkOrder(workOrder)
  const trimmedMessage = String(message || '').trim()

  if (!trimmedMessage) return normalized

  const comment = normalizeComment({
    type,
    message: trimmedMessage,
    actor: getActorSnapshot(actor),
  })

  const movement = normalizeMovement({
    action: type,
    fromStatus: normalized.status,
    toStatus: normalized.status,
    message: trimmedMessage,
    progress: calculateWorkOrderProgress(normalized),
    actor: getActorSnapshot(actor),
  })

  return normalizeWorkOrder({
    ...normalized,
    comments: [comment, ...normalized.comments],
    workflowLog: [movement, ...normalized.workflowLog],
    updatedAt: new Date().toISOString(),
  })
}

export const updateWorkOrderStatus = (
  workOrder = {},
  { action, status, actor, message = '', progressManual } = {},
) => {
  const normalized = normalizeWorkOrder(workOrder)
  const nextStatus = status || getStatusForAction(action, normalized.status)
  const nextProgress = clamp(progressManual ?? WORK_ORDER_STATUS_PROGRESS[nextStatus] ?? normalized.progressManual)
  const movement = normalizeMovement({
    action: getActionLabel(action) || 'Cambio de estado',
    fromStatus: normalized.status,
    toStatus: nextStatus,
    message,
    progress: nextProgress,
    actor: getActorSnapshot(actor),
  })

  return normalizeWorkOrder({
    ...normalized,
    status: nextStatus,
    progressManual: nextProgress,
    workflowLog: [movement, ...normalized.workflowLog],
    updatedAt: new Date().toISOString(),
  })
}

export const updateWorkOrderProgress = (
  workOrder = {},
  { actor, progressManual, message = '' } = {},
) => {
  const normalized = normalizeWorkOrder(workOrder)
  const nextProgress = clamp(progressManual)
  const movement = normalizeMovement({
    action: 'Actualización de avance',
    fromStatus: normalized.status,
    toStatus: normalized.status,
    message: message || `Avance actualizado a ${nextProgress}%.`,
    progress: nextProgress,
    actor: getActorSnapshot(actor),
  })

  return normalizeWorkOrder({
    ...normalized,
    progressManual: nextProgress,
    workflowLog: [movement, ...normalized.workflowLog],
    updatedAt: new Date().toISOString(),
  })
}

export const toggleWorkOrderDeliverable = (
  workOrder = {},
  { deliverableId, index, done, actor } = {},
) => {
  const normalized = normalizeWorkOrder(workOrder)
  const checklist = normalized.deliverableChecklist.map((item, itemIndex) => {
    const matchesTarget =
      (deliverableId && item.id === deliverableId) || (!deliverableId && itemIndex === index)

    if (!matchesTarget) return item

    return {
      ...item,
      done: Boolean(done),
      doneAt: done ? new Date().toISOString() : '',
      doneBy: done ? getActorSnapshot(actor) : null,
    }
  })

  const targetItem = checklist.find((item, itemIndex) =>
    deliverableId ? item.id === deliverableId : itemIndex === index,
  )

  const movement = normalizeMovement({
    action: done ? 'Entregable completado' : 'Entregable reabierto',
    fromStatus: normalized.status,
    toStatus: normalized.status,
    message: targetItem?.label || '',
    progress: calculateWorkOrderProgress({ ...normalized, deliverableChecklist: checklist }),
    actor: getActorSnapshot(actor),
  })

  return normalizeWorkOrder({
    ...normalized,
    deliverableChecklist: checklist,
    workflowLog: [movement, ...normalized.workflowLog],
    updatedAt: new Date().toISOString(),
  })
}

export const getAvailableWorkOrderActions = (workOrder = {}, user = {}, hasPermission = () => false) => {
  const normalized = normalizeWorkOrder(workOrder)
  const status = normalized.status

  return [
    {
      action: WORK_ORDER_ACTIONS.ACCEPT,
      label: 'Aceptar / recibida',
      color: 'primary',
      visible: ['Pendiente', 'Borrador'].includes(status),
    },
    {
      action: WORK_ORDER_ACTIONS.START,
      label: 'Iniciar trabajo',
      color: 'info',
      visible: ['Pendiente', 'Recibida', 'Devuelta con observaciones'].includes(status),
    },
    {
      action: WORK_ORDER_ACTIONS.REQUEST_INFO,
      label: 'Solicitar antecedentes',
      color: 'warning',
      visible: !['Finalizada', 'Aprobada', 'Rechazada'].includes(status),
    },
    {
      action: WORK_ORDER_ACTIONS.SEND_REVIEW,
      label: 'Enviar a revisión',
      color: 'success',
      visible: ['En proceso', 'Solicita antecedentes', 'Devuelta con observaciones', 'Pausada'].includes(status),
    },
    {
      action: WORK_ORDER_ACTIONS.RETURN_CHANGES,
      label: 'Devolver con observaciones',
      color: 'warning',
      visible: ['En revisión', 'Aprobada'].includes(status),
    },
    {
      action: WORK_ORDER_ACTIONS.APPROVE,
      label: 'Aprobar entrega',
      color: 'success',
      visible: status === 'En revisión',
    },
    {
      action: WORK_ORDER_ACTIONS.FINISH,
      label: 'Finalizar',
      color: 'success',
      visible: ['Aprobada', 'En revisión'].includes(status),
    },
    {
      action: WORK_ORDER_ACTIONS.PAUSE,
      label: 'Pausar',
      color: 'secondary',
      visible: ['En proceso', 'Recibida'].includes(status),
    },
    {
      action: WORK_ORDER_ACTIONS.REOPEN,
      label: 'Reabrir',
      color: 'info',
      visible: ['Pausada', 'Rechazada', 'Aprobada'].includes(status),
    },
    {
      action: WORK_ORDER_ACTIONS.REJECT,
      label: 'Rechazar',
      color: 'danger',
      visible: !['Finalizada', 'Rechazada'].includes(status),
    },
  ].filter((item) => item.visible && canUserRunWorkOrderAction(normalized, user, item.action, hasPermission))
}

export const mockWorkOrders = [
  normalizeWorkOrder({
    title: 'Diseño propuesta municipal',
    type: 'Licitación',
    client: 'Municipalidad',
    company: 'Cliente público',
    quoteNumber: '8103',
    requesterName: 'Erick Cabrera',
    requesterEmail: 'erick@rubikcreaciones.cl',
    requesterRole: 'Venta Pública',
    assigneeName: 'Mathias Olavarria',
    assigneeEmail: 'm.olavarria@rubikcreaciones.cl',
    assigneeRole: 'Diseño / Publicidad',
    sourceArea: 'Ventas Públicas',
    targetArea: 'Diseño',
    priority: 'Alta',
    status: 'En proceso',
    progressManual: 62,
    dueDate: getDateOffset(3),
    description: 'Preparar propuesta gráfica y respaldo visual para cotización.',
    requirements: 'Revisar medidas, materialidad, logo y estilo solicitado.',
    deliverables: 'Mockup visual\nDescripción técnica\nArchivo editable si aplica',
    comments: [
      {
        type: 'Avance',
        message: 'Se está revisando la línea visual y las medidas.',
        actor: { name: 'Mathias Olavarria', email: 'm.olavarria@rubikcreaciones.cl', role: 'Diseño y publicidad' },
      },
    ],
  }),
  normalizeWorkOrder({
    title: 'Revisión de costos para producción',
    type: 'Producción gráfica',
    client: 'Cliente interno',
    company: 'Rubik Creaciones',
    quoteNumber: '8104',
    requesterName: 'Jorge Gutiérrez',
    requesterEmail: 'jgutierrez@rubikcreaciones.cl',
    requesterRole: 'Diseño / Diseño Imprenta',
    assigneeName: 'Ignacio Martínez',
    assigneeEmail: 'Ignacio.m@rubikcreaciones.cl',
    assigneeRole: 'Jefe de taller',
    sourceArea: 'Diseño Imprenta',
    targetArea: 'Taller',
    priority: 'Media',
    status: 'Pendiente',
    dueDate: getDateOffset(5),
    description: 'Validar factibilidad técnica y costos base antes de enviar propuesta.',
    requirements: 'Confirmar materiales, tiempos, merma y disponibilidad.',
    deliverables: 'Costo validado\nObservaciones de producción',
  }),
  normalizeWorkOrder({
    title: 'Campaña de redes para lanzamiento',
    type: 'Marketing',
    client: 'Rubik Creaciones',
    company: 'Rubik Creaciones SPA',
    quoteNumber: '',
    requesterName: 'Benjamin Rojas',
    requesterEmail: 'brojas.romero@rubikcreaciones.cl',
    requesterRole: 'Gerencia / Dueño',
    assigneeName: 'Mathias Olavarria',
    assigneeEmail: 'm.olavarria@rubikcreaciones.cl',
    assigneeRole: 'Diseño / Publicidad',
    sourceArea: 'Gerencia',
    targetArea: 'Marketing',
    priority: 'Urgente',
    status: 'En revisión',
    progressManual: 82,
    dueDate: getDateOffset(-1),
    description: 'Armar piezas y parrilla de contenidos para campaña digital interna.',
    requirements: 'Definir canales, tono, calendario y piezas gráficas principales.',
    deliverables: 'Calendario de publicaciones\nCopies\nDiseño base para redes sociales',
  }),
  normalizeWorkOrder({
    title: 'Preparar despacho e instalación',
    type: 'Instalación',
    client: 'Comercial Sur',
    company: 'Comercial Sur Ltda.',
    quoteNumber: '8105',
    requesterName: 'Rodrigo Sepúlveda',
    requesterEmail: 'rsepulveda@rubikcreaciones.cl',
    requesterRole: 'Jefe Venta',
    assigneeName: 'Ignacio Martínez',
    assigneeEmail: 'Ignacio.m@rubikcreaciones.cl',
    assigneeRole: 'Jefe de taller',
    sourceArea: 'Ventas',
    targetArea: 'Instalaciones',
    priority: 'Alta',
    status: 'Borrador',
    dueDate: getDateOffset(8),
    description: 'Coordinar equipo, herramientas y ventana horaria para instalación gráfica.',
    requirements: 'Validar dirección, permisos de acceso y responsable en terreno.',
    deliverables: 'Orden de instalación\nChecklist operativo',
  }),
]
