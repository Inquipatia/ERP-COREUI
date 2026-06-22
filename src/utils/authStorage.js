import { mockUsers, TEMP_DEV_PASSWORD } from '../data/mockUsers'
import { readStorage, STORAGE_KEYS, writeStorage } from './storage'

export const AUTH_STORAGE_KEY = STORAGE_KEYS.currentUser || 'rubik.erp.currentUser'

export const PERMISSIONS = [
  'dashboard.view',
  'clients.view',
  'clients.manage',
  'quotes.view',
  'quotes.create',
  'quotes.edit',
  'quotes.approve',
  'quotes.export',
  'documents.view',
  'documents.manage',
  'tenders.view',
  'tenders.analyze',
  'tenders.export',
  'workorders.view',
  'workorders.create',
  'workorders.assign',
  'workorders.close',
  'users.view',
  'users.manage',
  'materials.view',
  'materials.manage',
  'products.view',
  'products.manage',
  'finance.view',
  'finance.manage',
  'finance.payments',
  'finance.reports',
  'finance.export',
  'suppliers.view',
  'suppliers.manage',
  'expenses.view',
  'expenses.manage',
  'ai.chat',
  'ai.finance',
  'admin.all',
]

const OWNER_EMAILS = [
  'r.rojas@rubikcreaciones.cl',
  'brojas.romero@rubikcreaciones.cl',
  'contacto@rubikcreaciones.cl',
]

const LIMITED_WORK_ORDER_EMAILS = ['jgutierrez@rubikcreaciones.cl']

const uniq = (values) => [...new Set((values || []).filter(Boolean))]

export const fixEncodingArtifacts = (value = '') =>
  String(value)
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Ã¼/g, 'ü')
    .replace(/Â·/g, '·')
    .replace(/Â°/g, '°')
    .replace(/â†’/g, '→')

