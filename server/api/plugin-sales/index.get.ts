import { eq, desc } from 'drizzle-orm'
import { pluginSales } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const query = getQuery(event)
  const type = query.type as string | undefined

  const qb = db
    .select()
    .from(pluginSales)
    .$dynamic()

  if (type === 'license') {
    qb.where(eq(pluginSales.renewal, 0))
  } else if (type === 'renewal') {
    qb.where(eq(pluginSales.renewal, 1))
  }

  return await qb.orderBy(desc(pluginSales.dateSold))
})
