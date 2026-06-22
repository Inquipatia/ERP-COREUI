require('dotenv').config({ quiet: true })

const DATABASE_URL_ERROR =
  'DATABASE_URL no existe. Configura PostgreSQL en .env, por ejemplo: ' +
  'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rubik_erp?schema=public"'

const assertDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    const error = new Error(DATABASE_URL_ERROR)
    error.statusCode = 500
    throw error
  }
}

let PrismaClient
let prismaInstance

const loadPrismaClient = () => {
  if (PrismaClient) return PrismaClient

  try {
    ;({ PrismaClient } = require('@prisma/client'))
    return PrismaClient
  } catch (error) {
    const prismaError = new Error(
      'No se encontro @prisma/client generado. Ejecuta npm install y luego npm run db:generate.',
    )
    prismaError.cause = error
    throw prismaError
  }
}

const getPrisma = () => {
  assertDatabaseUrl()

  if (prismaInstance) return prismaInstance

  const Client = loadPrismaClient()
  const globalForPrisma = globalThis

  prismaInstance =
    globalForPrisma.rubikPrismaClient ||
    new Client({
      log:
        process.env.PRISMA_QUERY_LOG === 'true'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.rubikPrismaClient = prismaInstance
  }

  return prismaInstance
}

module.exports = {
  assertDatabaseUrl,
  getPrisma,
  get prisma() {
    return getPrisma()
  },
}
