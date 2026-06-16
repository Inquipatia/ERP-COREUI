import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import { getAuthUsers, getDefaultRouteForUser } from '../../utils/authStorage'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, login } = useAuth()
  const users = useMemo(() => getAuthUsers().filter((user) => user.status !== 'Inactivo'), [])
  const [email, setEmail] = useState('rsepulveda@rubikcreaciones.cl')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')

  const requestedPath = location.state?.from?.pathname

  useEffect(() => {
    if (currentUser) {
      navigate(requestedPath || getDefaultRouteForUser(currentUser), { replace: true })
    }
  }, [currentUser, navigate, requestedPath])

  const handleSubmit = (event) => {
    event.preventDefault()

    const result = login({ email, password })

    if (!result.ok) {
      setError(result.error)
      return
    }

    setError('')
    navigate(requestedPath || getDefaultRouteForUser(result.user), { replace: true })
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={9} lg={8} xl={7}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <h1>ERP Rubik</h1>
                    <p className="text-body-secondary mb-4">
                      Acceso interno con roles, permisos y datos por perfil.
                    </p>

                    {error && <CAlert color="danger">{error}</CAlert>}

                    <CFormLabel htmlFor="loginUserSelect">Usuario de prueba</CFormLabel>
                    <CFormSelect
                      id="loginUserSelect"
                      className="mb-3"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    >
                      {users.map((user) => (
                        <option key={user.email} value={user.email}>
                          {user.name} · {user.role}
                        </option>
                      ))}
                    </CFormSelect>

                    <CFormLabel htmlFor="loginEmail">Email</CFormLabel>
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        id="loginEmail"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </CInputGroup>

                    <CFormLabel htmlFor="loginPassword">Contraseña</CFormLabel>
                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        id="loginPassword"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </CInputGroup>

                    <CButton color="primary" type="submit" className="w-100">
                      Iniciar sesión
                    </CButton>
                  </CForm>
                </CCardBody>
              </CCard>

              <CCard className="text-white bg-primary py-5 d-none d-md-flex" style={{ width: '44%' }}>
                <CCardBody className="text-center d-flex flex-column justify-content-center">
                  <h2>Rubik Creaciones</h2>
                  <p className="mb-3">
                    MVP local con usuarios reales, permisos por rol y navegación protegida.
                  </p>
                  <div className="d-flex justify-content-center gap-2 flex-wrap">
                    <CBadge color="light" textColor="dark">
                      Clave desarrollo: 123456
                    </CBadge>
                    <CBadge color="light" textColor="dark">
                      Sesión localStorage
                    </CBadge>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
