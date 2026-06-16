import React, { useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CBadge,
  CContainer,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavItem,
  CNavLink,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilContrast,
  cilEnvelopeOpen,
  cilList,
  cilMenu,
  cilMoon,
  cilSun,
} from '@coreui/icons'

import { AppBreadcrumb } from './index'
import { useAuth } from '../context/AuthContext'

const AppHeader = () => {
  const headerRef = useRef()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const navigate = useNavigate()
  const { currentUser, logout, hasPermission } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }

    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>

        <CHeaderNav className="d-none d-md-flex">
          {hasPermission('dashboard.view') && (
            <CNavItem>
              <CNavLink to="/erp/dashboard" as={NavLink}>
                Dashboard ERP
              </CNavLink>
            </CNavItem>
          )}
          {hasPermission('ai.chat') && (
            <CNavItem>
              <CNavLink to="/erp/asistente" as={NavLink}>
                Asistente IA
              </CNavLink>
            </CNavItem>
          )}
          {hasPermission('quotes.create') && (
            <CNavItem>
              <CNavLink to="/cotizador-5000/nueva-cotizacion" as={NavLink}>
                Cotizador 5000
              </CNavLink>
            </CNavItem>
          )}
          {hasPermission('documents.view') && (
            <CNavItem>
              <CNavLink to="/erp/documentos" as={NavLink}>
                Documentos
              </CNavLink>
            </CNavItem>
          )}
        </CHeaderNav>

        <CHeaderNav className="ms-auto">
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilBell} size="lg" />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilList} size="lg" />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilEnvelopeOpen} size="lg" />
            </CNavLink>
          </CNavItem>
        </CHeaderNav>

        <CHeaderNav>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>

          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>
              {colorMode === 'dark' ? (
                <CIcon icon={cilMoon} size="lg" />
              ) : colorMode === 'auto' ? (
                <CIcon icon={cilContrast} size="lg" />
              ) : (
                <CIcon icon={cilSun} size="lg" />
              )}
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem
                active={colorMode === 'light'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('light')}
              >
                <CIcon className="me-2" icon={cilSun} size="lg" /> Light
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'dark'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('dark')}
              >
                <CIcon className="me-2" icon={cilMoon} size="lg" /> Dark
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'auto'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('auto')}
              >
                <CIcon className="me-2" icon={cilContrast} size="lg" /> Auto
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>

          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>

          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret className="d-flex align-items-center gap-2">
              <span className="fw-semibold">{currentUser?.name || 'Usuario'}</span>
            </CDropdownToggle>
            <CDropdownMenu className="pt-0" style={{ minWidth: '300px' }}>
              <div className="px-3 py-3 border-bottom">
                <div className="fw-semibold">{currentUser?.name || 'Usuario'}</div>
                <div className="small text-body-secondary">{currentUser?.email || '-'}</div>
                <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                  <CBadge color="primary">{currentUser?.role || 'Sin rol'}</CBadge>
                  <CBadge color="secondary">{currentUser?.area || 'Sin área'}</CBadge>
                </div>
              </div>
              {hasPermission('ai.chat') && (
                <CDropdownItem as={NavLink} to="/erp/asistente">
                  Abrir Asistente IA
                </CDropdownItem>
              )}
              {hasPermission('users.view') && (
                <CDropdownItem as={NavLink} to="/erp/usuarios">
                  Usuarios y perfiles
                </CDropdownItem>
              )}
              <CDropdownDivider />
              <CDropdownItem as="button" type="button" onClick={handleLogout}>
                Cerrar sesión
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
        </CHeaderNav>
      </CContainer>

      <CContainer className="px-4" fluid>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
