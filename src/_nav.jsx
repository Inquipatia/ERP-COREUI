import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilCalculator,
  cilDescription,
  cilNotes,
  cilPuzzle,
  cilSpeedometer,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard ERP',
    to: '/erp/dashboard',
    permission: 'dashboard.view',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Asistente IA',
    to: '/erp/asistente',
    permission: 'ai.chat',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'ERP Rubik',
    to: '/erp',
    icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Usuarios',
        to: '/erp/usuarios',
        permission: 'users.view',
      },
      {
        component: CNavItem,
        name: 'Clientes',
        to: '/erp/clientes',
        permission: 'clients.view',
      },
      {
        component: CNavItem,
        name: 'Materiales',
        to: '/erp/materiales',
        permission: 'materials.view',
      },
      {
        component: CNavItem,
        name: 'Productos / Servicios',
        to: '/erp/productos-servicios',
        permission: 'products.view',
      },
      {
        component: CNavItem,
        name: 'Cotizaciones',
        to: '/erp/cotizaciones',
        permission: 'quotes.view',
      },
      {
        component: CNavItem,
        name: 'Documentos',
        to: '/erp/documentos',
        permission: 'documents.view',
      },
      {
        component: CNavItem,
        name: 'Licitaciones',
        to: '/erp/licitaciones',
        permission: 'tenders.view',
      },
      {
        component: CNavItem,
        name: 'Órdenes de trabajo',
        to: '/erp/ordenes-trabajo',
        permission: 'workorders.view',
      },
      {
        component: CNavItem,
        name: 'Configuración Rubik',
        to: '/erp/configuracion',
        permission: 'admin.all',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Cotizador 5000',
    icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Nueva cotización',
        to: '/cotizador-5000/nueva-cotizacion',
        permission: 'quotes.create',
      },
      {
        component: CNavItem,
        name: 'Centro de documentos',
        to: '/erp/documentos',
        permission: 'documents.view',
        icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
      },
    ],
  },
]

export default _nav