const canonicalText = (value = '') =>
  fixEncodingArtifacts(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const SALES_PUBLIC_PERMISSIONS = [
  'dashboard.view',
  'clients.view',
  'clients.manage',
  'quotes.view',
  'quotes.create',
  'quotes.edit',
  'quotes.export',
  'documents.view',
  'tenders.view',
  'tenders.analyze',
  'tenders.export',
  'workorders.view',
  'workorders.create',
  'ai.chat',
]

const SALES_MANAGER_PERMISSIONS = [
  'dashboard.view',
  'clients.view',
  'clients.manage',
  'quotes.view',
  'quotes.create',
  'quotes.edit',
  'quotes.approve',
  'quotes.export',
  'documents.view',
  'documents.manage',
  'tenders.view',
  'tenders.analyze',
  'tenders.export',
  'workorders.view',
  'workorders.create',
  'workorders.assign',
  'ai.chat',
]

const ROLE_PERMISSION_MAP = {
  'gerencia/admin': PERMISSIONS,
  administrador: PERMISSIONS,
  gerencia: PERMISSIONS,
  gerente: PERMISSIONS,
  dueno: PERMISSIONS,
  duena: PERMISSIONS,
  'gerencia / dueno / finanzas': PERMISSIONS,
  'gerente / dueno / finanzas': PERMISSIONS,
  'gerencia / dueno': PERMISSIONS,

  finanzas: [
    'dashboard.view',
    'clients.view',
    'clients.manage',
    'quotes.view',
    'quotes.create',
    'quotes.edit',
    'quotes.approve',
    'quotes.export',
    'documents.view',
    'documents.manage',
    'tenders.view',
    'tenders.analyze',
    'tenders.export',
    'workorders.view',
    'workorders.create',
    'workorders.assign',
    'workorders.close',
    'finance.view',
    'finance.manage',
    'finance.payments',
    'finance.reports',
    'finance.export',
    'suppliers.view',
    'suppliers.manage',
    'expenses.view',
    'expenses.manage',
    'ai.chat',
    'ai.finance',
  ],

  'jefe de ventas': SALES_MANAGER_PERMISSIONS,
  'jefe venta': SALES_MANAGER_PERMISSIONS,

  'ejecutivo venta publica': SALES_PUBLIC_PERMISSIONS,
  'venta publica': SALES_PUBLIC_PERMISSIONS,
  licitaciones: SALES_PUBLIC_PERMISSIONS,

  'jefe venta privada': [
    'dashboard.view',
    'clients.view',
    'clients.manage',
    'quotes.view',
    'quotes.create',
    'quotes.edit',
    'quotes.export',
    'documents.view',
    'documents.manage',
    'tenders.view',
    'tenders.analyze',
    'tenders.export',
    'workorders.view',
    'workorders.create',
    'ai.chat',
  ],

  'jefe de taller': [
    'dashboard.view',
    'workorders.view',
    'workorders.create',
    'workorders.assign',
    'workorders.close',
    'materials.view',
    'materials.manage',
    'products.view',
    'products.manage',
    'documents.view',
    'ai.chat',
  ],

  'diseno y publicidad': [
    'dashboard.view',
    'workorders.view',
    'workorders.create',
    'documents.view',
    'tenders.view',
    'ai.chat',
  ],
  'diseno / publicidad': [
    'dashboard.view',
    'workorders.view',
    'workorders.create',
    'documents.view',
    'tenders.view',
    'ai.chat',
  ],

  // Jorge queda limitado: puede ver órdenes/documentos, pero NO crear órdenes.
  'disenador imprenta': ['dashboard.view', 'workorders.view', 'documents.view', 'ai.chat'],
  'diseno / diseno imprenta': ['dashboard.view', 'workorders.view', 'documents.view', 'ai.chat'],

  ventas: [
    'dashboard.view',
    'clients.view',
    'clients.manage',
    'quotes.view',
    'quotes.create',
    'quotes.edit',
    'documents.view',
    'workorders.view',
    'workorders.create',
    'ai.chat',
  ],
  produccion: [
    'dashboard.view',
    'workorders.view',
    'workorders.create',
    'workorders.assign',
    'workorders.close',
    'materials.view',
    'products.view',
    'documents.view',
    'ai.chat',
  ],
  diseno: ['dashboard.view', 'workorders.view', 'workorders.create', 'documents.view', 'ai.chat'],
}

export const ROUTE_PERMISSIONS = [
  { prefix: '/erp/asistente', permission: 'ai.chat' },
  { prefix: '/erp/administracion/finanzas', permission: 'finance.view' },
  { prefix: '/erp/administracion/pagos', permission: 'finance.view' },
  { prefix: '/erp/administracion/cuentas-por-cobrar', permission: 'finance.view' },
  { prefix: '/erp/administracion/cuentas-por-pagar', permission: 'finance.view' },
  { prefix: '/erp/administracion/proveedores', permission: 'suppliers.view' },
  { prefix: '/erp/administracion/gastos', permission: 'expenses.view' },
  { prefix: '/erp/dashboard', permission: 'dashboard.view' },
  { prefix: '/erp/usuarios', permission: 'users.view' },
  { prefix: '/erp/clientes', permission: 'clients.view' },
  { prefix: '/erp/materiales', permission: 'materials.view' },
  { prefix: '/erp/productos-servicios', permission: 'products.view' },
  { prefix: '/erp/cotizaciones', permission: 'quotes.view' },
  { prefix: '/erp/documentos', permission: 'documents.view' },
  { prefix: '/erp/licitaciones', permission: 'tenders.view' },
  { prefix: '/erp/ordenes-trabajo', permission: 'workorders.view' },
  { prefix: '/erp/configuracion', permission: 'admin.all' },
  { prefix: '/erp', permission: 'dashboard.view' },
  { prefix: '/cotizador-5000/nueva-cotizacion', permission: 'quotes.create' },
  { prefix: '/cotizador-5000', permission: 'quotes.create' },
]

export const normalizeRole = (role = '') => {
  const normalizedRole = canonicalText(role)

  if (
    normalizedRole.includes('gerencia/admin') ||
    normalizedRole.includes('administrador') ||
    normalizedRole.includes('gerente') ||
    normalizedRole.includes('gerencia') ||
    normalizedRole.includes('dueno') ||
    normalizedRole.includes('duena')
  ) {
    return 'Gerencia/Admin'
  }

  if (normalizedRole.includes('finanzas') && !normalizedRole.includes('venta privada')) {
    return 'Finanzas'
  }

  if (normalizedRole.includes('jefe') && normalizedRole.includes('venta privada')) {
    return 'Jefe venta privada'
  }

  if (normalizedRole.includes('jefe') && normalizedRole.includes('venta')) {
    return 'Jefe de ventas'
  }

  if (normalizedRole.includes('venta publica') || normalizedRole.includes('licitaciones')) {
    return 'Ejecutivo venta pública'
  }

  if (normalizedRole.includes('taller') || normalizedRole.includes('produccion')) {
    return 'Jefe de taller'
  }

  if (normalizedRole.includes('publicidad') || normalizedRole.includes('marketing')) {
    return 'Diseño y publicidad'
  }

  if (normalizedRole.includes('imprenta')) {
    return 'Diseñador imprenta'
  }

  if (normalizedRole.includes('diseno')) {
    return 'Diseño'
  }

  return fixEncodingArtifacts(role || 'Ventas')
}

export const getPermissionsForRole = (role = '') => {
  const normalizedRole = normalizeRole(role)
  const key = canonicalText(normalizedRole)
  const directPermissions = ROLE_PERMISSION_MAP[key] || ROLE_PERMISSION_MAP[canonicalText(role)]

  return uniq(directPermissions || ['dashboard.view'])
}

export const normalizeAuthUser = (user = {}) => {
  const normalizedEmail = String(user.email || '').trim().toLowerCase()
  const isOwner = OWNER_EMAILS.includes(normalizedEmail)
  const isWorkOrderLimited = LIMITED_WORK_ORDER_EMAILS.includes(normalizedEmail)
  const normalizedRole = isOwner ? 'Gerencia/Admin' : normalizeRole(user.role || user.position || '')

  let permissions = user.permissions?.length
    ? user.permissions
    : getPermissionsForRole(normalizedRole || user.role)

  // Dueños: Ramón, Benjamin e Ivone siempre tienen todo, aunque localStorage tenga rol antiguo.
  if (isOwner) {
    permissions = PERMISSIONS
  }

  // Regla Rubik: todos pueden crear órdenes de trabajo, excepto Jorge.
  if (!isOwner && !isWorkOrderLimited) {
    permissions = uniq([...permissions, 'workorders.view', 'workorders.create'])
  }

  // Jorge: puede ver órdenes/documentos, pero no crear/asignar/cerrar órdenes.
  if (isWorkOrderLimited) {
    permissions = uniq([...permissions, 'dashboard.view', 'workorders.view', 'documents.view', 'ai.chat'])
    permissions = permissions.filter(
      (permission) =>
        !['workorders.create', 'workorders.assign', 'workorders.close'].includes(permission),
    )
  }

  const normalizedUser = {
    id: user.id || user.email || '',
    name: fixEncodingArtifacts(user.name || ''),
    email: String(user.email || '').trim(),
    role: normalizedRole,
    status: user.status || 'Activo',
    position: fixEncodingArtifacts(user.position || user.cargo || normalizedRole),
    area: fixEncodingArtifacts(user.area || ''),
    permissions: uniq(permissions),
    password: user.password || TEMP_DEV_PASSWORD,
  }

  return normalizedUser
}

export const getAuthUsers = () => {
  const storedUsers = readStorage(STORAGE_KEYS.users, [])
  const usersByEmail = new Map()

  mockUsers.map(normalizeAuthUser).forEach((user) => {
    if (!user.email) return
    usersByEmail.set(user.email.toLowerCase(), user)
  })

  ;(Array.isArray(storedUsers) ? storedUsers : []).map(normalizeAuthUser).forEach((user) => {
    if (!user.email) return
    const baseUser = usersByEmail.get(user.email.toLowerCase())

    usersByEmail.set(user.email.toLowerCase(), {
      ...baseUser,
      ...user,
      id: user.id || baseUser?.id || user.email,
      role: OWNER_EMAILS.includes(user.email.toLowerCase()) ? 'Gerencia/Admin' : user.role,
      status: user.status || baseUser?.status || 'Activo',
      permissions: normalizeAuthUser({ ...baseUser, ...user }).permissions,
      password: user.password || baseUser?.password || TEMP_DEV_PASSWORD,
    })
  })

  return Array.from(usersByEmail.values())
}

export const getCurrentUser = () => {
  const storedUser = readStorage(AUTH_STORAGE_KEY, null)
  if (!storedUser) return null

  const { password, ...sessionUser } = normalizeAuthUser(storedUser)
  return sessionUser
}

export const setCurrentUser = (user) => {
  const normalizedUser = normalizeAuthUser(user)
  const { password, ...sessionUser } = normalizedUser
  writeStorage(AUTH_STORAGE_KEY, sessionUser)
  return sessionUser
}

export const clearCurrentUser = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

export const loginWithCredentials = ({ email, password }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedPassword = String(password || '')
  const user = getAuthUsers().find((candidate) => candidate.email.toLowerCase() === normalizedEmail)

  if (!user) {
    return { ok: false, error: 'No existe un usuario con ese email.' }
  }

  if (user.status !== 'Activo') {
    return { ok: false, error: 'El usuario no está activo.' }
  }

  if (String(user.password || TEMP_DEV_PASSWORD) !== normalizedPassword) {
    return { ok: false, error: 'Contraseña incorrecta.' }
  }

  return { ok: true, user: setCurrentUser(user) }
}

export const loginWithEmailAndPassword = loginWithCredentials

export const logout = clearCurrentUser

export const userHasPermission = (user, permission) => {
  if (!permission) return true
  if (!user) return false

  const normalizedUser = normalizeAuthUser(user)

  return normalizedUser.permissions.includes('admin.all') || normalizedUser.permissions.includes(permission)
}

export const hasPermission = userHasPermission

export const canAccessPath = (user, pathname = '') => {
  if (!pathname || pathname === '/login' || pathname === '/no-permission') return true
  if (!user) return false

  const routeRule = [...ROUTE_PERMISSIONS]
    .sort((first, second) => second.prefix.length - first.prefix.length)
    .find((rule) => pathname.startsWith(rule.prefix))

  if (!routeRule) return true

  return userHasPermission(user, routeRule.permission)
}

export const canAccessRoute = canAccessPath

export const getDefaultRouteForUser = (user) => {
  if (!user) return '/login'
  if (userHasPermission(user, 'dashboard.view')) return '/erp/dashboard'
  if (userHasPermission(user, 'workorders.view')) return '/erp/ordenes-trabajo'
  if (userHasPermission(user, 'tenders.view')) return '/erp/licitaciones'
  if (userHasPermission(user, 'quotes.view')) return '/erp/cotizaciones'
  return '/no-permission'
}

export const filterNavigationByPermissions = (items = [], hasPermissionCallback = () => true) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      if (Array.isArray(item.items)) {
        const filteredItems = filterNavigationByPermissions(item.items, hasPermissionCallback)

        if (item.permission && !hasPermissionCallback(item.permission)) {
          return null
        }

        if (filteredItems.length === 0) {
          return null
        }

        return { ...item, items: filteredItems }
      }

      if (item.permission && !hasPermissionCallback(item.permission)) {
        return null
      }

      return item
    })
    .filter(Boolean)
