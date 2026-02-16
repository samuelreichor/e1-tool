import { eq, desc } from 'drizzle-orm'
import { invoices, clients } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const query = getQuery(event)
  const status = query.status as string | undefined

  const qb = db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      netTotal: invoices.netTotal,
      grossTotal: invoices.grossTotal,
      clientName: clients.name,
      clientId: invoices.clientId
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))

  if (status) {
    qb.where(eq(invoices.status, status))
  }

  return await qb.orderBy(desc(invoices.createdAt))
})
