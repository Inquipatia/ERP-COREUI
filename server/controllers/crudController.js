const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.floor(parsed)
}

const getPagination = (query = {}) => {
  const take = Math.min(toPositiveInt(query.take || query.limit, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
  const skip = toPositiveInt(query.skip || query.offset, 0)

  return { take, skip }
}

const parseJsonQuery = (value, fallback) => {
  if (!value) return fallback

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const getDelegate = (prisma, modelName) => {
  const delegate = prisma[modelName]
  if (!delegate) {
    throw new Error(`Modelo Prisma no configurado: ${modelName}`)
  }

  return delegate
}

const createCrudController = ({ prisma, modelName, defaultOrderBy = { updatedAt: 'desc' } }) => {
  const getModel = () => getDelegate(prisma, modelName)

  const list = async (request, response, next) => {
    try {
      const model = getModel()
      const { take, skip } = getPagination(request.query)
      const where = parseJsonQuery(request.query.where, {})
      const orderBy = parseJsonQuery(request.query.orderBy, defaultOrderBy)
      const include = parseJsonQuery(request.query.include, undefined)

      const [items, total] = await Promise.all([
        model.findMany({
          where,
          orderBy,
          take,
          skip,
          ...(include ? { include } : {}),
        }),
        model.count({ where }),
      ])

      response.json({ items, total, take, skip })
    } catch (error) {
      next(error)
    }
  }

  const getById = async (request, response, next) => {
    try {
      const item = await getModel().findUnique({ where: { id: request.params.id } })

      if (!item) {
        response.status(404).json({ error: 'Registro no encontrado.' })
        return
      }

      response.json(item)
    } catch (error) {
      next(error)
    }
  }

  const create = async (request, response, next) => {
    try {
      const item = await getModel().create({ data: request.body })
      response.status(201).json(item)
    } catch (error) {
      next(error)
    }
  }

  const update = async (request, response, next) => {
    try {
      const item = await getModel().update({
        where: { id: request.params.id },
        data: request.body,
      })
      response.json(item)
    } catch (error) {
      next(error)
    }
  }

  const remove = async (request, response, next) => {
    try {
      await getModel().delete({ where: { id: request.params.id } })
      response.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  return { list, getById, create, update, remove }
}

module.exports = { createCrudController }
