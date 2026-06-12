// Future: users, roles, positions and permissions should come from backend auth/users tables.
export const erpRoles = ['Administrador', 'Ventas', 'Producción', 'Finanzas', 'Diseño']

export const mockUsers = [
  {
    id: 'usr-rodrigo-sepulveda',
    name: 'Rodrigo Sepulveda',
    email: 'rsepulveda@rubikcreaciones.cl',
    role: 'Administrador',
    status: 'Activo',
    position: 'Gerente comercial',
    area: 'Ventas',
  },
  {
    id: 'usr-erick-cabrera',
    name: 'Erick Cabrera',
    email: 'erick@rubikcreaciones.cl',
    role: 'Ventas',
    status: 'Activo',
    position: 'Ejecutivo comercial',
    area: 'Ventas',
  },
  {
    id: 'usr-ramon-rojas',
    name: 'Ramon Rojas',
    email: 'r.rojas@rubikcreaciones.cl',
    role: 'Producción',
    status: 'Activo',
    position: 'Coordinador de producción',
    area: 'Producción',
  },
  {
    id: 'usr-christian-guzman',
    name: 'Christian Guzman',
    email: 'c.guzman@rubikcreaciones.cl',
    role: 'Diseño',
    status: 'Activo',
    position: 'Diseñador gráfico',
    area: 'Diseño',
  },
]
