import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  canAccessPath as canAccessAuthPath,
  clearCurrentUser,
  getCurrentUser,
  getDefaultRouteForUser,
  setCurrentUser,
  userHasPermission,
} from '../utils/authStorage'
import { API_AUTH_EXPIRED_EVENT, clearApiSession, post as apiPost, setApiSession } from '../services/apiClient'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser())

  useEffect(() => {
    const handleAuthExpired = () => {
      clearCurrentUser()
      clearApiSession()
      setCurrentUserState(null)
    }

    window.addEventListener(API_AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(API_AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      login: async ({ email, password }) => {
        try {
          const session = await apiPost('/auth/login', { email, password }, { auth: false })
          const sessionUser = setCurrentUser(session.user)
          setApiSession(session)
          setCurrentUserState(sessionUser)

          return { ok: true, user: sessionUser }
        } catch (error) {
          return {
            ok: false,
            error: error.message || 'No se pudo iniciar sesión.',
          }
        }
      },
      logout: () => {
        clearCurrentUser()
        clearApiSession()
        setCurrentUserState(null)
      },
      hasPermission: (permission) => userHasPermission(currentUser, permission),
      canAccessPath: (pathname) => canAccessAuthPath(currentUser, pathname),
      getDefaultRoute: () => getDefaultRouteForUser(currentUser),
    }),
    [currentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }

  return context
}
