import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CSpinner } from '@coreui/react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { useAuth } from '../context/AuthContext'
import ApiFallbackAlert from '../components/ApiFallbackAlert'
import AssistantFloatingChat from '../components/AssistantFloatingChat'

const DefaultLayout = () => {
  const location = useLocation()
  const { currentUser, canAccessPath, isAuthInitialized } = useAuth()

  if (!isAuthInitialized) {
    return (
      <div className="pt-3 text-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!canAccessPath(location.pathname)) {
    return <Navigate to="/no-permission" replace state={{ from: location }} />
  }

  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <ApiFallbackAlert />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
        <AppFooter />
        <AssistantFloatingChat />
      </div>
    </div>
  )
}

export default DefaultLayout
