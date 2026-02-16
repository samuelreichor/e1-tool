import { ilike, or } from 'drizzle-orm'
import { clients } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const query = getQuery(event)
  const search = query.search as string | undefined

  const qb = db.select().from(clients)

  if (search) {
    const pattern = `%${search}%`
    qb.where(or(
      ilike(clients.name, pattern),
      ilike(clients.email, pattern)
    ))
  }

  return await qb.orderBy(clients.name)
})
