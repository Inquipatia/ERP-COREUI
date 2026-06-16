import React, { Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CAlert, CContainer, CSpinner } from '@coreui/react'

import { routes } from '../routes'
import { useAuth } from '../context/AuthContext'

const Loading = () => (
  <div className="pt-3 text-center">
    <CSpinner color="primary" variant="grow" />
  </div>
)

const normalizeRoutePath = (path = '') => {
  if (!path || path === '/') return ''
  return String(path).replace(/^\/+/, '')
}

const ProtectedRoute = ({ route }) => {
  const location = useLocation()
  const { currentUser, canAccessPath } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!canAccessPath(location.pathname)) {
    return <Navigate to="/no-permission" replace state={{ from: location }} />
  }

  const Component = route.element

  if (!Component) {
    return (
      <CAlert color="warning">
        La ruta <strong>{route.path}</strong> existe, pero no tiene componente asignado.
      </CAlert>
    )
  }

  return <Component />
}

const RouteNotFound = () => {
  const location = useLocation()

  return (
    <CAlert color="warning">
      No se encontró una vista asociada a la ruta actual:{' '}
      <strong>{location.pathname}</strong>.
      <br />
      Revisa que esta ruta exista en <code>src/routes.js</code>.
    </CAlert>
  )
}

const AppContent = () => {
  const usableRoutes = routes.filter((route) => route.element)

  return (
    <CContainer lg className="px-4">
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<Navigate to="/erp/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/erp/dashboard" replace />} />

          {usableRoutes.map((route, index) => {
            const relativePath = normalizeRoutePath(route.path)

            return (
              <Route
                key={`${route.path}-${index}`}
                path={relativePath}
                element={<ProtectedRoute route={route} />}
              />
            )
          })}

          <Route path="*" element={<RouteNotFound />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)