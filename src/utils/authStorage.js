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
  'ai.chat',
  'ai.finance',
  'admin.all',
]

const uniq = (values) => [...new Set(values.filter(Boolean))]

const fixEncodingArtifacts = (value = '') =>
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

const canonicalText = (value = '') =>
  fixEncodingArtifacts(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const ROLE_PERMISSION_MAP = {
  'gerencia/admin': PERMISSIONS,
  administrador: PERMISSIONS,
  gerencia: PERMISSIONS,
  'gerente / dueno / finanzas': PERMISSIONS,
  'gerencia / dueno': PERMISSIONS,
  finanzas: [
    'dashboard.view',
    'quotes.view',
    'quotes.create',
    'quotes.edit',
    'quotes.approve',
    'quotes.export',
    'documents.view',
    'documents.manage',
    'tenders.view',
    'tenders.export',
    'finance.view',
    'finance.manage',
    'ai.chat',
    'ai.finance',
  ],
  'finanzas / duena': [
    'dashboard.view',
    'quotes.view',
    'quotes.create',
    'quotes.edit',
    'quotes.approve',
    'quotes.export',
    'documents.view',
    'documents.manage',
    'tenders.view',
    'tenders.export',
    'finance.view',
    'finance.manage',
    'ai.chat',
    'ai.finance',
  ],
  'jefe de ventas': [
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
  ],
  'jefe venta': [
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
  ],
  'ejecutivo venta publica': [
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
  ],
  'venta publica': [
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
  ],
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
    'workorders.view',
    'workorders.create',
    'ai.chat',
  ],
  'jefe venta privada / finanzas': [
    'dashboard.view',
    'clients.view',
    'clients.manage',
    'quotes.view',
    'quotes.create',
    'quotes.edit',
    'quotes.export',
    'documents.view',
    'documents.manage',
    'workorders.view',
    'workorders.create',
    'ai.chat',
  ],
  'jefe de taller': [
    'dashboard.view',
    'workorders.view',
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
    'documents.view',
    'tenders.view',
    'ai.chat',
  ],
  'diseno / publicidad': [
    'dashboard.view',
    'workorders.view',
    'documents.view',
    'tenders.view',
    'ai.chat',
  ],
  'disenador imprenta': ['dashboard.view', 'workorders.view', 'documents.view', 'ai.chat'],
  'diseno / diseno imprenta': [
    'dashboard.view',
    'workorders.view',
    'documents.view',
    'ai.chat',
  ],
  ventas: ['dashboard.view', 'clients.view', 'quotes.view', 'quotes.create', 'workorders.view'],
  produccion: ['dashboard.view', 'workorders.view', 'materials.view', 'products.view'],
  diseno: ['dashboard.view', 'workorders.view', 'documents.view', 'ai.chat'],
}

export const ROUTE_PERMISSIONS = [
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

  if (normalizedRole.includes('gerente') || normalizedRole === 'gerencia') return 'Gerencia/Admin'
  if (normalizedRole.includes('gerencia/admin')) return 'Gerencia/Admin'
  if (normalizedRole.includes('finanzas') && !normalizedRole.includes('venta privada'))
    return 'Finanzas'
  if (normalizedRole.includes('jefe') && normalizedRole.includes('venta privada'))
    return 'Jefe venta privada'
  if (normalizedRole.includes('jefe') && normalizedRole.includes('venta')) return 'Jefe de ventas'
  if (normalizedRole.includes('venta publica')) return 'Ejecutivo venta pública'
  if (normalizedRole.includes('taller')) return 'Jefe de taller'
  if (normalizedRole.includes('publicidad')) return 'Diseño y publicidad'
  if (normalizedRole.includes('imprenta')) return 'Diseñador imprenta'
  if (normalizedRole.includes('administrador')) return 'Gerencia/Admin'

  return fixEncodingArtifacts(role || 'Ventas')
}

export const getPermissionsForRole = (role = '') => {
  const key = canonicalText(normalizeRole(role))
  const directPermissions = ROLE_PERMISSION_MAP[key] || ROLE_PERMISSION_MAP[canonicalText(role)]

  return uniq(directPermissions || ['dashboard.view'])
}

export const normalizeAuthUser = (user = {}) => {
  const normalizedRole = normalizeRole(user.role || user.position || '')
  const permissions = user.permissions?.length ? user.permissions : getPermissionsForRole(normalizedRole)

  return {
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
}

export const getAuthUsers = () => {
  const storedUsers = readStorage(STORAGE_KEYS.users, [])
  const usersByEmail = new Map()

  mockUsers.map(normalizeAuthUser).forEach((user) => {
    usersByEmail.set(user.email.toLowerCase(), user)
  })

  ;(Array.isArray(storedUsers) ? storedUsers : []).map(normalizeAuthUser).forEach((user) => {
    if (!user.email) return
    const baseUser = usersByEmail.get(user.email.toLowerCase())
    usersByEmail.set(user.email.toLowerCase(), {
      ...baseUser,
      ...user,
      permissions: user.permissions?.length
        ? user.permissions
        : getPermissionsForRole(user.role || baseUser?.role),
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

  if (user.status === 'Inactivo') {
    return { ok: false, error: 'El usuario está inactivo.' }
  }

  if ((user.password || TEMP_DEV_PASSWORD) !== normalizedPassword) {
    return { ok: false, error: 'Contraseña incorrecta.' }
  }

  return { ok: true, user: setCurrentUser(user) }
}

export const userHasPermission = (user, permission) => {
  if (!permission) return true
  if (!user) return false

  const permissions = user.permissions || []
  return permissions.includes('admin.all') || permissions.includes(permission)
}

export const getPermissionForPath = (pathname = '') => {
  const normalizedPath = pathname || '/'
  const route = ROUTE_PERMISSIONS.find(({ prefix }) => normalizedPath.startsWith(prefix))
  return route?.permission || null
}

export const canAccessPath = (user, pathname = '') =>
  userHasPermission(user, getPermissionForPath(pathname))

export const filterNavigationByPermissions = (items = [], hasPermission) =>
  items
    .map((item) => {
      const isErpItem =
        item.to?.startsWith('/erp') ||
        item.to?.startsWith('/cotizador-5000') ||
        item.to === '/dashboard'
      const isDemoItem = item.to && !isErpItem
      const isCoreUiExternal = item.href?.includes('coreui.io')
      const isStandaloneTitle = !item.to && !item.href && !item.items
      const permission =
        item.permission ||
        (item.to ? getPermissionForPath(item.to) : null) ||
        (isDemoItem || isCoreUiExternal || isStandaloneTitle ? 'admin.all' : null)

      if (permission && !hasPermission(permission)) {
        return null
      }

      if (!item.items) {
        return item
      }

      const filteredChildren = filterNavigationByPermissions(item.items, hasPermission)
      if (filteredChildren.length === 0) {
        return null
      }

      return { ...item, items: filteredChildren }
    })
    .filter(Boolean)
