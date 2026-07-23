import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  canAccessPath as canAccessAuthPath,
  clearCurrentUser,
  getCurrentUser,
  getDefaultRouteForUser,
  setCurrentUser,
  userHasPermission,
} from '../utils/authStorage'
import {
  API_AUTH_EXPIRED_EVENT,
  clearApiSession,
  fetchApiCurrentUser,
  getStoredApiSession,
  isAuthSessionError,
  post as apiPost,
  setApiSession,
} from '../services/apiClient'

const AuthContext = createContext(null)

const normalizeEmail = (email = '') =>
  String(email || '')
    .trim()
    .toLowerCase()

const sessionBelongsToUser = (session, user) =>
  Boolean(
    session?.token &&
    session?.user?.email &&
    user?.email &&
    normalizeEmail(session.user.email) === normalizeEmail(user.email),
  )

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser())
  const [isAuthInitialized, setIsAuthInitialized] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let isMounted = true

    const finishInitialization = (nextUser, nextError = '') => {
      if (!isMounted) return
      setCurrentUserState(nextUser)
      setAuthError(nextError)
      setIsAuthInitialized(true)
    }

    const initializeAuth = async () => {
      const storedUser = getCurrentUser()
      const storedSession = getStoredApiSession()

      if (!storedUser) {
        clearApiSession()
        finishInitialization(null)
        return
      }

      if (!sessionBelongsToUser(storedSession, storedUser)) {
        clearCurrentUser()
        clearApiSession()
        finishInitialization(null, 'Sesion local incompleta. Inicia sesion nuevamente.')
        return
      }

      try {
        const apiUser = await fetchApiCurrentUser(storedSession)
        const sessionUser = setCurrentUser(apiUser || storedSession.user || storedUser)
        setApiSession({ ...storedSession, user: sessionUser })
        finishInitialization(sessionUser)
      } catch (error) {
        if (isAuthSessionError(error)) {
          clearCurrentUser()
          clearApiSession()
          finishInitialization(null, error.message)
          return
        }

        console.warn(
          'No se pudo validar la sesion API; se conserva la sesion local temporalmente.',
          error,
        )
        finishInitialization(storedUser)
      }
    }

    void initializeAuth()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const handleAuthExpired = (event) => {
      clearCurrentUser()
      clearApiSession()
      setCurrentUserState(null)
      setAuthError(event.detail?.message || 'Sesion API expirada. Inicia sesion nuevamente.')
      setIsAuthInitialized(true)
    }

    window.addEventListener(API_AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(API_AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      isAuthInitialized,
      authError,
      isAuthenticated: Boolean(currentUser),
      login: async ({ email, password }) => {
        try {
          const session = await apiPost('/auth/login', { email, password }, { auth: false })

          if (!session?.token || !session?.user) {
            throw new Error('La API no devolvio una sesion valida.')
          }

          const sessionUser = setCurrentUser(session.user)
          setApiSession({ ...session, user: sessionUser })
          setCurrentUserState(sessionUser)
          setAuthError('')
          setIsAuthInitialized(true)

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
        setAuthError('')
        setIsAuthInitialized(true)
      },
      hasPermission: (permission) => userHasPermission(currentUser, permission),
      canAccessPath: (pathname) => canAccessAuthPath(currentUser, pathname),
      getDefaultRoute: () => getDefaultRouteForUser(currentUser),
    }),
    [authError, currentUser, isAuthInitialized],
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
