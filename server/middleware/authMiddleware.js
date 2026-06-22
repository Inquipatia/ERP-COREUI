const dataAdapter = require('../services/dataAdapter')

const getBearerToken = (request) => {
  const authorization = request.header('authorization') || ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return ''
  return authorization.slice(7).trim()
}

const attachUser = (request, _response, next) => {
  const token = getBearerToken(request)
  request.authToken = token
  request.currentUser = token ? dataAdapter.getUserByToken(token) : null
  next()
}

const requireAuth = (request, response, next) => {
  if (request.currentUser) {
    next()
    return
  }

  response.status(401).json({ error: 'Sesion requerida.' })
}

const userHasPermission = (user, permission) => {
  if (!permission) return true
  const permissions = Array.isArray(user?.permissions) ? user.permissions : []
  return permissions.includes('admin.all') || permissions.includes(permission)
}

const requirePermission = (permission) => (request, response, next) => {
  if (userHasPermission(request.currentUser, permission)) {
    next()
    return
  }

  response.status(403).json({
    error: 'No tienes permiso para consultar esta informacion.',
    permission,
  })
}

module.exports = {
  attachUser,
  requireAuth,
  requirePermission,
  userHasPermission,
}
