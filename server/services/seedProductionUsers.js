require('dotenv').config({ quiet: true })

const { getPrisma } = require('./prismaClient')

const INITIAL_USER_PASSWORD = process.env.INITIAL_USER_PASSWORD

if (!INITIAL_USER_PASSWORD) {
  console.error('INITIAL_USER_PASSWORD no existe. Aborto seed de usuarios de producción.')
  process.exitCode = 1
  return
}

const PERMISSIONS = [
  'admin.all',
  'dashboard.view',
  'clients.view',
  'clients.manage',
  'quotes.view',
  'quotes.create',
  'quotes.edit',
  'documents.view',
  'documents.manage',
  'tenders.view',
  'workorders.view',
  'workorders.create',
  'users.view',
  'users.manage',
  'finance.view',
  'finance.manage',
  'finance.payments',
  'suppliers.view',
  'suppliers.manage',
  'ai.chat',
]

const salesPermissions = [
  'dashboard.view',
  'clients.view',
  'clients.manage',
  'quotes.view',
  'quotes.create',
  'quotes.edit',
  'documents.view',
  'documents.manage',
  'tenders.view',
  'workorders.view',
  'workorders.create',
  'ai.chat',
]

const users = [
  {
    id: 'usr-rodrigo-sepulveda',
    name: 'Rodrigo Sepulveda',
    email: 'rsepulveda@rubikcreaciones.cl',
    role: 'Jefe de ventas',
    position: 'Jefe de ventas',
    area: 'Ventas',
    permissions: salesPermissions,
  },
  {
    id: 'usr-ramon-rojas',
    name: 'Ramon Rojas',
    email: 'r.rojas@rubikcreaciones.cl',
    role: 'Gerencia/Admin',
    position: 'Gerencia',
    area: 'Gerencia/Finanzas',
    permissions: PERMISSIONS,
  },
  {
    id: 'usr-erick-cabrera',
    name: 'Erick Cabrera',
    email: 'erick@rubikcreaciones.cl',
    role: 'Ejecutivo venta publica',
    position: 'Ejecutivo venta publica',
    area: 'Licitaciones',
    permissions: salesPermissions,
  },
  {
    id: 'usr-christian-guzman',
    name: 'Christian Guzman',
    email: 'c.guzman@rubikcreaciones.cl',
    role: 'Jefe venta privada',
    position: 'Jefe venta privada',
    area: 'Ventas/Finanzas',
    permissions: salesPermissions,
  },
  {
    id: 'usr-benjamin-rojas',
    name: 'Benjamin Rojas',
    email: 'brojas.romero@rubikcreaciones.cl',
    role: 'Gerencia/Admin',
    position: 'Gerencia',
    area: 'Gerencia',
    permissions: PERMISSIONS,
  },
  {
    id: 'usr-ivone-romero',
    name: 'Ivone Romero',
    email: 'contacto@rubikcreaciones.cl',
    role: 'Gerencia/Admin',
    position: 'Finanzas',
    area: 'Finanzas/Administracion',
    permissions: PERMISSIONS,
  },
]

const seedProductionUsers = async () => {
  const prisma = getPrisma()

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        ...user,
        password: INITIAL_USER_PASSWORD,
        status: 'Activo',
      },
      update: {
        name: user.name,
        role: user.role,
        position: user.position,
        area: user.area,
        permissions: user.permissions,
        password: INITIAL_USER_PASSWORD,
        status: 'Activo',
      },
    })

    console.log(`Usuario listo: ${user.email}`)
  }

  console.log('Seed de usuarios de producción finalizado.')
}

seedProductionUsers()
  .catch((error) => {
    console.error('Error ejecutando seed de usuarios de producción.')
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect()
    } catch (_error) {
      // El error principal ya fue informado.
    }
  })
