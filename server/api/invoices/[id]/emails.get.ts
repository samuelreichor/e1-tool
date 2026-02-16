import { eq, desc } from 'drizzle-orm'
import { emailLogs } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))

  return db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.invoiceId, id))
    .orderBy(desc(emailLogs.sentAt))
})
