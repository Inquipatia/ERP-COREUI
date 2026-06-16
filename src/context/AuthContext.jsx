import React, { createContext, useContext, useMemo, useState } from 'react'
import {
  canAccessPath as canAccessAuthPath,
  clearCurrentUser,
  getCurrentUser,
  loginWithCredentials,
  userHasPermission,
} from '../utils/authStorage'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser())

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      login: ({ email, password }) => {
        const result = loginWithCredentials({ email, password })

        if (result.ok) {
          setCurrentUserState(result.user)
        }

        return result
      },
      logout: () => {
        clearCurrentUser()
        setCurrentUserState(null)
      },
      hasPermission: (permission) => userHasPermission(currentUser, permission),
      canAccessPath: (pathname) => canAccessAuthPath(currentUser, pathname),
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
