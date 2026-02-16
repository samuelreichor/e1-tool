import { eq, desc, and, gte, lt } from 'drizzle-orm'
import { receipts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  const startDate = `${year}-01-01`
  const endDate = `${year + 1}-01-01`

  return await db
    .select()
    .from(receipts)
    .where(and(
      gte(receipts.bookingDate, startDate),
      lt(receipts.bookingDate, endDate)
    ))
    .orderBy(desc(receipts.bookingDate))
})
