require('dotenv').config({ quiet: true })

const fs = require('node:fs')
const path = require('node:path')
const postgresDataAdapter = require('./postgresDataAdapter')
const { assertDatabaseUrl, getPrisma } = require('./prismaClient')

const DB_FILE = path.join(__dirname, '..', 'data', 'rubik-db.json')

const readJsonDatabase = () => {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`No existe ${DB_FILE}. Inicia la API JSON o crea el respaldo antes de migrar.`)
  }

  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
}

const collections = [
  ['users', 'Usuarios'],
  ['clients', 'Clientes'],
  ['quotes', 'Cotizaciones'],
  ['documents', 'Documentos'],
  ['tenders', 'Licitaciones'],
  ['workOrders', 'Ordenes de trabajo'],
  ['suppliers', 'Proveedores'],
  ['financeMovements', 'Movimientos financieros'],
]

const createMigrationAuditLog = async (summary) => {
  const prisma = getPrisma()

  await prisma.auditLog.create({
    data: {
      id: `audit-json-migration-${Date.now()}`,
      module: 'migration',
      action: 'json-to-postgres',
      userEmail: 'system@rubikcreaciones.local',
      details: summary,
    },
  })
}

const migrate = async () => {
  assertDatabaseUrl()

  const database = readJsonDatabase()
  const summary = {}

  for (const [key, label] of collections) {
    const items = Array.isArray(database[key]) ? database[key] : []
    const result = await postgresDataAdapter.upsertMany(key, items)
    summary[key] = { label, total: items.length, ...result }
    console.log(`${label}: ${items.length} leidos, ${result.inserted} insertados, ${result.updated} actualizados`)
  }

  await createMigrationAuditLog(summary)
  console.log('Migracion JSON -> PostgreSQL finalizada sin duplicar registros por id.')
  console.log(JSON.stringify(summary, null, 2))
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error('Error migrando JSON a PostgreSQL:')
      console.error(error.message)
      process.exitCode = 1
    })
    .finally(async () => {
      try {
        await getPrisma().$disconnect()
      } catch (_error) {
        // DATABASE_URL puede faltar; el error principal ya fue mostrado arriba.
      }
    })
}

module.exports = {
  migrate,
}
