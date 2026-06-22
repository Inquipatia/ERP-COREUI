const parsePermissionsHeader = (value) => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // Header can also be a comma separated list.
  }

  return String(value)
    .split(',')
    .map((permission) => permission.trim())
    .filter(Boolean)
}

const attachRequestUser = (request, _response, next) => {
  request.currentUser = {
    id: request.header('x-user-id') || '',
    name: request.header('x-user-name') || '',
    email: request.header('x-user-email') || '',
    role: request.header('x-user-role') || '',
    permissions: parsePermissionsHeader(request.header('x-user-permissions')),
  }

  next()
}

const hasPermission = (user, permission) => {
  if (!permission) return true
  const permissions = Array.isArray(user?.permissions) ? user.permissions : []

  return permissions.includes('admin.all') || permissions.includes(permission)
}

const requirePermission = (permission) => (request, response, next) => {
  if (process.env.API_AUTH_BYPASS === 'true') {
    next()
    return
  }

  if (hasPermission(request.currentUser, permission)) {
    next()
    return
  }

  response.status(403).json({
    error: 'No tienes permiso para consultar esta informacion.',
    permission,
  })
}

module.exports = {
  attachRequestUser,
  hasPermission,
  requirePermission,
}
